import type { BaseSystemFields } from "./pocketbase";

/**
 * Représente la structure d'un événement archivé dans la collection `events_past`.
 *
 * Ce type est une version allégée de `EventType`, contenant uniquement les champs
 * conservés par le script d'archivage `cron_archive_events.pb.js`.
 * Il est utilisé pour la page des archives afin d'éviter de charger des données inutiles
 * et de manipuler des champs qui n'existent plus pour les événements passés.
 */
export type ArchivedEventType = BaseSystemFields & {
	space?: string;
	event_title?: string;
	date_event?: string; // Format "YYYY-MM-DD HH:mm:ss.SSSZ"
	isRecurrent?: boolean;
	masterRecurrentId?: string;
	created_by?: string;
	organizer?: string; // L'organisateur principal (relation User ID). Note: ce n'est pas la liste 'organizers'.
	isPublic?: boolean;
	isConfirmed?: boolean;
	start_public?: string; // Texte libre pour l'horaire public
	desc_public?: string; // Description publique
	categories?: string[];
	// Champs qui ne sont PAS archivés :
	// - description (interne)
	// - time_start, time_end
	// - rooms
	// - tasks
	// - organizers (la liste JSON des inscrits)
	// - dates_proposed (sondage)
	// - recurrence (détails de la récurrence)
	// etc.
};
