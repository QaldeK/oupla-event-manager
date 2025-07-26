// src/lib/shared/notificationSystem.svelte.ts
import { globalLogsStore } from "$lib/shared/globalLogsStore.svelte";
import { globalMessagesStore } from "$lib/shared/globalMessagesStore.svelte";
import { userDb } from "$lib/shared/userDb.svelte";
import { getSpace } from "$lib/shared/spaceOptions.svelte";
import { eventsStore } from "$lib/shared/eventsStore.svelte";
import type { LogsResponse, MessagesResponse } from "$lib/types/pocketbase";
import { SvelteDate, SvelteMap } from "svelte/reactivity";

/**
 * Système de notification unifié basé sur les nouveaux stores
 * Remplace l'ancien notificationsAndLogs.ts
 */
class NotificationSystem {
	private _lastReadTime = $state<SvelteDate | null>(null);
	private _isInitialized = $state(false);

	/**
	 * Combine tous les logs et messages pertinents pour l'utilisateur.
	 * C'est la source de vérité pour le comptage des non-lus et l'affichage.
	 * Cette propriété est réactive grâce à `$derived` et se mettra à jour
	 * automatiquement lorsque `globalLogsStore` ou `globalMessagesStore` changent.
	 * @private
	 */
	private _allNotifications = $derived(
		this._isInitialized ? [...globalLogsStore.myLogs, ...globalMessagesStore.messages] : []
	);

	/**
	 * Activité récente combinée (logs + messages) pour affichage.
	 * Cette propriété est dérivée de `_allNotifications` et est donc réactive.
	 */
	get recentActivity(): (LogsResponse | MessagesResponse)[] {
		return this._allNotifications
			.slice()
			.sort((a, b) => new SvelteDate(b.created).getTime() - new SvelteDate(a.created).getTime())
			.slice(0, 20);
	}

	/**
	 * Logs récents triés par date
	 */
	getLogs(limit: number = 10): LogsResponse[] {
		return globalLogsStore.myLogs
			.slice()
			.sort((a, b) => new SvelteDate(b.created).getTime() - new SvelteDate(a.created).getTime())
			.slice(0, limit);
	}

	/**
	 * Messages récents triés par date
	 */
	getMessages(limit: number = 10): MessagesResponse[] {
		return globalMessagesStore.messages
			.slice()
			.sort((a, b) => new SvelteDate(b.created).getTime() - new SvelteDate(a.created).getTime())
			.slice(0, limit);
	}

	/**
	 * Messages regroupés par événement
	 */
	getGroupedMessages(): Array<{
		id: string;
		type: "grouped_messages";
		eventId: string;
		eventTitle: string;
		count: number;
		created: string;
		latestMessage: MessagesResponse;
		isUnread: boolean;
	}> {
		const messages = globalMessagesStore.messages;
		const messagesByEvent = new SvelteMap<string, MessagesResponse[]>();

		// Regrouper par événement
		messages.forEach((msg) => {
			const eventId = msg.event;
			if (!eventId) return;

			if (!messagesByEvent.has(eventId)) {
				messagesByEvent.set(eventId, []);
			}
			messagesByEvent.get(eventId)!.push(msg);
		});

		// Créer les groupes
		return Array.from(messagesByEvent.entries())
			.map(([eventId, msgs]) => {
				const sortedMsgs = msgs.sort(
					(a, b) => new SvelteDate(b.created).getTime() - new SvelteDate(a.created).getTime()
				);
				const latestMessage = sortedMsgs[0];
				const eventTitle =
					(latestMessage.expand as any)?.event?.event_title ||
					eventsStore.getEventById(eventId)?.event_title ||
					"un événement";

				return {
					id: `grouped_${eventId}_${latestMessage.created}`,
					type: "grouped_messages" as const,
					eventId,
					eventTitle,
					count: msgs.length,
					created: latestMessage.created,
					latestMessage,
					isUnread: msgs.some((m) => this.isUnread(m))
				};
			})
			.sort((a, b) => new SvelteDate(b.created).getTime() - new SvelteDate(a.created).getTime());
	}

	/**
	 * Activité combinée avec messages regroupés
	 */
	getGroupedActivity(limit: number = 20): Array<
		| LogsResponse
		| {
				id: string;
				type: "grouped_messages";
				eventId: string;
				eventTitle: string;
				count: number;
				created: string;
				latestMessage: MessagesResponse;
				isUnread: boolean;
		  }
	> {
		const logs = this.getLogs(50);
		const groupedMessages = this.getGroupedMessages();

		return [...logs, ...groupedMessages]
			.sort((a, b) => new SvelteDate(b.created).getTime() - new SvelteDate(a.created).getTime())
			.slice(0, limit);
	}

	/**
	 * Nombre total d'éléments non lus, basé sur la date de dernière lecture.
	 * Cette propriété est dérivée de `_allNotifications` et est donc réactive.
	 */
	unreadCount = $derived(this._allNotifications.filter((item) => this.isUnread(item)).length);

	/**
	 * État d'initialisation
	 */
	get isInitialized(): boolean {
		return (
			this._isInitialized && globalLogsStore.isInitialized && globalMessagesStore.isInitialized
		);
	}

	/**
	 * État de chargement
	 */
	get isLoading(): boolean {
		return globalLogsStore.isLoading || globalMessagesStore.isLoading;
	}

	/**
	 * Erreur éventuelle
	 */
	get error(): string | null {
		return globalLogsStore.error || globalMessagesStore.error;
	}

	/**
	 * Initialise le système de notification
	 */
	async init(): Promise<void> {
		if (this._isInitialized) return;

		try {
			// S'assurer que les stores sous-jacents sont initialisés
			// Ils gèrent leurs propres abonnements temps réel
			await globalLogsStore.init();
			await globalMessagesStore.init();

			// Charger la dernière date de lecture depuis le localStorage
			this._loadLastReadTime();

			this._isInitialized = true;
			console.log("[NotificationSystem] Initialized successfully");
		} catch (error) {
			console.error("[NotificationSystem] Failed to initialize:", error);
			throw error;
		}
	}

	/**
	 * Marque toutes les notifications comme lues en enregistrant l'heure actuelle.
	 */
	markAsRead(): void {
		this._lastReadTime = new SvelteDate();
		this._saveLastReadTime();
		console.log("[NotificationSystem] Notifications marked as read");
	}

	/**
	 * Recharge les données de notification
	 */
	async refresh(): Promise<void> {
		try {
			// Force une resynchronisation des stores sous-jacents
			await globalMessagesStore.forceRefresh();
			console.log("[NotificationSystem] Data refreshed");
		} catch (error) {
			console.error("[NotificationSystem] Failed to refresh:", error);
		}
	}

	/**
	 * Nettoie le système
	 */
	reset(): void {
		this._lastReadTime = null;
		this._isInitialized = false;
		this._clearLastReadTime();
		console.log("[NotificationSystem] Reset completed");
	}

	/**
	 * Génère un message de notification formaté pour un log
	 */
	generateLogMessage(log: LogsResponse): string {
		// Utiliser le message pré-formaté des détails si disponible
		if (log.details && typeof log.details === "object" && "message" in log.details) {
			return log.details.message as string;
		}

		// Fallback avec messages génériques basés sur l'action
		const actorName = (log.expand as any)?.user_actor_id?.username || "Un utilisateur";
		const eventTitle =
			log.details && typeof log.details === "object" && "event_title" in log.details
				? (log.details.event_title as string)
				: "un événement";

		switch (log.action) {
			case "create_event":
				return `${actorName} a créé l'événement "${eventTitle}"`;
			case "event_confirmed":
				return `L'événement "${eventTitle}" a été confirmé`;
			case "sondage_proposed":
				return `Nouvelles dates proposées pour "${eventTitle}"`;
			case "sondage_opened":
				return `Sondage ouvert pour "${eventTitle}"`;
			case "sondage_closed":
				return `Sondage fermé pour "${eventTitle}"`;
			case "organizers_changed":
				return `Organisateurs modifiés pour "${eventTitle}"`;
			case "event_canceled":
				return `L'événement "${eventTitle}" a été annulé`;
			case "event_date_changed":
				return `La date de "${eventTitle}" a été modifiée`;
			case "delete_event":
				return `L'événement "${eventTitle}" a été supprimé`;
			case "create_pad": {
				const padTitle =
					log.details && typeof log.details === "object" && "pad_title" in log.details
						? (log.details.pad_title as string)
						: "un pad";
				return `${actorName} a créé le pad "${padTitle}"`;
			}
			case "update_pad": {
				const updatedPadTitle =
					log.details && typeof log.details === "object" && "pad_title" in log.details
						? (log.details.pad_title as string)
						: "un pad";
				return `${actorName} a modifié le pad "${updatedPadTitle}"`;
			}
			default:
				return `${actorName} a effectué une action: ${log.action}`;
		}
	}

	/**
	 * Génère un message de notification pour un message
	 */
	generateMessageNotification(message: MessagesResponse): string {
		// D'abord essayer les données expandées
		const expand = message.expand as {
			user?: { username?: string };
			event?: { event_title?: string };
		};

		let authorName = expand?.user?.username;
		let eventTitle = expand?.event?.event_title;

		// Si les données expandées ne sont pas disponibles, utiliser les stores locaux
		if (!authorName || !eventTitle) {
			// Chercher dans les stores locaux uniquement si nécessaire
			if (!authorName) {
				const member = getSpace.members?.find((m) => m.id === message.user);
				authorName = member?.username;
			}

			if (!eventTitle) {
				const event = eventsStore.getEventById(message.event);
				eventTitle = event?.event_title;
			}
		}

		// Fallback final pour authorName
		authorName = authorName || "Un utilisateur";

		if (eventTitle) {
			return `${authorName} a écrit dans "${eventTitle}"`;
		} else {
			return `${authorName} a écrit un message`;
		}
	}
	/**
	 * Formate le temps relatif d'une notification
	 */
	formatRelativeTime(dateString: string): string {
		const date = new SvelteDate(dateString);
		const now = new SvelteDate();
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diffInSeconds < 60) {
			return "À l'instant";
		} else if (diffInSeconds < 3600) {
			const minutes = Math.floor(diffInSeconds / 60);
			return `Il y a ${minutes} minute${minutes > 1 ? "s" : ""}`;
		} else if (diffInSeconds < 86400) {
			const hours = Math.floor(diffInSeconds / 3600);
			return `Il y a ${hours} heure${hours > 1 ? "s" : ""}`;
		} else if (diffInSeconds < 604800) {
			const days = Math.floor(diffInSeconds / 86400);
			return `Il y a ${days} jour${days > 1 ? "s" : ""}`;
		} else {
			return date.toLocaleDateString("fr-FR", {
				day: "numeric",
				month: "short"
			});
		}
	}

	/**
	 * Vérifie si un élément est considéré comme "nouveau" (non lu)
	 */
	isUnread(item: LogsResponse | MessagesResponse): boolean {
		if (!this._lastReadTime) return true; // Si jamais lu, tout est non lu

		const itemDate = new SvelteDate(item.created);
		return itemDate > this._lastReadTime;
	}

	/**
	 * Obtient les notifications pour un espace spécifique
	 */
	getNotificationsForSpace(spaceId: string): {
		logs: LogsResponse[];
		messages: MessagesResponse[];
		count: number;
	} {
		const spaceLogs = globalLogsStore.getMyLogsBySpace(spaceId);
		const spaceMessages = globalMessagesStore.getMessagesForSpace(spaceId);

		return {
			logs: spaceLogs,
			messages: spaceMessages,
			count: spaceLogs.length + spaceMessages.length
		};
	}

	// Méthodes privées

	private _getStorageKey(): string {
		return `notification_last_read_${userDb.id}`;
	}

	private _loadLastReadTime(): void {
		if (typeof window === "undefined") return;

		try {
			const stored = localStorage.getItem(this._getStorageKey());
			if (stored) {
				this._lastReadTime = new SvelteDate(stored);
			}
		} catch (error) {
			console.warn("[NotificationSystem] Failed to load last read time:", error);
		}
	}

	private _saveLastReadTime(): void {
		if (typeof window === "undefined" || !this._lastReadTime) return;

		try {
			localStorage.setItem(this._getStorageKey(), this._lastReadTime.toISOString());
		} catch (error) {
			console.warn("[NotificationSystem] Failed to save last read time:", error);
		}
	}

	private _clearLastReadTime(): void {
		if (typeof window === "undefined") return;

		try {
			localStorage.removeItem(this._getStorageKey());
		} catch (error) {
			console.warn("[NotificationSystem] Failed to clear last read time:", error);
		}
	}
}

// Export du singleton
export const notificationSystem = new NotificationSystem();

// Fonctions utilitaires pour la compatibilité avec l'ancien système
export const markNotificationsAsRead = () => notificationSystem.markAsRead();
export const generateNotificationMessage = (log: LogsResponse) =>
	notificationSystem.generateLogMessage(log);
