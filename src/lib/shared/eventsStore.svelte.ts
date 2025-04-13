import { SyncStore } from '$lib/shared/syncState.svelte';
import type { EventsRecord, UsersResponse } from '$lib/types/pocketbase.ts';
import type { EventType, OrganizerType, TaskType } from '$lib/schemas/event.schema';
import { Collections } from '$lib/types/pocketbase';
import { format, parse } from 'date-fns';
import type { StoreConfig } from '$lib/types/syncState.types';

import { updateEvent, sendNotification } from '$lib/pocketbase.svelte';
import type { UserType } from '$lib/types/types';

import { modalState, openTaskModal } from '$lib/shared/states.svelte';
import { getSpace } from './spaceOptions.svelte';
import { filterAndConvertOrganizers } from '$lib/utils.js';
// Ajouter ces types au début du fichier
export interface EventConflict {
	id: string;
	event_title: string;
	time_start: string;
	time_end: string;
	rooms: string[];
	conflictType: 'confirmed' | 'unconfirmed' | 'sondage' | 'close-confirmed' | 'close-unconfirmed';
	hasSameRoom: boolean;
	date_event: string;
	isConfirmed: boolean;
	organizers: OrganizerType[];
	sourceEventId?: string; // Propriété temporaire pour la déduplication
}

type ConflictType = 'confirmed' | 'unconfirmed' | 'sondage';

interface EventConflictInfo {
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
	'close-confirmed': EventConflict[];
	'close-unconfirmed': EventConflict[];
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

class EventsStore {
	#store = $state({
		syncStore: null as SyncStore<SyncEventRecord> | null,
		isInitialized: false,
		error: null as Error | null,
		initPromise: null as Promise<void> | null,
		mode: null as 'internal' | 'external' | null
	});

	async init({ spaceId, mode }: StoreConfig) {
		if (this.#store.initPromise) return this.#store.initPromise;

		this.#store.initPromise = (async () => {
			const dbName = 'eventsStore'; //= mode === 'external' ? 'events-public' : 'events-dashboard';

			const filter = `space = '${spaceId}' && (date_event = "" || date_event >= '${new Date().toISOString().split('T')[0]}')`;

			const syncStore = new SyncStore<SyncEventRecord>({
				name: 'eventsStore',
				version: 1,
				dbName,
				sync: {
					mode: 'realtime',
					filter,
					sort: 'date_event',
					expand: 'created_by'
				},
				cache: {
					maxRecords: mode === 'external' ? 200 : 500,
					strategy: 'lru'
				}
			});

			await syncStore.init(Collections.Events);
			this.#store.syncStore = syncStore;
			this.#store.mode = mode;
			this.#store.isInitialized = true;
		})();

		return this.#store.initPromise;
	}

	async forceRefresh(): Promise<void> {
		if (!this.#store.syncStore) {
			throw new Error('Store not initialized');
		}
		try {
			await this.#store.syncStore.forceRefresh();
		} catch (error) {
			console.error('Erreur lors du refresh forcé:', error);
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
			console.error('Erreur lors de la destruction du store:', error);
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
				if (!a.date_event && !b.date_event) return 0;
				if (!a.date_event) return 1;
				if (!b.date_event) return -1;
				return a.date_event.localeCompare(b.date_event);
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
			return isStart ? '00:00' : '23:59';
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
							? format(new Date(dateStart), 'HH:mm')
							: event.time_start;

				const timeEnd =
					hasDate && !hasTime
						? getDefaultTimes(false)
						: dateEnd
							? format(new Date(dateEnd), 'HH:mm')
							: event.time_end;

				return {
					id: event.id,
					event_title: event.event_title,
					organizers: event.organizers,
					rooms: event.rooms,
					conflictType: event.isConfirmed ? 'confirmed' : 'unconfirmed',
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
					return dateString.split('T')[0].split(' ')[0];
				} catch (error) {
					console.error('Error processing date:', dateString, error);
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
						sondageEventInfo.conflictType = 'sondage';
						addEventToDate(proposedDate.dateStart, sondageEventInfo);
					}
				}
			}
		}

		return eventsByDateMap;
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
			const [hours, minutes] = time.split(':').map(Number);
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

	findConflicts(
		eventId: string | undefined,
		dateTimeStart: string,
		dateTimeEnd: string,
		rooms: string[]
	) {
		if (!dateTimeStart || !dateTimeEnd) return [];

		const dateStr = dateTimeStart.substring(0, 8);
		const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
		const eventsOnDate = this.getEventsByDateTime.get(formattedDate) || [];

		const startTime = this.timeUtils.parseDateTime(dateTimeStart, 'yyyyMMddHHmm');
		const endTime = this.timeUtils.parseDateTime(dateTimeEnd, 'yyyyMMddHHmm');

		return this.findOverlappingEvents(startTime, endTime, eventsOnDate, {
			excludeEventId: eventId,
			checkCloseEvents: true,
			rooms
		});
	}

	private formatConflict(
		event: EventConflictInfo,
		rooms: string[],
		startTime: number,
		endTime: number
	): Conflict {
		const hasSameRoom = this.hasSameRoomCheck(rooms, event.rooms);

		// Déterminer le type de conflit
		let conflictType: Conflict['conflictType'] = event.conflictType;

		// Si ce n'est pas un sondage, vérifier si c'est un conflit direct ou proche
		if (event.conflictType !== 'sondage') {
			const eventStartTime = event.dateStart
				? new Date(event.dateStart).getTime()
				: this.parseTimeToDate(event.time_start, new Date()).getTime();
			const eventEndTime = event.dateEnd
				? new Date(event.dateEnd).getTime()
				: this.parseTimeToDate(event.time_end, new Date()).getTime();

			const isDirectConflict = this.timeUtils.checkTimeOverlap(
				startTime,
				endTime,
				eventStartTime,
				eventEndTime
			);

			if (!isDirectConflict) {
				// Ajouter le préfixe 'close-' pour les événements proches
				conflictType = event.conflictType === 'confirmed' ? 'close-confirmed' : 'close-unconfirmed';
			}
		}

		return {
			id: event.id,
			event_title: event.event_title,
			time_start: event.dateStart ? format(new Date(event.dateStart), 'HH:mm') : event.time_start,
			time_end: event.dateEnd ? format(new Date(event.dateEnd), 'HH:mm') : event.time_end,
			rooms: event.rooms,
			conflictType,
			hasSameRoom
		};
	}

	private checkDateOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
		return start1 < end2 && end1 > start2;
	}

	private hasSameRoomCheck(rooms1: string[], rooms2: string[]): boolean {
		const event1Rooms = new Set(rooms1 || []);
		const event2Rooms = new Set(rooms2 || []);
		if (event1Rooms.size === 0 || event2Rooms.size === 0) return false;
		return [...event1Rooms].some((room) => event2Rooms.has(room));
	}

	private parseTimeToDate(timeString: string, baseDate: Date): Date {
		{
			const [hours, minutes] = timeString.split(':').map(Number);
			const date = new Date(baseDate);
			date.setHours(hours, minutes, 0, 0);
			return date;
		}
	}

	#areAllTasksAssigned = (tasks: string[], organizers: OrganizerType[]): boolean => {
		if (!tasks || tasks.length === 0) return true; // S'il n'y a pas de tâche, c'est considéré comme assigné
		return tasks.every((taskName) => organizers.some((org) => org.tasks?.includes(taskName)));
	};

	// méthode pour gérer l'inscription/désinscription aux tâches
	async manageTaskSubscription(
		event: EventType,
		currentUser: UserType,
		taskName?: string // Paramètre optionnel pour une tâche spécifique
	) {
		if (!event || !currentUser || !event.tasks.length) {
			console.error('Données invalides pour manageTaskSubscription');
			return;
		}

		// Copie sécurisée des organisateurs en créant un nouvel objet pour chacun
		const currentOrganizers: OrganizerType[] = Array.isArray(event.organizers)
			? event.organizers.map((org) => ({
					id: org.id,
					username: org.username,
					tasks: [...org.tasks]
				}))
			: [];
		const userIndex = currentOrganizers.findIndex((org) => org.id === currentUser.id);
		let userOrganizer = userIndex !== -1 ? currentOrganizers[userIndex] : null;
		const userTasks = userOrganizer?.tasks ?? [];

		// --- Cas spécifique : Inscription/Désinscription à une tâche connue ---
		if (taskName) {
			console.log('taskName:', taskName);
			let updatedOrganizers: OrganizerType[];
			const isSubscribedToTask = userTasks.includes(taskName);

			if (isSubscribedToTask) {
				// ---> Désinscription de la tâche spécifique <---
				const newUserTasks = userTasks.filter((t) => t !== taskName);

				// --- Logique de confirmation si événement confirmé ---
				if (event.isConfirmed) {
					const remainingOrganizersForEvent = currentOrganizers.filter(
						(org) => org.id !== currentUser.id || newUserTasks.length > 0 // Vérifie si l'utilisateur a d'autres tâches OU s'il y a d'autres organisateurs
					);
					const isLastOrganizer = remainingOrganizersForEvent.length === 0;

					// Ouvrir le modal de confirmation
					modalState.confirm = {
						isOpen: true,
						data: {
							title: 'Confirmer la désinscription',
							message: isLastOrganizer
								? `Vous êtes le/la dernier·e organisateur·ice pour cet événement (${taskName}). Si l'événement doit avoir lieu bientôt, songez a l'annuler. Êtes-vous sûr·e ?`
								: `L'événement "${event.event_title}" est confirmé. Êtes-vous sûr·e de vouloir vous désinscrire de la tâche "${taskName}" ?`,
							variant: isLastOrganizer ? 'danger' : 'warning',
							// 👉 Ajout des options pour le modal
							showCheckbox: {
								label: 'Prévenir les autres organisateur·ices ',
								checked: true // Pré-coché par défaut
							},
							// 👉 Proposer l'annulation seulement si c'est le dernier organisateur
							...(isLastOrganizer && {
								showCancelEventButton: {
									label: "Annuler l'événement",
									onCancelEvent: async () => {
										try {
											await updateEvent(event.id, { canceled: true });
											modalState.confirm.isOpen = false; // Fermer le modal
											// TODO : notification de succès d'annulation
										} catch (err) {
											console.error("Erreur lors de l'annulation de l'événement:", err);
											// Optionnel : notification d'erreur
										}
									}
								}
							}),
							// 👉 onConfirm reçoit maintenant l'état de la checkbox
							onConfirm: async (notifyOthers: boolean) => {
								let finalOrganizers: OrganizerType[];
								if (newUserTasks.length === 0 && userIndex !== -1) {
									// Retirer complètement l'utilisateur s'il n'a plus de tâches
									finalOrganizers = currentOrganizers.filter((org) => org.id !== currentUser.id);
								} else if (userIndex !== -1) {
									// Mettre à jour les tâches de l'utilisateur
									finalOrganizers = currentOrganizers.map((org) =>
										org.id === currentUser.id ? { ...org, tasks: newUserTasks } : org
									);
								} else {
									finalOrganizers = currentOrganizers; // Ne devrait pas arriver
								}

								// Mettre à jour l'événement SANS auto-confirmer
								await this.#updateEventOrganizers(event, finalOrganizers, true); // true pour skipAutoConfirm

								// Envoyer la notification si demandé et s'il y a d'autres orgas ou admins à notifier
								if (notifyOthers) {
									try {
										await sendNotification({
											eventId: event.id,
											notificationType: 'organizerLeft',
											leavingUserId: currentUser.id,
											leavingUsername: currentUser.username,
											taskName: taskName // Ajouter le nom de la tâche
										});
									} catch (err) {
										console.error("Erreur lors de l'envoi de la notification:", err);
										// Optionnel: Afficher une erreur à l'utilisateur
									}
								}
							}
						}
					};
					return; // Arrêter ici, l'action se fera via le modal
				} else {
					// Désinscription normale (événement non confirmé)
					if (newUserTasks.length === 0 && userIndex !== -1) {
						updatedOrganizers = currentOrganizers.filter((org) => org.id !== currentUser.id);
					} else if (userIndex !== -1) {
						updatedOrganizers = currentOrganizers.map((org) =>
							org.id === currentUser.id ? { ...org, tasks: newUserTasks } : org
						);
					} else {
						updatedOrganizers = currentOrganizers;
					}
					await this.#updateEventOrganizers(event, updatedOrganizers);
				}
			} else {
				// ---> Inscription à la tâche spécifique <---
				const newUserTasks = [...userTasks, taskName];
				if (userIndex !== -1) {
					updatedOrganizers = currentOrganizers.map((org) =>
						org.id === currentUser.id ? { ...org, tasks: newUserTasks } : org
					);
				} else {
					updatedOrganizers = [
						...currentOrganizers,
						{
							id: currentUser.id,
							username: currentUser.username,
							tasks: [taskName] // Ajouter la tâche spécifique
						}
					];
				}
				await this.#updateEventOrganizers(event, updatedOrganizers);
			}
		}
		// --- Cas existant : Pas de tâche spécifique fournie (gestion via modal ou tâche unique) ---
		else {
			const availableTaskNames: string[] = event.tasks.map((task) => task.name);

			// --- Cas 1 : Une seule tâche disponible ---
			if (event.tasks.length === 1) {
				// Appeler la logique spécifique avec le nom de la tâche unique
				await this.manageTaskSubscription(event, currentUser, event.tasks[0].name);
			}
			// --- Cas 2 : Plusieurs tâches disponibles ---
			else if (availableTaskNames.length > 1) {
				const availableTaskConfigs = getSpace.tasks.filter((taskConfig) =>
					availableTaskNames.includes(taskConfig.name)
				);

				openTaskModal({
					username: currentUser.username,
					tasks: availableTaskConfigs,
					selectedTasks: userTasks,
					onSubmit: async (selectedTaskNames: string[]) => {
						let updatedOrganizersViaModal: OrganizerType[];
						if (selectedTaskNames.length > 0) {
							if (userIndex !== -1) {
								updatedOrganizersViaModal = currentOrganizers.map((org) =>
									org.id === currentUser.id ? { ...org, tasks: selectedTaskNames } : org
								);
							} else {
								updatedOrganizersViaModal = [
									...currentOrganizers,
									{
										id: currentUser.id,
										username: currentUser.username,
										tasks: selectedTaskNames
									}
								];
							}
						} else {
							if (userIndex !== -1) {
								updatedOrganizersViaModal = currentOrganizers.filter(
									(org) => org.id !== currentUser.id
								);
							} else {
								updatedOrganizersViaModal = currentOrganizers;
							}
						}
						await this.#updateEventOrganizers(event, updatedOrganizersViaModal);
					}
				});
			} else {
				console.warn(`Aucune tâche définie pour l'événement ${event.id}`);
			}
		}
	}

	async #updateEventOrganizers(
		event: EventType,
		updatedOrganizers: OrganizerType[],
		skipAutoConfirm: boolean = false // Nouveau paramètre
	) {
		try {
			const finalOrganizers = updatedOrganizers.filter((org) => org.tasks && org.tasks.length > 0);

			let shouldAutoConfirm = false;
			// 👉 Vérification pour l'auto-confirmation seulement si skipAutoConfirm est false
			if (!skipAutoConfirm && event.recurrence?.autoConfirm && Array.isArray(event.tasks)) {
				shouldAutoConfirm =
					this.#areAllTasksAssigned(
						event.tasks.map((task) => task.name),
						finalOrganizers
					) && finalOrganizers.length >= (event.recurrence.autoConfirmMin ?? 1);
			}

			const updateData: Partial<EventType> = {
				organizers: finalOrganizers
			};
			// 👉 Confirmer seulement si shouldAutoConfirm est vrai ET l'événement n'est pas déjà confirmé
			if (shouldAutoConfirm && !event.isConfirmed) {
				updateData.isConfirmed = true;
			}

			await updateEvent(event.id, updateData);
		} catch (error) {
			console.error('Erreur lors de la mise à jour des organisateurs :', error);
		}
	}

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
	}
}

export const eventsStore = new EventsStore();
