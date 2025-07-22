import type { EventType, ValidMaster } from "$lib/types/event.types";
import type { UserType } from "$lib/types/types";
import { SyncStore } from "$lib/shared/syncState.svelte";
import { Collections } from "$lib/types/pocketbase";
import {
	getOverlappingEventGroups,
	buildEventTimeInfoMap,
	type EventConflictInfo,
	type EventTimeInfo
} from "$lib/services/eventConflicts";
import { SvelteSet, SvelteMap } from "svelte/reactivity";

// Type compatible avec StoreRecord pour SyncStore
type EventStoreRecord = {
	id: string;
	created: string;
	updated: string;
	collectionId: string;
	collectionName: string;
	[key: string]: unknown;
};
import { format } from "date-fns";

import { userDb } from "./userDb.svelte";

// Types exportés depuis le service
export type { EventConflictInfo } from "$lib/services/eventConflicts";

// Interface pour l'initialisation du store
export interface EventsStoreInitConfig {
	spaceId: string;
	mode: "internal" | "external";
}

const userId = $derived(userDb?.current?.id);

class EventsStore {
	#store = $state({
		syncStore: null as SyncStore<EventStoreRecord> | null,
		recentEventsLoader: null as ReturnType<SyncStore<EventStoreRecord>["createLazyLoader"]> | null,
		isInitialized: false,
		error: null as Error | null,
		initPromise: null as Promise<void> | null,
		mode: null as "internal" | "external" | null
	});

	async init({ spaceId, mode }: EventsStoreInitConfig) {
		if (this.#store.initPromise) return this.#store.initPromise;

		this.#store.initPromise = (async () => {
			const dbName = "eventsStore"; //= mode === 'external' ? 'events-public' : 'events-dashboard';

			const filter = `space = '${spaceId}' && (date_event = "" || date_event >= '${new Date().toISOString().split("T")[0]}')`;

			const syncStore = new SyncStore<EventStoreRecord>({
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
				this.#store.recentEventsLoader = syncStore.createLazyLoader({
					batchSize: 6,
					sortFn: (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
				});
				this.#store.mode = mode;
				this.#store.isInitialized = true;
			} catch (err: unknown) {
				console.error("Erreur initialisation SyncStore:", err);
				this.#store.error = err instanceof Error ? err : new Error(String(err));
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

	// :::  getters

	// Optimisation : Calcul centralisé de toutes les catégories d'événements en une seule passe
	#categorizedEvents = $derived.by(() => {
		if (!this.#store.syncStore) {
			return {
				all: [] as EventType[],
				master: [] as ValidMaster[],
				withDate: [] as EventType[],
				withoutDate: [] as EventType[],
				confirmed: [] as EventType[],
				unconfirmed: [] as EventType[],
				confirmable: [] as EventType[],
				withSondage: [] as EventType[],
				withoutDateProposition: [] as EventType[],
				withoutOrganizers: [] as EventType[],
				occurences: [] as EventType[]
			};
		}

		const allRecords = this.#store.syncStore.allRecords as EventType[];

		// Tri et filtre des événements principaux
		const all = allRecords
			.filter((e) => !e.isMasterRecurrent)
			.sort((a: EventType, b: EventType) => {
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

		// Événements maîtres (récurrents)
		const master = allRecords.filter(
			(e): e is ValidMaster =>
				e.isMasterRecurrent && e.recurrence !== null && e.recurrence !== undefined
		);

		// Initialisation des catégories
		const categorized = {
			all,
			master,
			withDate: [] as EventType[],
			withoutDate: [] as EventType[],
			confirmed: [] as EventType[],
			unconfirmed: [] as EventType[],
			confirmable: [] as EventType[],
			withSondage: [] as EventType[],
			withoutDateProposition: [] as EventType[],
			withoutOrganizers: [] as EventType[],
			occurences: [] as EventType[]
		};

		// Parcours unique pour catégoriser tous les événements
		for (const event of all) {
			// Catégorisation par date
			if (event.date_event) {
				categorized.withDate.push(event);
				// Les événements confirmables sont ceux avec date mais non confirmés
				if (!event.isConfirmed) {
					categorized.confirmable.push(event);
				}
				// Les occurrences sont ceux avec date et récurrents
				if (event.isRecurrent) {
					categorized.occurences.push(event);
				}
			} else {
				categorized.withoutDate.push(event);
			}

			// Catégorisation par statut de confirmation
			if (event.isConfirmed) {
				categorized.confirmed.push(event);
			} else {
				categorized.unconfirmed.push(event);
			}

			// Catégorisation par organisateurs
			if (Array.isArray(event.organizers) && event.organizers.length === 0) {
				categorized.withoutOrganizers.push(event);
			}

			// Catégorisation par dates proposées (sondages)
			if (Array.isArray(event.dates_proposed)) {
				if ((event.dates_proposed?.length ?? 0) > 0) {
					categorized.withSondage.push(event);
				} else if (event.dates_proposed?.length === 0) {
					categorized.withoutDateProposition.push(event);
				}
			}
		}

		return categorized;
	});

	// Exposition des propriétés dérivées optimisées
	allEvents = $derived(this.#categorizedEvents.all);
	allMasterEvents = $derived(this.#categorizedEvents.master);
	eventsWithDate = $derived(this.#categorizedEvents.withDate);
	eventsWithoutDate = $derived(this.#categorizedEvents.withoutDate);
	confirmedEvents = $derived(this.#categorizedEvents.confirmed);
	unconfirmedEvents = $derived(this.#categorizedEvents.unconfirmed);
	confirmableEvents = $derived(this.#categorizedEvents.confirmable);
	eventsWithSondage = $derived(this.#categorizedEvents.withSondage);
	eventsWithoutDateProposition = $derived(this.#categorizedEvents.withoutDateProposition);
	eventsWithoutOrganizers = $derived(this.#categorizedEvents.withoutOrganizers);
	getEventsOccurences = $derived(this.#categorizedEvents.occurences);

	getEventById = $derived.by(() => (id: string): EventType | undefined => {
		if (!this.#store.syncStore) return undefined;
		return this.#store.syncStore.get(id) as EventType | undefined;
	});

	paginatedAllEvents = $derived.by(() => {
		// Note : `paginatedRecords` est déjà trié par `allEvents`
		return (this.#store.syncStore?.paginatedRecords as EventType[]) ?? [];
	});

	// 2. Exposer l'état de la pagination pour l'UI
	pagination = $derived.by(() => {
		if (!this.#store.syncStore) {
			return { currentPage: 1, totalPages: 1, pageSize: 20, totalRecords: 0 };
		}
		return {
			currentPage: this.#store.syncStore.currentPage,
			totalPages: this.#store.syncStore.totalPages,
			pageSize: this.#store.syncStore.pageSize,
			totalRecords: this.#store.syncStore.totalRecords
		};
	});

	// 3. Exposer les méthodes de contrôle
	setPage(page: number) {
		this.#store.syncStore?.setPage(page);
	}
	nextPage() {
		this.#store.syncStore?.nextPage();
	}
	previousPage() {
		this.#store.syncStore?.previousPage();
	}
	setPageSize(size: number) {
		this.#store.syncStore?.setPageSize(size);
	}

	// --- LAZY LOAD POUR ÉVÉNEMENTS RÉCENTS (maintenant ultra-simple) ---

	// On expose simplement les propriétés du loader que l'on a créé
	recentlyCreatedEvents = $derived.by(
		() => (this.#store.recentEventsLoader?.records as EventType[]) ?? []
	);
	hasMoreRecentEvents = $derived.by(() => this.#store.recentEventsLoader?.hasMore ?? false);
	loadMoreRecentEvents = () => {
		this.#store.recentEventsLoader?.loadMore();
	};
	resetRecentEventsPagination = () => {
		this.#store.recentEventsLoader?.reset();
	};

	// --- SERVICE USER EVENTS ---

	// Optimisation : Calcul centralisé des événements utilisateur
	#userCategorizedEvents = $derived.by(() => {
		if (!userId) {
			return {
				userEvents: [] as EventType[],
				userRecurrentEvents: [] as ValidMaster[],
				userSondageEvents: [] as EventType[],
				otherSondageEvents: [] as EventType[]
			};
		}

		const userEvents: EventType[] = [];
		const userRecurrentEvents: ValidMaster[] = [];
		const userSondageEvents: EventType[] = [];
		const userSondageEventIds = new SvelteSet<string>();

		// Parcours des événements principaux pour les organisateurs
		for (const event of this.#categorizedEvents.all) {
			if (
				!event.isRecurrent &&
				event.date_event &&
				event.organizers?.some((org) => org.id === userId)
			) {
				userEvents.push(event);
			}
		}

		// Parcours des événements maîtres pour les équipes récurrentes
		for (const event of this.#categorizedEvents.master) {
			if (event.recurrence?.recurrenceTeam?.some((member) => member?.id === userId)) {
				userRecurrentEvents.push(event);
			}
		}

		// Parcours des sondages pour les réponses utilisateur
		for (const event of this.#categorizedEvents.withSondage) {
			const hasUserResponse = event.dates_proposed?.some((dateProposal) =>
				dateProposal.organizers?.some(
					(org) => org.id === userId && (org.maybehere === "oui" || org.maybehere === "peut-être")
				)
			);

			if (hasUserResponse) {
				userSondageEvents.push(event);
				userSondageEventIds.add(event.id);
			}
		}

		// Autres sondages (sans réponse utilisateur)
		const otherSondageEvents = this.#categorizedEvents.withSondage.filter(
			(event) => !userSondageEventIds.has(event.id)
		);

		return {
			userEvents,
			userRecurrentEvents,
			userSondageEvents,
			otherSondageEvents
		};
	});

	// Exposition des propriétés utilisateur optimisées
	userEvents = $derived(this.#userCategorizedEvents.userEvents);
	userRecurrentEvents = $derived(this.#userCategorizedEvents.userRecurrentEvents);
	userSondageEvents = $derived(this.#userCategorizedEvents.userSondageEvents);
	otherSondageEvents = $derived(this.#userCategorizedEvents.otherSondageEvents);

	getEventsByDateTime = $derived.by<SvelteMap<string, EventConflictInfo[]>>(() => {
		const eventsByDateMap = new SvelteMap<string, EventConflictInfo[]>();

		// horaire par defaut inséré ensuite si non renseigné
		const getDefaultTimes = (isStart: boolean) => {
			return isStart ? "00:00" : "23:59";
		};

		for (const event of this.allEvents) {
			// Fonction utilitaire pour créer l'objet d'information
			const createEventInfo = (
				event: EventType,
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
					organizers: event.organizers || [],
					rooms: event.rooms || [],
					conflictType: event.isConfirmed ? "confirmed" : "unconfirmed",
					date_event: event.date_event || "",
					dateStart: dateStart || event.dateStart,
					dateEnd: dateEnd || event.dateEnd,
					time_start: timeStart || "",
					time_end: timeEnd || ""
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

	eventTimeInfoMap = $derived.by<SvelteMap<string, EventTimeInfo[]>>(() => {
		if (!this.#store.isInitialized) return new SvelteMap();
		// Assure-toi que allEvents contient bien les champs nécessaires
		// (id, title, rooms, organizers, isConfirmed, dateStart, dateEnd, date_event, time_start, time_end, dates_proposed)
		const result = buildEventTimeInfoMap(this.allEvents);
		// Conversion vers SvelteMap si nécessaire
		return result instanceof Map ? new SvelteMap(result) : result;
	});

	get isInitialized(): boolean {
		return this.#store.isInitialized;
	}

	get error(): Error | null {
		return this.#store.error;
	}

	/**
	 * Trouve tous les groupes d'événements qui se chevauchent pour chaque date
	 * @returns Une Map avec des clés au format "date_groupe" et des tableaux d'événements en conflit
	 */
	getOverlappingEventGroups = $derived.by<SvelteMap<string, EventConflictInfo[][]>>(() => {
		if (!this.#store.isInitialized) return new SvelteMap();

		const allEvents = this.allEvents;
		const result = getOverlappingEventGroups(allEvents);
		// Conversion vers SvelteMap si nécessaire
		return result instanceof Map ? new SvelteMap(result) : result;
	});

	/**
	 * Point d'entrée public pour demander une mise à jour de tâche depuis les composants Cartes.
	 * Orchestre l'action directe, l'ouverture de la modale de confirmation simple ou de TaskDialog.
	 */
	async requestTaskUpdate(params: { event: EventType; user: UserType; taskName?: string }) {
		const { requestTaskUpdate } = await import("$lib/shared/eventActionHandler.svelte");
		return await requestTaskUpdate(params);
	}

	/**
	 * Méthode de nettoyage pour détruire l'instance de SyncStore et réinitialiser l'état.
	 */
	async destroy() {
		if (this.#store.syncStore) {
			await this.#store.syncStore.destroy();
		}

		// Réinitialiser complètement l'état
		this.#store.syncStore = null;
		this.#store.recentEventsLoader = null;
		this.#store.isInitialized = false;
		this.#store.error = null;
		this.#store.initPromise = null;
		this.#store.mode = null;
	}
}

export const eventsStore = new EventsStore();
