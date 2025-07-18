import { pb } from "$lib/pocketbase.svelte";
import type { SitePagesResponse } from "$lib/types/pocketbase";
import { getDefaultThemeOptions, type PublicSiteThemeOptions } from "$lib/types/theme.d";
import {
	ComponentType,
	type SitePageResponse,
	type NavigationMenuResponse,
	type BlocResponse,
	type PageResponse
} from "$lib/types/publicSiteType";

// Type d'informations publiques sur un espace
export interface PublicSpaceInfo {
	id: string;
	name: string;
	url: string;
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
let layoutSitePages = $state<(SitePageResponse | SitePagesResponse)[]>([]);
let isLoading = $state(false);
let error = $state<string | null>(null);
let themeOptions = $state<PublicSiteThemeOptions>(getDefaultThemeOptions()); // Initialiser avec les défauts
let currentSpaceName: string | null = $state(null); // Pour suivre l'espace actuel

const layoutSections = ["leftSide", "top", "rightSide", "footer"];
// --- Main Loading Function ---
// Désormais, le store ne charge plus les infos d'espace ni le thème : ils sont préchargés par le layout.
// Le store se concentre sur les événements et autres données dynamiques.

/**
 * Charge les événements publics et les pages de layout pour un espace donné.
 * @param spaceId - L'ID de l'espace (doit être fourni par le layout ou la page)
 */
async function loadPublicEventsAndLayout(spaceId: string): Promise<void> {
	if (!spaceId || spaceId === currentSpaceName) {
		if (spaceId === currentSpaceName) return; // Strictement éviter le rechargement si même espace
	}

	isLoading = true;
	error = null;
	currentSpaceName = spaceId;

	try {
		clearStore();

		// 1. Récupérer les événements publics
		const fetchedEvents = await pb.collection("events").getFullList<PublicEventInfo>({
			filter: `space="${spaceId}" && isConfirmed=true && date_event>="${new Date().toISOString().split("T")[0]}"`,
			sort: "date_event,start_public",
			fields:
				"id,event_title,date_event,start_public,start_event, duree,categories,desc_public,is_prix_libre,prix,isMixiteChoisie,mixite,is_age_no_restriction,age_advice,canceled,image"
		});

		spaceEvents = fetchedEvents as PublicEventInfo[];

		// 2. Récupérer les SitePages pour le layout
		const sectionsFilter = layoutSections.map((s) => `section="${s}"`).join(" || ");
		const fetchedLayoutPages = await pb.collection("site_pages").getFullList<SitePagesResponse>({
			filter: `space="${spaceId}" && (${sectionsFilter})`,
			sort: "pos",
			fields: "id,title,content,section,componentConfig,componentType,pos"
		});

		layoutSitePages = fetchedLayoutPages.map((page) => {
			if (page.componentType && page.componentConfig) {
				return typeSitePageComponent(page);
			}
			return page;
		});
	} catch (err) {
		console.error("Erreur dans publicStore.loadPublicEventsAndLayout:", err);
		error =
			err instanceof Error ? err.message : "Une erreur inconnue est survenue lors du chargement";
	} finally {
		isLoading = false;
	}
}

// --- Utility Functions ---

/**
 * Convertit une SitePagesResponse en type discriminé selon son componentType
 */
function typeSitePageComponent(page: SitePagesResponse): SitePageResponse | SitePagesResponse {
	if (!page.componentType || !page.componentConfig) {
		return page;
	}

	switch (page.componentType) {
		case ComponentType.navigationMenu:
			return {
				...page,
				componentType: ComponentType.navigationMenu,
				componentConfig: page.componentConfig as NavigationMenuResponse["componentConfig"]
			} as NavigationMenuResponse;

		case ComponentType.bloc:
			return {
				...page,
				componentType: ComponentType.bloc,
				componentConfig: page.componentConfig as BlocResponse["componentConfig"]
			} as BlocResponse;

		case ComponentType.page:
			return {
				...page,
				componentType: ComponentType.page,
				componentConfig: page.componentConfig as PageResponse["componentConfig"]
			} as PageResponse;

		default:
			// Si le type n'est pas reconnu, retourner tel quel
			return page;
	}
}

// --- Clear Function ---
function clearStore() {
	console.log("[publicStore] Clearing store...");
	spaceInfo = null;
	spaceEvents = [];
	layoutSitePages = [];
	isLoading = false;
	error = null;
}

// Vide tout, peut être appelé de l'extérieur ou en cas d'erreur majeure
function clearStoreAll() {
	console.log("[publicStore] Clearing store completely...");
	clearStore();
	themeOptions = getDefaultThemeOptions();
	isLoading = false;
	error = null;
	currentSpaceName = null;
}

// --- Exported Store Object ---
export const publicStore = {
	// Getters pour l'accès externe
	get spaceInfo() {
		return spaceInfo;
	},
	get spaceEvents() {
		return spaceEvents;
	},
	get themeOptions() {
		return themeOptions;
	},
	get layoutSitePages() {
		return layoutSitePages;
	},
	get isLoading() {
		return isLoading;
	},
	get error() {
		return error;
	},

	// Méthodes exposées
	loadPublicEventsAndLayout,
	clearStore,
	clearStoreAll
};
