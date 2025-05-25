import type { EventType, OrganizerType } from "$lib/schemas/event.schema";
import { SyncStore } from "$lib/shared/syncState.svelte";
import { Collections } from "$lib/types/pocketbase";
import type { EventsRecord, UsersResponse } from "$lib/types/pocketbase.ts";
import type { StoreConfig } from "$lib/types/syncState.types";
import {
	buildEventTimeInfoMap,
	type EventTimeInfo // Importe le type si besoin
} from "$lib/utils/eventConflicts";
import { format, parse } from "date-fns";

import { updateEvent } from "$lib/pocketbase.svelte";
import type { UserType } from "$lib/types/types";

import { modalState, openTaskModal, showAlert } from "$lib/shared/states.svelte";
import { userDb } from "./userDb.svelte";

// Ajouter ces types au début du fichier
export interface EventConflict {
	id: string;
	event_title: string;
	time_start: string;
	time_end: string;
	rooms: string[];
	conflictType: "confirmed" | "unconfirmed" | "sondage" | "close-confirmed" | "close-unconfirmed";
	hasSameRoom: boolean;
	date_event: string;
	isConfirmed: boolean;
	organizers: OrganizerType[];
	sourceEventId?: string; // Propriété temporaire pour la déduplication
}

type ConflictType = "confirmed" | "unconfirmed" | "sondage";

export interface EventConflictInfo {
	id: string;
	event_title: string;
	organizers: OrganizerType[];
	rooms: string[];
	conflictType: ConflictType;
	date_event?: string;
	dateStart?: string;
	dateEnd?: string;
	time_start: string;
	time_end: string;
}

export interface ConflictMap {
	confirmed: EventConflict[];
	unconfirmed: EventConflict[];
	sondage: EventConflict[];
	"close-confirmed": EventConflict[];
	"close-unconfirmed": EventConflict[];
}

// Type helper qui combine EventsRecord et StoreRecord
export type SyncEventRecord = EventsRecord & {
	id: string;
	created: string;
	updated: string;
	collectionId: string;
	collectionName: Collections;
	expand?: {
		created_by?: UsersResponse;
	};
};

const userId = $derived(userDb?.current?.id);

class EventsStore {
	#store = $state({
		syncStore: null as SyncStore<SyncEventRecord> | null,
		isInitialized: false,
		error: null as Error | null,
		initPromise: null as Promise<void> | null,
		mode: null as "internal" | "external" | null
	});

	async init({ spaceId, mode }: StoreConfig) {
		if (this.#store.initPromise) return this.#store.initPromise;

		this.#store.initPromise = (async () => {
			const dbName = "eventsStore"; //= mode === 'external' ? 'events-public' : 'events-dashboard';

			const filter = `space = '${spaceId}' && (date_event = "" || date_event >= '${new Date().toISOString().split("T")[0]}')`;

			const syncStore = new SyncStore<SyncEventRecord>({
				name: "eventsStore",
				version: 1,
				dbName,
				sync: {
					mode: "realtime",
					filter,
					sort: "date_event",
					expand: "created_by"
				},
				cache: {
					maxRecords: mode === "external" ? 200 : 500,
					strategy: "lru"
				}
			});

			try {
				await syncStore.init(Collections.Events);
				this.#store.syncStore = syncStore;
				this.#store.mode = mode;
				this.#store.isInitialized = true;
			} catch (err: any) {
				console.error("Erreur initialisation SyncStore:", err);
				this.#store.error = err;
				this.#store.isInitialized = false; // Marquer comme non initialisé en cas d'erreur
				throw err; // Renvoyer l'erreur
			}
		})();

		return this.#store.initPromise;
	}

	async forceRefresh(): Promise<void> {
		if (!this.#store.syncStore) {
			throw new Error("Store not initialized");
		}
		try {
			await this.#store.syncStore.forceRefresh();
		} catch (error) {
			console.error("Erreur lors du refresh forcé:", error);
			throw error;
		}
	}

	async clearAndDestroy() {
		try {
			// Arrêter toutes les souscriptions en cours
			if (this.#store.syncStore) {
				await this.#store.syncStore.destroy();
			}

			// Réinitialiser complètement le store
			this.#store = {
				syncStore: null,
				isInitialized: false,
				error: null,
				initPromise: null,
				mode: null
			};
		} catch (error) {
			console.error("Erreur lors de la destruction du store:", error);
			// Forcer la réinitialisation même en cas d'erreur
			this.#store.isInitialized = false;
			this.#store.syncStore = null;
		}
	}

	// :::  getters

	allEvents = $derived.by<SyncEventRecord[]>(() => {
		if (!this.#store.syncStore) return [];

		return this.#store.syncStore
			.getAll()
			.filter((e) => !e.isMasterRecurrent)
			.sort((a: SyncEventRecord, b: SyncEventRecord) => {
				const dateA = a.dateStart || a.date_event;
				const dateB = b.dateStart || b.date_event;
				if (!dateA && !dateB) return 0;
				if (!dateA) return 1;
				if (!dateB) return -1;
				const compareDates = dateA.localeCompare(dateB);
				if (compareDates !== 0) return compareDates;
				// Si même date, trier par heure de début
				const timeA = a.time_start || "00:00";
				const timeB = b.time_start || "00:00";
				return timeA.localeCompare(timeB);
			});
	});

	allMasterEvents = $derived.by<SyncEventRecord[]>(() => {
		if (!this.#store.syncStore) return [];

		return this.#store.syncStore.getAll().filter((e) => e.isMasterRecurrent);
	});

	eventsWithDate = $derived<SyncEventRecord[]>(this.allEvents.filter((e) => e.date_event));

	eventsWithoutDate = $derived<SyncEventRecord[]>(this.allEvents.filter((e) => !e.date_event));

	confirmedEvents = $derived<SyncEventRecord[]>(this.allEvents.filter((e) => e.isConfirmed));

	unconfirmedEvents = $derived<SyncEventRecord[]>(this.allEvents.filter((e) => !e.isConfirmed));

	confirmableEvents = $derived<SyncEventRecord[]>(
		this.eventsWithDate.filter((e) => !e.isConfirmed)
	);

	eventsWithSondage = $derived<SyncEventRecord[]>(
		this.eventsWithoutDate.filter(
			(e) => Array.isArray(e.dates_proposed) && (e.dates_proposed?.length ?? 0) > 0
		)
	);

	eventsWithoutDateProposition = $derived<SyncEventRecord[]>(
		this.eventsWithoutDate.filter(
			(e) => Array.isArray(e.dates_proposed) && e.dates_proposed?.length === 0
		)
	);

	eventsWithoutOrganizers = $derived<SyncEventRecord[]>(
		this.allEvents.filter((e) => {
			return Array.isArray(e.organizers) && e.organizers.length === 0;
		})
	);

	getEventsOccurences = $derived<SyncEventRecord[]>(
		this.eventsWithDate.filter((e) => e.isRecurrent)
	);

	getEventById = $derived.by(() => (id: string): SyncEventRecord | undefined => {
		if (!this.#store.syncStore) return undefined;
		return this.#store.syncStore.get(id);
	});

	// 👉 Système de pagination simple pour optimiser les performances
	#pagination = $state({
		pageSize: 20,
		currentPage: 1,
		totalPages: 1,
		totalItems: 0
	});

	get pagination() {
		return this.#pagination;
	}

	// Version paginée des événements principaux pour optimiser l'affichage
	paginatedAllEvents = $derived.by(() => {
		const events = this.allEvents;
		this.#pagination.totalItems = events.length;
		this.#pagination.totalPages = Math.ceil(events.length / this.#pagination.pageSize);
		
		const startIndex = (this.#pagination.currentPage - 1) * this.#pagination.pageSize;
		const endIndex = startIndex + this.#pagination.pageSize;
		
		return events.slice(startIndex, endIndex);
	});

	// Méthodes de navigation dans la pagination
	setPage(page: number) {
		if (page >= 1 && page <= this.#pagination.totalPages) {
			this.#pagination.currentPage = page;
		}
	}

	nextPage() {
		this.setPage(this.#pagination.currentPage + 1);
	}

	previousPage() {
		this.setPage(this.#pagination.currentPage - 1);
	}

	setPageSize(size: number) {
		this.#pagination.pageSize = size;
		this.#pagination.currentPage = 1; // Reset à la première page
	}

	// Récupère les événements où l'utilisateur est organisateur
	userEvents = $derived(
		this.allEvents.filter(
			(event) =>
				!event.isRecurrent && event.date_event && event.organizers?.some((org) => org.id === userId)
		)
	);

	// Récupère les événements récurrents où l'utilisateur est dans l'équipe
	userRecurrentEvents = $derived(
		this.allMasterEvents.filter((event) =>
			event.recurrence?.recurrenceTeam?.some((member) => member?.id === userId)
		)
	);

	// Récupère les sondages auxquels l'utilisateur a répondu
	userSondageEvents = $derived(
		this.eventsWithSondage.filter((event) =>
			event.dates_proposed?.some((dateProposal) =>
				dateProposal.organizers?.some(
					(org) => org.id === userId && (org.maybehere === "oui" || org.maybehere === "peut-être")
				)
			)
		)
	);

	// Récupère les autres sondages actuels (où l'utilisateur n'a pas répondu)
	otherSondageEvents = $derived(() => {
		if (!userId) return [];
		const responded = new Set(this.userSondageEvents(userId).map((e) => e.id));
		return this.eventsWithSondage.filter((event) => !responded.has(event.id));
	});

	// USELESS
	getEventsByDate = $derived.by<Map<string, SyncEventRecord[]>>(() => {
		const eventsByDateMap = new Map<string, SyncEventRecord[]>();
		for (const event of this.allEvents) {
			if (event.date_event) {
				if (!eventsByDateMap.has(event.date_event)) {
					eventsByDateMap.set(event.date_event, []); // Initialiser un tableau vide si la date n'existe pas
				}
				eventsByDateMap.get(event.date_event)!.push(event); // Ajouter l'événement au tableau de la date correspondante
			}
		}
		return eventsByDateMap;
	});

	getEventsByDateTime = $derived.by<Map<string, EventConflictInfo[]>>(() => {
		const eventsByDateMap = new Map<string, EventConflictInfo[]>();

		// horaire par defaut inséré ensuite si non renseigné
		const getDefaultTimes = (isStart: boolean) => {
			return isStart ? "00:00" : "23:59";
		};

		for (const event of this.allEvents) {
			// Fonction utilitaire pour créer l'objet d'information
			const createEventInfo = (
				event: SyncEventRecord,
				dateStart?: string,
				dateEnd?: string
			): EventConflictInfo => {
				// Si on a une date mais pas d'horaire, on utilise les horaires par défaut
				const hasDate = event.date_event || dateStart;
				const hasTime = event.time_start && event.time_end;

				const timeStart =
					hasDate && !hasTime
						? getDefaultTimes(true)
						: dateStart
							? format(new Date(dateStart), "HH:mm")
							: event.time_start;

				const timeEnd =
					hasDate && !hasTime
						? getDefaultTimes(false)
						: dateEnd
							? format(new Date(dateEnd), "HH:mm")
							: event.time_end;

				return {
					id: event.id,
					event_title: event.event_title,
					organizers: event.organizers,
					rooms: event.rooms,
					conflictType: event.isConfirmed ? "confirmed" : "unconfirmed",
					date_event: event.date_event,
					dateStart: dateStart || event.dateStart,
					dateEnd: dateEnd || event.dateEnd,
					time_start: timeStart,
					time_end: timeEnd
				};
			};

			// Fonction utilitaire pour extraire la date YYYY-MM-DD
			const extractDateOnly = (dateString: string | null | undefined): string | null => {
				if (!dateString) return null;

				try {
					// Si c'est déjà au format YYYY-MM-DD
					if (event.date_event) return event.date_event;

					// Pour les dates ISO ou standard
					return dateString.split("T")[0].split(" ")[0];
				} catch (error) {
					console.error("Error processing date:", dateString, error);
					return null;
				}
			};

			// Fonction utilitaire pour ajouter un événement à la map
			const addEventToDate = (
				dateString: string | null | undefined,
				eventInfo: EventConflictInfo
			) => {
				const dateOnly = extractDateOnly(dateString);
				if (!dateOnly) return;

				if (!eventsByDateMap.has(dateOnly)) {
					eventsByDateMap.set(dateOnly, []);
				}

				// Éviter les doublons pour le même événement
				if (!eventsByDateMap.get(dateOnly)!.some((e) => e.id === eventInfo.id)) {
					eventsByDateMap.get(dateOnly)!.push(eventInfo);
				}
			};

			// Traiter la date principale si elle existe
			if (event.dateStart) {
				const eventInfo = createEventInfo(event, event.dateStart, event.dateEnd);
				addEventToDate(event.dateStart, eventInfo);
			} else if (event.date_event) {
				// Fallback sur date_event + time_start/end si dateStart n'existe pas
				const dateStart = `${event.date_event}T${event.time_start}`;
				const dateEnd = `${event.date_event}T${event.time_end}`;
				const eventInfo = createEventInfo(event, dateStart, dateEnd);
				addEventToDate(event.date_event, eventInfo);
			}

			// Traiter les dates proposées si elles existent
			if (event.dates_proposed?.length) {
				for (const proposedDate of event.dates_proposed) {
					if (proposedDate?.dateStart && proposedDate?.dateEnd) {
						const sondageEventInfo = createEventInfo(
							event,
							proposedDate.dateStart,
							proposedDate.dateEnd
						);
						sondageEventInfo.conflictType = "sondage";
						addEventToDate(proposedDate.dateStart, sondageEventInfo);
					}
				}
			}
		}

		return eventsByDateMap;
	});

	eventTimeInfoMap = $derived.by<Map<string, EventTimeInfo[]>>(() => {
		// Assure-toi que allEvents contient bien les champs nécessaires
		// (id, title, rooms, organizers, isConfirmed, dateStart, dateEnd, date_event, time_start, time_end, dates_proposed)
		return buildEventTimeInfoMap(this.allEvents);
	});

	get isInitialized(): boolean {
		return this.#store.isInitialized;
	}

	get error(): Error | null {
		return this.#store.error;
	}

	// ::: Utilitaires partagés
	private timeUtils = {
		parseTimeToMinutes: (time: string): number => {
			const [hours, minutes] = time.split(":").map(Number);
			return hours * 60 + minutes;
		},

		parseDateTime: (dateTimeStr: string, format: string) =>
			parse(dateTimeStr, format, new Date()).getTime(),

		checkTimeOverlap: (start1: number, end1: number, start2: number, end2: number): boolean =>
			start1 < end2 && end1 > start2,

		isTimeClose: (time1: number, time2: number, threshold = 2 * 60 * 60 * 1000): boolean =>
			Math.abs(time1 - time2) < threshold
	};

	// Méthode centrale de détection des chevauchements
	private findOverlappingEvents(
		targetStart: number,
		targetEnd: number,
		events: EventConflictInfo[],
		options: {
			excludeEventId?: string;
			checkCloseEvents?: boolean;
			rooms?: string[];
		} = {}
	) {
		const getDefaultTime = (date: string, isStart: boolean) => {
			const baseDate = new Date(date);
			if (isStart) {
				baseDate.setHours(0, 0, 0, 0);
			} else {
				baseDate.setHours(23, 59, 59, 999);
			}
			return baseDate.getTime();
		};

		const overlappingEvents = events.filter((event) => {
			if (options.excludeEventId && event.id === options.excludeEventId) return false;

			let eventStartTime: number;
			let eventEndTime: number;

			if (event.date_event && (!event.time_start || !event.time_end)) {
				// Événement avec date mais sans horaire : occupe toute la journée
				eventStartTime = getDefaultTime(event.date_event, true);
				eventEndTime = getDefaultTime(event.date_event, false);
			} else {
				eventStartTime = event.dateStart
					? new Date(event.dateStart).getTime()
					: this.parseTimeToDate(event.time_start, new Date()).getTime();
				eventEndTime = event.dateEnd
					? new Date(event.dateEnd).getTime()
					: this.parseTimeToDate(event.time_end, new Date()).getTime();
			}

			if (isNaN(eventStartTime) || isNaN(eventEndTime)) return false;

			const hasTimeOverlap = this.timeUtils.checkTimeOverlap(
				targetStart,
				targetEnd,
				eventStartTime,
				eventEndTime
			);

			const isClose =
				options.checkCloseEvents &&
				(this.timeUtils.isTimeClose(targetEnd, eventStartTime) ||
					this.timeUtils.isTimeClose(targetStart, eventEndTime));

			return hasTimeOverlap || isClose;
		});

		if (options.rooms) {
			return overlappingEvents.map((event) =>
				this.formatConflict(event, options.rooms, targetStart, targetEnd)
			);
		}

		return overlappingEvents;
	}

	/**
	 * Trouve tous les groupes d'événements qui se chevauchent pour chaque date
	 * @returns Une Map avec des clés au format "date_groupe" et des tableaux d'événements en conflit
	 */
	getOverlappingEventGroups = $derived.by<Map<string, EventConflictInfo[][]>>(() => {
		const overlappingByDate = new Map<string, EventConflictInfo[][]>();

		for (const [date, events] of this.getEventsByDateTime.entries()) {
			if (events.length < 2) continue;

			const groups: EventConflictInfo[][] = [];
			const processed = new Set<string>();

			for (const event of events) {
				if (processed.has(event.id)) continue;

				const eventStart = event.dateStart
					? new Date(event.dateStart).getTime()
					: this.parseTimeToDate(event.time_start, new Date(date)).getTime();
				const eventEnd = event.dateEnd
					? new Date(event.dateEnd).getTime()
					: this.parseTimeToDate(event.time_end, new Date(date)).getTime();

				const overlapping = this.findOverlappingEvents(eventStart, eventEnd, events);

				if (overlapping.length > 1) {
					groups.push(overlapping);
					overlapping.forEach((e) => processed.add(e.id));
				}
			}

			if (groups.length > 0) {
				overlappingByDate.set(date, groups);
			}
		}

		return overlappingByDate;
	});

	private parseTimeToDate(timeString: string, baseDate: Date): Date {
		{
			const [hours, minutes] = timeString.split(":").map(Number);
			const date = new Date(baseDate);
			date.setHours(hours, minutes, 0, 0);
			return date;
		}
	}

	/**
	 * Fonction privée pour exécuter la mise à jour réelle dans PocketBase et envoyer les notifications.
	 */
	async #executeTaskUpdate(
		eventId: string,
		userId: string,
		username: string, // Nécessaire pour les messages/notifications
		newTasks: string[],
		options: { notifyOthers?: boolean; customMessage?: string; taskBeingLeft?: string } = {}
	): Promise<void> {
		// Importer le service de notification
		const { notificationService } = await import("$lib/services/notificationService.svelte");

		// Renvoyer Promise<void> pour async
		const event = this.getEventById(eventId); // Récupérer l'événement frais depuis le store
		if (!event) {
			console.error(`Event ${eventId} not found in store for task update.`);
			throw new Error(`Événement ${eventId} non trouvé.`);
		}

		const currentOrganizers: OrganizerType[] = Array.isArray(event.organizers)
			? JSON.parse(JSON.stringify(event.organizers)) // Copie profonde simple
			: [];
		const userIndex = currentOrganizers.findIndex((org) => org.id === userId);

		let finalOrganizers: OrganizerType[];

		if (userIndex !== -1) {
			if (newTasks.length === 0) {
				// Retirer l'utilisateur s'il n'a plus de tâches
				finalOrganizers = currentOrganizers.filter((org) => org.id !== userId);
			} else {
				// Mettre à jour les tâches de l'utilisateur existant
				currentOrganizers[userIndex].tasks = newTasks;
				finalOrganizers = currentOrganizers;
			}
		} else if (newTasks.length > 0) {
			// Ajouter le nouvel utilisateur (cas d'inscription)
			finalOrganizers = [
				...currentOrganizers,
				{ id: userId, username: username, tasks: newTasks } // Ajouter email/role si nécessaire/disponible
			];
		} else {
			// Cas: utilisateur non trouvé ET pas de nouvelles tâches -> ne rien faire
			finalOrganizers = currentOrganizers;
		}

		// Préparer les données pour PocketBase
		const updateData: Partial<EventType> = {
			organizers: finalOrganizers
		};

		// Logique d'auto-confirmation (SEULEMENT si on ajoute/met à jour des tâches et que les conditions sont remplies)
		// Vérifier si l'état a changé vers "organisé"
		const wasOrganizedBefore = this.#areAllTasksAssigned(
			event.tasks?.map((t) => t.name) || [],
			currentOrganizers
		);
		const isOrganizedNow = this.#areAllTasksAssigned(
			event.tasks?.map((t) => t.name) || [],
			finalOrganizers
		);

		if (
			!event.isConfirmed && // Ne pas reconfirmer
			event.recurrence?.autoConfirm &&
			Array.isArray(event.tasks) &&
			event.tasks.length > 0 && // Doit avoir des tâches définies
			!wasOrganizedBefore &&
			isOrganizedNow && // Changement d'état vers organisé
			finalOrganizers.length >= (event.recurrence.autoConfirmMin ?? 1)
		) {
			updateData.isConfirmed = true;
			showAlert(
				`Événement "${event.event_title}" auto-confirmé car toutes les tâches sont assignées.`,
				"success"
			);
		}

		// --- Mise à jour PocketBase ---
		try {
			await updateEvent(eventId, updateData);
			// Pas d'alerte succès ici, gérée par l'appelant (requestTaskUpdate)
		} catch (updateError) {
			console.error(`Failed to execute task update for event ${eventId}:`, updateError);
			showAlert("Erreur lors de la mise à jour de l'inscription.", "error");
			throw updateError; // Renvoyer l'erreur
		}

		// --- Notification (si désinscription et demandé) ---
		if (options.notifyOthers && options.taskBeingLeft !== undefined) {
			// Utiliser le service de notification pour les désinscriptions
			try {
				await notificationService.sendTaskUnsubscriptionNotification({
					event,
					user: { id: userId, username },
					task: options.taskBeingLeft,
					options: {
						customMessage: options.customMessage,
						notifyOthers: options.notifyOthers,
						showUserFeedback: true
					}
				});
			} catch (err) {
				console.error("Erreur lors de l'envoi de la notification:", err);
				showAlert(
					"L'inscription a été mise à jour, mais la notification n'a pas pu être envoyée.",
					"error"
				);
			}
		}
	}

	/**
	 * Point d'entrée public pour demander une mise à jour de tâche depuis les composants Cartes.
	 * Orchestre l'action directe, l'ouverture de la modale de confirmation simple ou de TaskDialog.
	 */
	async requestTaskUpdate(params: { event: EventType; user: UserType; taskName?: string }) {
		const { event, user, taskName } = params;

		// Vérifications initiales robustes
		if (!event || !user) {
			console.error("requestTaskUpdate: event ou user manquant.");
			showAlert("Impossible de traiter la demande (données manquantes).", "error");
			return;
		}
		// Si l'événement est annulé, interdire les modifications d'inscription
		if (event.canceled) {
			showAlert("Cet événement est annulé, impossible de modifier l'inscription.", "info");
			return;
		}

		const currentOrganizers: OrganizerType[] = Array.isArray(event.organizers)
			? event.organizers
			: [];
		const userIndex = currentOrganizers.findIndex((org) => org.id === user.id);
		const userOrg = userIndex !== -1 ? currentOrganizers[userIndex] : null;
		const userCurrentTasks = userOrg?.tasks || [];
		const eventTasks = event.tasks || [];

		const isSingleTaskEvent = eventTasks.length === 1;
		// Détermine la tâche cible : celle fournie, ou la tâche unique si applicable, sinon undefined
		const targetTask = taskName ?? (isSingleTaskEvent ? eventTasks[0]?.name : undefined);

		// Est-ce que l'utilisateur est actuellement inscrit à la tâche cible ?
		// Si targetTask est undefined (cas multi-tâches sans taskName), on considère isSubscribed si l'utilisateur est dans les orgas
		const isSubscribedToTarget = targetTask ? userCurrentTasks.includes(targetTask) : !!userOrg;

		// --- Cas : Gestion de tâches multiples via TaskDialog ---
		if (eventTasks.length > 1 && !taskName) {
			openTaskModal({
				username: user.username,
				tasksAvailable: eventTasks,
				selectedTaskNames: userCurrentTasks,
				eventIsConfirmed: event.isConfirmed ?? false,
				eventId: event.id,
				onSubmit: async (selectedTaskNames: string[], notifyOthers?: boolean) => {
					// Utilise TaskModalSubmitResult
					try {
						// Détecter les tâches supprimées
						const removedTasks = userCurrentTasks.filter(
							(task) => !selectedTaskNames.includes(task)
						);

						const hasRemovedTasks = removedTasks.length > 0;
						const isCompleteUnsubscribe =
							userCurrentTasks.length > 0 && selectedTaskNames.length === 0;

						// Si c'est un événement confirmé et qu'il y a des tâches supprimées
						// ou une désinscription complète, vérifier si on doit notifier (paramètre ou true par défaut)
						const shouldNotify =
							event.isConfirmed &&
							(hasRemovedTasks || isCompleteUnsubscribe) &&
							(notifyOthers !== undefined ? notifyOthers : true);

						// Appelle #executeTaskUpdate avec les tâches sélectionnées
						await this.#executeTaskUpdate(
							event.id,
							user.id,
							user.username,
							selectedTaskNames,
							// Ajouter des options de notification si nécessaire
							shouldNotify
								? {
										notifyOthers: true,
										taskBeingLeft: removedTasks.join(", ")
									}
								: {}
						);

						if (hasRemovedTasks) {
							showAlert(`Vous vous êtes désinscrit de ${removedTasks.length} tâche(s)`, "success");
						} else if (isCompleteUnsubscribe) {
							showAlert("Vous vous êtes désinscrit de l'événement", "success");
						} else {
							showAlert("Vos tâches ont été mises à jour.", "success");
						}
					} catch (error) {
						/* Erreur déjà gérée par #executeTaskUpdate */
					}
				}
			});
			return; // Stop, géré par la modale
		}

		// --- Cas : Inscription (tâche spécifique ou unique) ---
		if (targetTask && !isSubscribedToTarget) {
			const newTasks = [...new Set([...userCurrentTasks, targetTask])];
			try {
				await this.#executeTaskUpdate(event.id, user.id, user.username, newTasks);
				showAlert(`Inscrit à la tâche "${targetTask}".`, "success");
			} catch (error) {
				/* Erreur déjà gérée par #executeTaskUpdate */
			}
			return;
		}

		// --- Cas : Désinscription (tâche spécifique ou unique) ---
		if (targetTask && isSubscribedToTarget) {
			const newTasks = userCurrentTasks.filter((t) => t !== targetTask); // Tâches restantes

			if (event.isConfirmed) {
				// --- Ouvrir Modale de Confirmation Simple ---
				const finalOrganizersAfterUpdate =
					newTasks.length === 0
						? currentOrganizers.filter((org) => org.id !== user.id) // Simule le retrait
						: currentOrganizers.map((org) =>
								org.id === user.id ? { ...org, tasks: newTasks } : org
							); // Simule la MàJ

				// Est-ce le dernier organisateur pour CETTE tâche ? (Approximation)
				const isLastForThisTask = !currentOrganizers.some(
					(org) => org.id !== user.id && org.tasks?.includes(targetTask)
				);
				// Est-ce le dernier organisateur au total après cette action ?
				const isLastOverall = finalOrganizersAfterUpdate.length === 0;

				let message = `L'événement "${event.event_title}" est confirmé. Êtes-vous sûr·e de vouloir vous désinscrire de la tâche "${targetTask}" ?`;
				if (isLastOverall) {
					message = `Vous êtes le/la dernier·e organisateur·ice pour cet événement (${targetTask}). Si l'événement doit avoir lieu bientôt, songez à l'annuler. Cliquez sur "continuer" pour confirmer votre désinscription.`;
				} else if (isLastForThisTask) {
					// Ajouter une nuance si dernier pour cette tâche mais pas globalement
					message += `\nAttention : vous êtes la seule personne inscrite pour cette tâche spécifique.`;
				}

				modalState.confirm = {
					isOpen: true,
					data: {
						title: "Confirmer la désinscription",
						message: message,
						variant: isLastOverall ? "danger" : "warning",
						showCheckbox: { label: "Prévenir les autres organisateur·ices", checked: true },
						// showCancelEventButton: isLastOverall ? { ... } : undefined, // Ajouter logique annulation si besoin
						onConfirm: async (notifyOthers?: boolean, customMessage?: string) => {
							try {
								await this.#executeTaskUpdate(
									event.id,
									user.id,
									user.username,
									newTasks, // Les tâches restantes (potentiellement [])
									{ notifyOthers, customMessage, taskBeingLeft: targetTask }
								);
								showAlert(`Désinscrit de la tâche "${targetTask}".`, "success");
							} catch (error) {
								/* Erreur déjà gérée par #executeTaskUpdate */
							}
						}
					}
				};
			} else {
				// --- Désinscription Directe (événement non confirmé) ---
				try {
					await this.#executeTaskUpdate(event.id, user.id, user.username, newTasks, {
						taskBeingLeft: targetTask
					});
					showAlert(`Désinscrit de la tâche "${targetTask}".`, "success");
				} catch (error) {
					/* Erreur déjà gérée par #executeTaskUpdate */
				}
			}
			return;
		}

		// --- Cas non géré ---
		console.warn("requestTaskUpdate: Cas non géré ou action invalide.", {
			eventId: event.id,
			userId: user.id,
			taskName
		});
		showAlert("Action impossible ou non reconnue.", "error");
	}

	// --- Helper interne (potentiellement utilisé par #executeTaskUpdate) ---
	#areAllTasksAssigned = (tasks: string[], organizers: OrganizerType[]): boolean => {
		if (!tasks || tasks.length === 0) return true; // Pas de tâche = assigné USELESS ? : N'est pas censé se produire
		if (!organizers || organizers.length === 0) return false;
		const assignedTasks = new Set(organizers.flatMap((org) => org.tasks || []));
		return tasks.every((taskName) => assignedTasks.has(taskName));
	};

	/**
	 * Méthode de nettoyage pour détruire l'instance de SyncStore et réinitialiser l'état.
	 */
	destroy(): void {
		if (this.#store.syncStore) {
			this.#store.syncStore.destroy();
			this.#store.syncStore = null;
		}
		this.#store.isInitialized = false;
		this.#store.error = null;
		this.#store.initPromise = null;
	}
}

export const eventsStore = new EventsStore();
