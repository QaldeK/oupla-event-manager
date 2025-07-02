//============================================================================
// API PUBLIQUE DU MODULE LIB/SHARED
// Centralise les exports pour simplifier les imports dans le reste de l'app.
//============================================================================

// --- userDb.svelte.ts ---
// Gère l'état de l'utilisateur authentifié et les opérations liées à l'auth.
export { userDb } from "./userDb.svelte";

// --- spaceOptions.svelte.ts ---
// Gère la configuration et les options spécifiques à l'espace courant.
export {
	getSpace, // L'objet réactif pour accéder à la config de l'espace
	loadSpaceOptions, // Fonction pour charger la config complète de l'espace (authentifié)
	getPublicSpaceInfo // Fonction pour charger les infos publiques de l'espace
} from "./spaceOptions.svelte";

//  --- eventsStore.svelte.ts ---
export { eventsStore } from "./eventsStore.svelte";

// --- states.svelte.ts ---
// Gère les états UI globaux (modals, alerts, display, etc.) et quelques helpers liés à l'utilisateur/permissions.
export {
	modalState, // État réactif pour la gestion des modals
	openTaskModal, // Helper pour ouvrir le modal de sélection des tâches
	eventState, // État réactif pour l'événement en cours d'édition
	getOrganizersPossibles, // Fonction pour obtenir la liste des organisateurs possibles
	alert, // État réactif pour l'affichage des alertes/toasts
	showAlert, // Helper pour afficher une alerte
	displayState, // État réactif pour la taille de l'écran (mobile/desktop)
	messageSheet // État réactif pour la feuille de messages/chat
} from "./states.svelte";

// --- publicStore.svelte.ts ---
// Gère les données spécifiques à l'affichage public d'un espace.
export {
	publicStore // L'objet réactif pour accéder aux données publiques de l'espace
} from "./publicStore.svelte";

// --- sitePageStore.svelte.ts ---
// Gère les documents/pages de contenu spécifiques à un espace.
// export {
// 	subscribeToPagesUpdates, // S'abonne aux mises à jour en temps réel des pages
// 	getPages, // Obtient les pages actuellement chargées
// 	loadDocs, // Charge une liste de pages depuis PocketBase (filtrable)
// 	loadDoc, // Charge une page spécifique par ID
// 	createPad, // Crée une nouvelle page
// 	updatePad, // Met à jour une page existante
// 	deletePad, // Supprime une page
// 	acquirePadLock, // Acquiert un verrou d'édition sur une page
// 	releasePadLock, // Libère un verrou d'édition
// 	refreshPadLock // Rafraîchit le timestamp d'un verrou d'édition
// 	// Note: SitePagesType n'est pas exporté depuis sitePageStore.svelte.ts.
// 	// Si nécessaire, exportez SitePagesResponse depuis $lib/types/pocketbase
// 	// ou définissez un type public dans $lib/types/sitePages.ts
// } from "./sitePageStore.svelte";
