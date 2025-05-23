//============================================================================
// DEFINITIONS DES TYPES CENTRAUX DU PROJET
// Centralise les types utilisés dans plusieurs modules.
//============================================================================

export type {
	MessagesResponse,
	EventsResponse,
	Collections, // Utile pour les noms de collections PocketBase
	UsersResponse, // Utile pour typer les utilisateurs PocketBase
	SpaceMembersResponse, // Le type brut de l'enregistrement spaceMembers
	SpacesOptionsResponse, // Le type brut de l'enregistrement spaces_options
	SitePagesResponse, // Le type brut de l'enregistrement site_pages
	SpacesResponse // Le type brut de l'enregistrement spaces
	// Ajoutez d'autres types de pocketbase.ts si nécessaire
} from "./pocketbase";

export type {
	SpaceConfig, // La config de l'espace gérée par spJaceOptions.svelte
	SpaceUser, // Le format simplifié des membres de l'espace
	SpaceDetails, // Détails de base d'un espace
	SpaceOptionsType // Le type des données stockées dans le champ 'options' de spaces_options
} from "./spaceOptions";

export type {
	EventType, // Le type complet d'un événement (probablement basé sur EventsResponse + client-side logic)
	OrganizerType, // Le type d'un organisateur d'événement
	TaskType, // Le type d'une tâche pour un événement
	DateProposedType,
	ValidMaster,
	ValidOccurrence,
	RecurrenceType, // Type pour les différentes options de récurrence (WEEKLY, BIWEEKLY, etc.)
	RecurrenceSchemaType, // Type pour le schéma de récurrence complet
	ValidRecurrence // Type pour une récurrence valide (non-null)
} from "$lib/schemas/event.schema";

export type {
	EventConflict, // Le type complet d'un conflit d'événement
	EventConflictInfo // Le type complet d'un conflit d'événement
} from "$lib/shared/eventsStore.svelte";

export type {
	ConfirmModalData, // Données pour le modal de confirmation
	ModalStateType // État global des modals
} from "$lib/shared/states.svelte";

export type {
	PublicSpaceInfo, // Infos publiques de l'espace
	PublicEventInfo // Infos des événements publics
} from "$lib/shared/publicStore.svelte";

export * from "./pocketbase";
// export * from '$lib/schemas/event.schema';

export interface UserType {
	id: string;
	username: string;
	email: string;
	currentRole: string;
	verified: boolean;
	memberOf: Array<{
		id: string;
		name: string;
		role: string;
		description?: string;
		since?: string;
	}>;
	currentSpace: {
		id: string;
		name: string;
		role: string;
		description?: string;
		since?: string;
	} | null;
}

export interface SpaceMember {
	user: string;
	space: string;
	role: string;
	created?: string;
	expand?: {
		space: {
			id: string;
			name: string;
			description?: string;
		};
	};
}

export interface CurrentUser {
	id: string;
	username: string;
	role: string;
}
