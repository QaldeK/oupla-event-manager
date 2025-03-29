import { pb } from '$lib/pocketbase.svelte';
import type { EventType } from '$lib/schemas/event.schema';
import type { SpacesResponse } from '$lib/types/pocketbase';

// Type d'informations publiques sur un espace
export interface PublicSpaceInfo {
	id: string;
	name: string;
	title?: string;
	description: string;
	categories: string[];
	rooms: string[];
	public_site: boolean;
}

// Type pour un événement public (avec uniquement les champs nécessaires)
export interface PublicEventInfo {
	id: string;
	event_title: string;
	date_event: string;
	time_start: string;
	time_end: string;
	start_public: string;
	start_event: string;
	categories: string[];
	desc_public: string;
	is_prix_libre: boolean;
	prix: string | null;
	isMixiteChoisie: boolean;
	mixite: string | null;
	is_age_no_restriction: boolean;
	age_advice: string | null;
	canceled: boolean;
	isRecurrent: boolean;
	isMasterRecurrent: boolean;
	masterRecurrentId: string | null;
	image: string[] | null;
	duree: string | null;
	dateEnd: string | null;
	dateStart: string | null;
}

// Store pour les données publiques
let spaceInfo = $state<PublicSpaceInfo | null>(null);
let spaceEvents = $state<PublicEventInfo[]>([]);
let isLoading = $state(false);
let error = $state<string | null>(null);

/**
 * Charge les informations d'un espace public
 */
async function loadPublicSpaceInfo(spaceName: string): Promise<PublicSpaceInfo | null> {
	try {
		isLoading = true;
		error = null;

		// Récupérer l'ID de l'espace à partir du nom
		const spaceRecord = await pb.collection('spaces').getFirstListItem(`name="${spaceName}"`);

		if (!spaceRecord) {
			throw new Error("L'espace n'existe pas");
		}

		// Récupérer les options de l'espace
		const record = await pb
			.collection('spaces_options')
			.getFirstListItem(`space="${spaceRecord.id}"`, {
				expand: 'space',
				fields:
					'categories,rooms,public_site,space,expand.space.name,expand.space.description,expand.space.title'
			});

		if (!record.public_site) {
			throw new Error("Ce site n'est pas accessible publiquement");
		}

		const info = {
			id: record.space,
			name: record.expand?.space?.name || '',
			title: record.expand?.space?.title || '',
			description: record.expand?.space?.description || '',
			categories: record.categories || [],
			rooms: record.rooms || [],
			public_site: record.public_site
		};

		// On utilise la fonction setSpaceInfo au lieu d'assigner directement
		setSpaceInfo(info);
		return info;
	} catch (err) {
		console.error('Failed to load public space info:', err);
		error = err instanceof Error ? err.message : 'Erreur lors du chargement des données';
		return null;
	} finally {
		isLoading = false;
	}
}

/**
 * Charge les événements publics d'un espace
 */
async function loadPublicEvents(spaceId: string): Promise<PublicEventInfo[]> {
	try {
		isLoading = true;
		error = null;

		// Récupérer les événements publics et confirmés
		const events = await pb.collection('events').getFullList({
			filter: `space="${spaceId}" && isConfirmed=true && date_event>="${new Date().toISOString().split('T')[0]}" && canceled=false`,
			sort: 'date_event,time_start',
			fields:
				'id,event_title,date_event,time_start,time_end,start_public,start_event,categories,desc_public,is_prix_libre,prix,isMixiteChoisie,mixite,is_age_no_restriction,age_advice,canceled,isRecurrent,isMasterRecurrent,masterRecurrentId,image,duree,dateEnd,dateStart'
		});

		// Convertir en PublicEventInfo
		const publicEvents = events.map((event) => ({
			id: event.id,
			event_title: event.event_title,
			date_event: event.date_event,
			time_start: event.time_start,
			time_end: event.time_end,
			start_public: event.start_public,
			start_event: event.start_event,
			categories: event.categories || [],
			desc_public: event.desc_public,
			is_prix_libre: event.is_prix_libre,
			prix: event.prix,
			isMixiteChoisie: event.isMixiteChoisie,
			mixite: event.mixite,
			is_age_no_restriction: event.is_age_no_restriction,
			age_advice: event.age_advice,
			canceled: event.canceled,
			isRecurrent: event.isRecurrent,
			isMasterRecurrent: event.isMasterRecurrent,
			masterRecurrentId: event.masterRecurrentId,
			image: event.image,
			duree: event.duree,
			dateEnd: event.dateEnd,
			dateStart: event.dateStart
		}));

		// On utilise la fonction setSpaceEvents au lieu d'assigner directement
		setSpaceEvents(publicEvents);
		return publicEvents;
	} catch (err) {
		console.error('Failed to load public events:', err);
		error = err instanceof Error ? err.message : 'Erreur lors du chargement des événements';
		return [];
	} finally {
		isLoading = false;
	}
}

/**
 * Charge toutes les données publiques d'un espace
 */
async function loadPublicSpaceData(spaceName: string) {
	try {
		isLoading = true;
		error = null;

		const info = await loadPublicSpaceInfo(spaceName);
		if (info) {
			await loadPublicEvents(info.id);
		}

		return { spaceInfo, spaceEvents };
	} catch (err) {
		console.error('Error loading public space data:', err);
		error = err instanceof Error ? err.message : 'Erreur lors du chargement des données';
		return { spaceInfo: null, spaceEvents: [] };
	} finally {
		isLoading = false;
	}
}

/**
 * Définit les informations de l'espace
 */
function setSpaceInfo(info: PublicSpaceInfo | null) {
	spaceInfo = info;
}

/**
 * Définit les événements de l'espace
 */
function setSpaceEvents(events: PublicEventInfo[]) {
	spaceEvents = events;
}

/**
 * Définit l'état de chargement
 */
function setLoading(state: boolean) {
	isLoading = state;
}

/**
 * Définit le message d'erreur
 */
function setError(message: string | null) {
	error = message;
}

export const publicStore = {
	// Getters
	get spaceInfo() {
		return spaceInfo;
	},
	get spaceEvents() {
		return spaceEvents;
	},
	get isLoading() {
		return isLoading;
	},
	get error() {
		return error;
	},

	// Setters (ajoutés)
	setSpaceInfo,
	setSpaceEvents,
	setLoading,
	setError,

	// Méthodes
	loadPublicSpaceInfo,
	loadPublicEvents,
	loadPublicSpaceData
};
