import { pb } from "$lib/pocketbase.svelte";
import type {
	SitePagesResponse,
	SpacesOptionsResponse,
	SpacesResponse
} from "$lib/types/pocketbase";
import { getDefaultThemeOptions, type PublicSiteThemeOptions } from "$lib/types/theme.d";

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

// export interface PublicSpaceInfo extends SpacesResponse { // Étendre SpacesResponse est plus sûr
// Tu peux ajouter des champs spécifiques ici si nécessaire,
// mais hériter de SpacesResponse est souvent suffisant.
// id: string;
// name: string;
// title?: string; // title n'existe pas dans SpacesResponse par défaut
// description: string;
// categories: string[]; // Vient de spaces_options
// rooms: string[]; // Vient de spaces_options
// public_site: boolean; // Vient de spaces_options
// }

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
let layoutSitePages = $state<SitePagesResponse[]>([]);
let isLoading = $state(false);
let error = $state<string | null>(null);
let themeOptions = $state<PublicSiteThemeOptions>(getDefaultThemeOptions()); // Initialiser avec les défauts
let currentSpaceName: string | null = $state(null); // Pour suivre l'espace actuel

const layoutSections = ["leftSide", "top", "rightSide", "footer"];
// --- Main Loading Function ---
/**
 * Charge toutes les données publiques nécessaires pour un espace donné.
 * Inclut les infos de l'espace, les options de thème, les événements, et les pages de layout.
 * @param spaceName - Le nom (slug) ou l'ID de l'espace.
 */
async function loadPublicData(spaceName: string): Promise<void> {
	if (!spaceName || spaceName === currentSpaceName) {
		if (spaceName === currentSpaceName) return; // Strictement éviter le rechargement si même nom
	}

	// 👉 Gérer l'état global de chargement/erreur ici
	isLoading = true;
	error = null;
	currentSpaceName = spaceName;

	try {
		// Nettoyer le store avant de charger de nouvelles données
		clearStore();
		// 1. Récupérer l'ID et les infos de base de l'espace
		const fetchedSpaceInfo = await pb
			.collection("spaces")
			.getFirstListItem<SpacesResponse>(`name="${spaceName}"`);

		spaceInfo = {
			id: fetchedSpaceInfo.id,
			name: fetchedSpaceInfo.name,
			url: fetchedSpaceInfo.name, // Utiliser le nom comme URL par défaut
			description: fetchedSpaceInfo.description || "",
			categories: [],
			rooms: [],
			public_site: false
		};
		if (!spaceInfo) {
			throw new Error(`Espace "${spaceName}" non trouvé.`);
		}
		const spaceId = spaceInfo.id;
		console.log("spaceId", spaceId);

		// 2. Récupérer les options et vérifier l'accès public
		try {
			const fetchedSpaceOptions = await pb
				.collection("spaces_options")
				.getFirstListItem<SpacesOptionsResponse>(`space="${spaceId}"`, {
					// expand: 'space',
					fields:
						"categories,rooms,public_site,space,expand.space.name,expand.space.description,publicSiteTheme"
				});

			const loadedTheme = fetchedSpaceOptions?.publicSiteTheme as
				| Partial<PublicSiteThemeOptions>
				| undefined;

			themeOptions = {
				...getDefaultThemeOptions(),
				...(loadedTheme ?? {}),
				// Assurer la fusion profonde pour les objets imbriqués
				eventCard: {
					...getDefaultThemeOptions().eventCard,
					...(loadedTheme?.eventCard ?? {})
				},
				layoutSections: {
					...getDefaultThemeOptions().layoutSections,
					...(loadedTheme?.layoutSections ?? {})
				},
				components: {
					...getDefaultThemeOptions().components,
					...(loadedTheme?.components ?? {})
				}
			};

			if (themeOptions && themeOptions.defaultMode === "dark") {
				themeOptions.daisyTheme = themeOptions.daisyThemeDark;
			}

			// On pourrait aussi stocker categories/rooms/public_site dans spaceInfo si nécessaire
			if (spaceInfo) {
				spaceInfo.categories = Array.isArray(fetchedSpaceOptions.categories)
					? fetchedSpaceOptions.categories
					: [];
				spaceInfo.rooms = Array.isArray(fetchedSpaceOptions.rooms) ? fetchedSpaceOptions.rooms : [];
				spaceInfo.public_site = fetchedSpaceOptions.public_site || false;
			}
		} catch (e: unknown) {
			if (typeof e === "object" && e !== null && "status" in e && e.status === 404) {
				console.warn(`[PublicStore] Options not found for space ${spaceId}. Using default theme.`);
				themeOptions = getDefaultThemeOptions(); // Assurer les défauts si options non trouvées
			} else {
				throw e; // Relancer les autres erreurs de chargement des options
			}
		}

		// const fetchMenusSite = await pb.collection("site_pages").getFullList<SitePagesRecord>({
		// 	filter: `space="${spaceId}" && componentType="navigationMenu" `,
		// 	sort: "pos",
		// 	fields: "id,title,section,pos,componentConfig"
		// });

		// 3. Récupérer les événements publics
		const fetchedEvents = await pb.collection("events").getFullList<PublicEventInfo>({
			filter: `space="${spaceId}" && isConfirmed=true && date_event>="${new Date().toISOString().split("T")[0]}"`,
			sort: "date_event,start_public",
			fields:
				"id,event_title,date_event,start_public,start_event, duree,categories,desc_public,is_prix_libre,prix,isMixiteChoisie,mixite,is_age_no_restriction,age_advice,canceled,image"
		});

		spaceEvents = fetchedEvents as PublicEventInfo[];
		// console.log(`[publicStore] ${events.length} événements chargés.`);

		// 5. Récupérer les SitePages pour le layout
		const sectionsFilter = layoutSections.map((s) => `section="${s}"`).join(" || ");
		const fetchedLayoutPages = await pb.collection("site_pages").getFullList<SitePagesResponse>({
			filter: `space="${spaceId}" && (${sectionsFilter})`,
			// Le tri par pos sera fait dans le composant via $derived, mais peut rester ici
			sort: "pos",
			fields: "id,title,content,section,componentConfig,pos"
		});

		layoutSitePages = fetchedLayoutPages;
	} catch (err) {
		console.error("Erreur dans publicStore.loadPublicData:", err);
		error =
			err instanceof Error ? err.message : "Une erreur inconnue est survenue lors du chargement";
		// Le store a déjà été vidé au début
	} finally {
		// 👉 Marquer la fin du chargement global
		isLoading = false;
		console.log(`[publicStore] loadPublicData terminé. isLoading: ${isLoading}, error: ${error}`);
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
	loadPublicData, // Expose la fonction de chargement principale
	clearStore,
	clearStoreAll
};
