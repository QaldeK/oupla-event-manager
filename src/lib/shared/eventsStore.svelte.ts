import { SyncStore } from "$lib/shared/syncState.svelte";
import type { EventsRecord, UsersResponse } from "$lib/types/pocketbase.ts";
import type { EventType, OrganizerType, TaskType } from "$lib/schemas/event.schema";
import { Collections } from "$lib/types/pocketbase";
import { format, parse } from "date-fns";
import {
	findConflictsForEvent,
	findOverlappingGroupsOnDate,
	buildEventTimeInfoMap,
	type EventTimeInfo, // Importe le type si besoin
	type Conflict // Importe le type si besoin
} from "$lib/utils/eventConflicts";
import type { StoreConfig } from "$lib/types/syncState.types";

import { updateEvent, sendGenericEmail, type GenericEmailPayload } from "$lib/pocketbase.svelte";
import type { UserType } from "$lib/types/types";

import { modalState, openTaskModal } from "$lib/shared/states.svelte";
import { getSpace } from "./spaceOptions.svelte";
import { filterAndConvertOrganizers } from "$lib/utils.js";
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

			await syncStore.init(Collections.Events);
			this.#store.syncStore = syncStore;
			this.#store.mode = mode;
			this.#store.isInitialized = true;
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

	#areAllTasksAssigned = (tasks: string[], organizers: OrganizerType[]): boolean => {
		if (!tasks || tasks.length === 0) return true; // S'il n'y a pas de tâche, c'est considéré comme assigné
		return tasks.every((taskName) => organizers.some((org) => org.tasks?.includes(taskName)));
	};

	// méthode pour gérer l'inscription/désinscription aux tâches
	// --- Helper Functions for manageTaskSubscription ---

	private async _handleSpecificTaskSubscription(
		event: EventType,
		currentUser: UserType,
		taskName: string,
		currentOrganizers: OrganizerType[],
		userIndex: number,
		userTasks: string[]
	) {
		const isSubscribedToTask = userTasks.includes(taskName);

		if (isSubscribedToTask) {
			// --- Désinscription ---
			const newUserTasks = userTasks.filter((t) => t !== taskName);
			if (event.isConfirmed) {
				// Ouvre le modal de confirmation, qui appellera _performUnsubscription
				this._openConfirmationModal(
					event,
					currentUser,
					taskName,
					currentOrganizers,
					userIndex,
					newUserTasks
				);
			} else {
				// Désinscription directe pour événement non confirmé, sans notification par défaut
				await this._performUnsubscription(
					event,
					currentUser,
					taskName,
					currentOrganizers,
					userIndex,
					newUserTasks,
					false
				);
			}
		} else {
			// --- Inscription ---
			const newUserTasks = [...userTasks, taskName];
			let updatedOrganizers: OrganizerType[];
			if (userIndex !== -1) {
				// L'utilisateur est déjà organisateur, on met à jour ses tâches
				updatedOrganizers = currentOrganizers.map((org) =>
					org.id === currentUser.id ? { ...org, tasks: newUserTasks } : org
				);
			} else {
				// Nouvel organisateur
				updatedOrganizers = [
					...currentOrganizers,
					{
						id: currentUser.id,
						username: currentUser.username,
						tasks: [taskName] // Commence avec la tâche spécifique
					}
				];
			}
			// Met à jour les organisateurs (auto-confirme si nécessaire via la fonction privée)
			await this.#updateEventOrganizers(event, updatedOrganizers);
		}
	}

	private _openConfirmationModal(
		event: EventType,
		currentUser: UserType,
		taskName: string,
		currentOrganizers: OrganizerType[],
		userIndex: number,
		newUserTasks: string[]
	) {
		const remainingOrganizersForEvent = currentOrganizers.filter(
			(org) => org.id !== currentUser.id || newUserTasks.length > 0
		);
		const isLastOrganizer = remainingOrganizersForEvent.length === 0;

		modalState.confirm = {
			isOpen: true,
			data: {
				title: "Confirmer la désinscription",
				message: isLastOrganizer
					? `Vous êtes le/la dernier·e organisateur·ice pour cet événement (${taskName}). Si l'événement doit avoir lieu bientôt, songez à l'annuler. Veuillez confirmer votre désinscription.`
					: `L'événement "${event.event_title}" est confirmé. Êtes-vous sûr·e de vouloir vous désinscrire de la tâche "${taskName}" ?`,
				variant: isLastOrganizer ? "danger" : "warning",
				showCheckbox: {
					label: "Prévenir les autres organisateur·ices de l'événement",
					checked: true // Pré-coché par défaut
				},
				// 👉 Potentiellement ajouter un input pour message perso ici si l'UI du modal est adaptée
				// showTextInput: { label: "Message personnalisé (optionnel):", value: "" },
				...(isLastOrganizer && {
					showCancelEventButton: {
						label: "Annuler l'événement",
						onCancelEvent: async () => {
							try {
								await updateEvent(event.id, { canceled: true });
								modalState.confirm.isOpen = false;
								// TODO: Afficher notification succès annulation
							} catch (err) {
								console.error("Erreur lors de l'annulation de l'événement:", err);
								// TODO: Afficher notification erreur annulation
							}
						}
					}
				}),
				// 👉 Correction type + ajout customMessage (si le modal le fournit)
				onConfirm: async (notifyOthers?: boolean, customMessage?: string) => {
					// Appelle la fonction qui gère la mise à jour et la notification
					await this._performUnsubscription(
						event,
						currentUser,
						taskName,
						currentOrganizers,
						userIndex,
						newUserTasks,
						notifyOthers === true,
						customMessage
					);
				}
			}
		};
	}

	private async _performUnsubscription(
		event: EventType,
		currentUser: UserType,
		taskName: string, // Nom de la tâche spécifique quittée
		currentOrganizers: OrganizerType[],
		userIndex: number,
		newUserTasks: string[],
		notifyOthers: boolean,
		customMessage?: string // Message personnalisé optionnel
	) {
		let finalOrganizers: OrganizerType[];
		if (newUserTasks.length === 0 && userIndex !== -1) {
			// L'utilisateur n'a plus de tâches, on le retire des organisateurs
			finalOrganizers = currentOrganizers.filter((org) => org.id !== currentUser.id);
		} else if (userIndex !== -1) {
			// Met à jour la liste des tâches de l'utilisateur
			finalOrganizers = currentOrganizers.map((org) =>
				org.id === currentUser.id ? { ...org, tasks: newUserTasks } : org
			);
		} else {
			// Cas improbable où l'index n'est pas trouvé mais on tente une désinscription
			finalOrganizers = currentOrganizers;
			console.warn(
				`_performUnsubscription: User index not found for user ${currentUser.id} in event ${event.id}`
			);
		}

		try {
			// Mettre à jour l'événement dans PocketBase
			// Passer skipAutoConfirm=true seulement si l'événement était déjà confirmé pour éviter de le déconfirmer par erreur
			await this.#updateEventOrganizers(event, finalOrganizers, event.isConfirmed);
		} catch (updateError) {
			console.error(`Failed to update organizers for event ${event.id}:`, updateError);
			// TODO: Informer l'utilisateur de l'échec de la mise à jour
			return; // Ne pas envoyer de notification si la mise à jour échoue
		}

		// Envoyer la notification si demandé
		if (notifyOthers) {
			try {
				// 1. Générer le contenu de l'email
				const subject = `[Oupla] Désinscription d'un·e organisateur·ice : ${event.event_title}`;
				// Formatage simple, on pourrait utiliser une fonction formatDate depuis utils.js si partagée
				const eventDateStr = event.date_event
					? new Date(event.date_event).toLocaleDateString("fr-FR")
					: "date inconnue";
				let htmlBody = `
                    <p>Bonjour,</p>
                    <p>L'utilisateur·ice <b>${currentUser.username}</b> s'est désinscrit·e de la tâche "<b>${taskName}</b>" pour l'événement "<b>${event.event_title}</b>" prévu le ${eventDateStr}.</p>

                `;

				// Ajouter le message personnalisé s'il existe
				if (customMessage && customMessage.trim() !== "") {
					// Échapper le HTML potentiel pour la sécurité
					const escapedCustomMessage = customMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;");
					htmlBody = `
                        <p><b>Message de ${currentUser.username} :</b></p>
                        <blockquote style="padding-left: 1em; border-left: 3px solid #ccc; margin-left: 0.5em; font-style: italic;">
                            ${escapedCustomMessage.replace(/\n/g, "<br>")}
                        </blockquote>
                        <p style="margin-top: 1em;">---</p>
                        ${htmlBody}
                    `;
				}

				htmlBody += `<p style="margin-top: 1.5em;">Cordialement,<br>L'équipe Oupla</p>`;

				// 2. Définir la stratégie de destinataires basée sur isRecurrent
				let recipientGroups: GenericEmailPayload["recipientGroups"] = [];
				let fallbackRecipientGroups: GenericEmailPayload["fallbackRecipientGroups"] = [
					"spaceAdmins"
				]; // Fallback commun

				if (event.isRecurrent) {
					recipientGroups = ["recurrenceTeam"]; // Cible l'équipe de récurrence
				} else {
					recipientGroups = ["otherOrganizers"]; // Cible les autres organisateurs directs
				}

				const payload: GenericEmailPayload = {
					subject: subject,
					htmlContent: htmlBody,
					recipientGroups,
					fallbackRecipientGroups,
					context: {
						eventId: event.id,
						excludeUserId: currentUser.id // Exclure la personne qui se désinscrit
					}
				};

				// 3. Appeler la fonction d'envoi générique
				console.log("Preparing email payload with context:", {
					eventId: event.id,
					excludeUserId: currentUser.id
				});
				await sendGenericEmail(payload);
			} catch (err) {
				console.error("Erreur lors de la préparation/envoi de la notification:", err);
				// Optionnel: Afficher une erreur à l'utilisateur que la notification n'a pas pu être envoyée
			}
		}
	}

	private async _handleGenericTaskSubscription(
		event: EventType,
		currentUser: UserType,
		currentOrganizers: OrganizerType[],
		userIndex: number,
		userTasks: string[]
	) {
		const availableTaskNames: string[] = event.tasks.map((task) => task.name);

		if (event.tasks.length === 1) {
			// Cas : Une seule tâche, on simule une souscription/désouscription spécifique
			await this.manageTaskSubscription(event, currentUser, event.tasks[0].name);
		} else if (availableTaskNames.length > 1) {
			// Cas : Plusieurs tâches, ouvrir le modal de sélection
			const availableTaskConfigs = getSpace.tasks.filter((taskConfig) =>
				availableTaskNames.includes(taskConfig.name)
			);

			openTaskModal({
				username: currentUser.username,
				tasks: availableTaskConfigs,
				selectedTasks: userTasks, // Tâches actuelles de l'utilisateur
				onSubmit: async (selectedTaskNames: string[]) => {
					let updatedOrganizersViaModal: OrganizerType[];
					const hadTasksBefore = userIndex !== -1 && currentOrganizers[userIndex].tasks.length > 0;
					const hasTasksAfter = selectedTaskNames.length > 0;

					if (hasTasksAfter) {
						// L'utilisateur a sélectionné au moins une tâche (ou a gardé ses tâches)
						if (userIndex !== -1) {
							// Mettre à jour les tâches de l'organisateur existant
							updatedOrganizersViaModal = currentOrganizers.map((org) =>
								org.id === currentUser.id ? { ...org, tasks: selectedTaskNames } : org
							);
						} else {
							// Ajouter le nouvel organisateur avec ses tâches sélectionnées
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
						// L'utilisateur a désélectionné toutes les tâches
						if (userIndex !== -1) {
							// Retirer l'utilisateur de la liste des organisateurs
							updatedOrganizersViaModal = currentOrganizers.filter(
								(org) => org.id !== currentUser.id
							);

							// Gérer la désinscription complète si l'événement est confirmé
							if (event.isConfirmed && hadTasksBefore) {
								// Ouvrir le modal de confirmation pour la désinscription complète
								// On utilise la première tâche qu'il avait comme "raison" pour le message, ou une note générique
								const pseudoTaskName = currentOrganizers[userIndex].tasks[0] || "ses tâches";
								this._openConfirmationModal(
									event,
									currentUser,
									pseudoTaskName,
									currentOrganizers,
									userIndex,
									[]
								);
								return; // L'action se fera via le modal de confirmation
							}
						} else {
							// L'utilisateur n'était pas organisateur et n'a rien sélectionné
							updatedOrganizersViaModal = currentOrganizers;
						}
					}
					// Mettre à jour directement si pas de confirmation nécessaire
					await this.#updateEventOrganizers(
						event,
						updatedOrganizersViaModal,
						event.isConfirmed && !hasTasksAfter && hadTasksBefore
					);
				}
			});
		} else {
			// Cas : Aucune tâche définie pour l'événement
			console.warn(`Aucune tâche définie pour l'événement ${event.id}, impossible de s'inscrire.`);
			// TODO: Afficher une notification à l'utilisateur ?
		}
	}

	// --- Main Method ---
	async manageTaskSubscription(
		event: EventType,
		currentUser: UserType,
		taskName?: string // Tâche spécifique ciblée (optionnel)
	) {
		// Vérifications initiales
		if (!event || !currentUser) {
			console.error(
				"Données invalides pour manageTaskSubscription: événement ou utilisateur manquant."
			);
			return;
		}
		// Vérifier s'il y a des tâches définies pour l'événement, sauf si on se désinscrit d'une tâche spécifique
		if (!taskName && (!event.tasks || event.tasks.length === 0)) {
			console.warn(`Tentative d'inscription à un événement sans tâches définies: ${event.id}`);
			// Optionnel: Afficher une notification à l'utilisateur
			// toastStore.addToast({ type: 'warning', message: "Cet événement n'a pas de tâches définies." });
			return;
		}

		// Préparation des données
		const currentOrganizers: OrganizerType[] = Array.isArray(event.organizers)
			? event.organizers.map((org) => ({
					// Copie profonde simple
					id: org.id,
					username: org.username,
					tasks: Array.isArray(org.tasks) ? [...org.tasks] : []
				}))
			: [];
		const userIndex = currentOrganizers.findIndex((org) => org.id === currentUser.id);
		const userTasks = userIndex !== -1 ? currentOrganizers[userIndex].tasks : [];

		// Routage vers les helpers
		if (taskName) {
			await this._handleSpecificTaskSubscription(
				event,
				currentUser,
				taskName,
				currentOrganizers,
				userIndex,
				userTasks
			);
		} else {
			await this._handleGenericTaskSubscription(
				event,
				currentUser,
				currentOrganizers,
				userIndex,
				userTasks
			);
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
			console.error("Erreur lors de la mise à jour des organisateurs :", error);
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
