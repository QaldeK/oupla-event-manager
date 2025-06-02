import { pb } from "$lib/pocketbase.svelte";
import { userDb, eventsStore } from "$lib/shared";
import { Collections } from "$lib/types/pocketbase";
import { notificationState, type NotificationLogRecord } from "$lib/shared/states.svelte";

// Fonction pour générer le filtre de base pour les notifications
function createNotificationFilter(spaceId: string): string {
	if (!userDb.current?.id) return "";

	let filter = `space = "${spaceId}" && user_actor_id != "${userDb.current.id}"`;

	// Filtrer selon le rôle de l'utilisateur
	if (userDb.currentRole !== "admin") {
		filter += ` && (action = "create_event" || users_concerned ~ "${userDb.current.id}")`;
	}

	return filter;
}

// Fonction pour charger les notifications
export async function loadNotifications(spaceId: string) {
	if (!spaceId || !userDb.current?.id) return;

	try {
		// Récupérer la date de dernière synchronisation depuis localStorage
		const lastSyncKey = `notification_lastSync_${spaceId}_${userDb.current.id}`;
		const lastSync = localStorage.getItem(lastSyncKey);
		// console.log("[DEBUG] Dernière synchronisation:", lastSync);
		let filter = createNotificationFilter(spaceId);

		if (lastSync) {
			// Récupérer seulement les nouveaux logs depuis la dernière sync
			// Convertir le format ISO vers le format PocketBase (remplacer T par espace)
			const formattedLastSync = lastSync.replace("T", " ");
			filter += ` && created >= "${formattedLastSync}"`;
		} else {
			// Premier chargement : récupérer les logs du dernier mois
			const oneMonthAgo = new Date();
			oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
			// Convertir le format ISO vers le format PocketBase (remplacer T par espace)
			const formattedDate = oneMonthAgo.toISOString().replace("T", " ");
			filter += ` && created >= "${formattedDate}"`;
		}

		console.log("[DEBUG] Filtre de notifications:", filter);

		// Récupérer les logs
		const result = await pb.collection(Collections.Logs).getList(1, 100, {
			filter: filter,
			fields: "*, expand.user_actor_id.username, expand.user_actor_id.id",
			expand: "user_actor_id",
			sort: "-created"
		});

		console.log("[DEBUG] Chargement des notifications:", result);

		// Ajouter les nouveaux logs (éviter les doublons)
		const existingIds = new Set(notificationState.logs.map((log) => log.id));
		const newLogs = result.items.filter(
			(log) => !existingIds.has(log.id)
		) as NotificationLogRecord[];

		notificationState.logs = [...newLogs, ...notificationState.logs]
			.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
			.slice(0, 50); // Garder max 50 notifications

		// Mettre à jour le nombre de non-lues
		if (lastSync) {
			notificationState.unreadCount += newLogs.length;
		}

		// Sauvegarder la nouvelle date de sync
		localStorage.setItem(lastSyncKey, new Date().toISOString());

		// Initialiser la subscription si pas encore fait
		if (!notificationState.subscription) {
			initNotificationSubscription(spaceId);
		}

		notificationState.isInitialized = true;
	} catch (error) {
		console.error("Erreur lors du chargement des notifications:", error);
	}
}

// Fonction pour initialiser la subscription temps réel
function initNotificationSubscription(spaceId: string) {
	const filter = createNotificationFilter(spaceId);

	pb.collection(Collections.Logs)
		.subscribe(
			"*",
			(data) => {
				if (data.action === "create") {
					const newLog = data.record as NotificationLogRecord;

					// 👉 Double vérification côté client (sécurité)
					if (newLog.user_actor_id === userDb.current?.id) return;

					// Ajouter le nouveau log en tête
					notificationState.logs = [newLog, ...notificationState.logs].slice(0, 50);
					notificationState.unreadCount++;
				}
			},
			{
				filter,
				expand: "user_actor_id.id"
			}
		)
		.then((unsubscribe) => {
			notificationState.subscription = unsubscribe;
		});
}

// Fonction pour générer le message d'une notification
export function generateNotificationMessage(log: NotificationLogRecord): string {
	// Si details.message existe, l'utiliser
	if (log.details && typeof log.details === "object" && "message" in log.details) {
		return (log.details as { message: string }).message;
	}

	const actorUsername = log.expand?.user_actor_id?.username || "Un utilisateur";
	const action = log.action;
	let targetName = "";
	let targetDate = "";

	// Récupérer les infos de l'événement si applicable
	if (log.collection_target === "events" && log.record_target_id) {
		const event = eventsStore.getEventById(log.record_target_id);
		targetName = event?.event_title || "un événement";
		targetDate = event?.date_event ? new Date(event.date_event).toLocaleDateString() : "";
	}

	// Générer le message selon l'action
	switch (action) {
		case "create_event":
			// Vérifier si l'utilisateur actuel est organisateur
			if (log.collection_target === "events" && log.record_target_id) {
				const event = eventsStore.getEventById(log.record_target_id);
				const organizers = Array.isArray(event?.organizers) ? event.organizers : [];
				const isOrganizer = organizers.some((org: { id: string }) => org.id === userDb.current?.id);

				if (isOrganizer) {
					return `Vous êtes inscrit·e en tant qu'organisateur·trice à l'événement "${targetName}"${targetDate ? ` du ${targetDate}` : ""}`;
				} else {
					return `${actorUsername} a créé l'événement "${targetName}"${targetDate ? ` du ${targetDate}` : ""}`;
				}
			}
			return `${actorUsername} a créé ${targetName}`;
		case "event_confirmed":
			return `L'événement "${targetName}" a été confirmé pour le ${targetDate}`;
		case "event_canceled":
			return `L'événement "${targetName}" a été annulé (${targetDate})`;
		case "organizers_changed":
			return `${actorUsername} a modifié les organisateurs de "${targetName}"`;
		case "sondage_proposed":
			return `${actorUsername} a participé au sondage de "${targetName}"`;
		case "delete_event":
			return `L'événement "${targetName}" a été supprimé`;
		default:
			return `${actorUsername} a effectué une action (${action}) sur ${targetName}`;
	}
}

// Fonction pour marquer les notifications comme lues
export function markNotificationsAsRead() {
	notificationState.unreadCount = 0;
}

// Fonction pour nettoyer les notifications
export function clearNotifications() {
	notificationState.logs = [];
	notificationState.unreadCount = 0;
	notificationState.isInitialized = false;

	if (notificationState.subscription) {
		notificationState.subscription();
		notificationState.subscription = null;
	}
}
