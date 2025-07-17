// import Device from 'svelte-device-info'; // TODO ? npm install svelte-device-info

// export const eventsList = $state();

import { getNewEvent } from "$lib/services/eventActions";
import { getSpace } from "$lib/shared/spaceOptions.svelte";
import { type TaskType } from "$lib/types/event.types";

import type { LogsResponse, UsersResponse } from "$lib/types/pocketbase";

export interface ConfirmModalData {
	title: string;
	message: string;
	variant?: "warning" | "info" | "danger";
	confirmLabel?: string;
	showCheckbox?: {
		label: string;
		checked: boolean;
	};
	showCancelEventButton?: {
		label: string;
		onCancelEvent: () => void | Promise<void>;
	};
	additionalButton?: {
		label: string;
		variant?: "primary" | "secondary" | "accent" | "ghost" | "success" | "warning" | "error";
		onClick: () => void | Promise<void>;
	};
	showCancelButton?: boolean;
	onConfirm: ((notifyOthers?: boolean, customMessage?: string) => void | Promise<void>) | null;
}
// Interface pour TaskDialog (Gestion multiple)
export interface TaskModalData {
	username: string;
	tasksAvailable: TaskType[];
	selectedTaskNames: string[];
	eventIsConfirmed: boolean; // Utile pour affichage informatif dans TaskDialog
	eventId?: string;
	organizers: Array<{ id: string; username: string; tasks: string[] }>;
	onSubmit: ((result: string[], notifyOthers?: boolean) => void | Promise<void>) | null;
}

export interface ModalStateType {
	dateSondage: boolean;
	organizers: boolean;
	event: boolean;
	report: boolean;
	inviteUser: boolean;
	tasks: {
		// Pour TaskDialog (multiple)
		isOpen: boolean;
		data: TaskModalData;
	};
	confirm: {
		// Pour confirmation simple
		isOpen: boolean;
		data: ConfirmModalData;
	};
}

export const modalState = $state<ModalStateType>({
	dateSondage: false,
	organizers: false,
	event: false,
	report: false,
	inviteUser: false,
	tasks: {
		isOpen: false,
		data: {
			username: "",
			tasksAvailable: [],
			selectedTaskNames: [],
			eventIsConfirmed: false,
			organizers: [],
			onSubmit: null
		}
	},
	confirm: {
		isOpen: false,
		data: {
			title: "",
			message: "",
			variant: "info",
			onConfirm: null as ((notifyOthers?: boolean, customMessage?: string) => void) | null // XXX just "null" ?
		}
	}
});

export const isBenevoleModal = $state({
	open: false
});

export const openTaskModal = (params: {
	username: string;
	tasksAvailable: TaskType[];
	selectedTaskNames: string[];
	eventIsConfirmed: boolean;
	eventId?: string;
	organizers: Array<{ id: string; username: string; tasks: string[] }>;
	onSubmit: (result: string[], notifyOthers?: boolean) => void | Promise<void>;
}) => {
	modalState.tasks = {
		isOpen: true,
		data: {
			username: params.username,
			tasksAvailable: $state.snapshot(params.tasksAvailable),
			selectedTaskNames: params.selectedTaskNames,
			eventIsConfirmed: params.eventIsConfirmed,
			eventId: params.eventId,
			organizers: params.organizers,
			onSubmit: params.onSubmit
		}
	};
};

// Evenement en cours de modification (pour EventModal...)
export const eventState = $state({
	is: getNewEvent(),
	pendingSondageValidation: false // Flag pour indiquer qu'une validation de sondage vient d'avoir lieu
});

/* ::: Organisateurs possibles (membres de l'espace)
  Récupère les membres de l'espace, et reorganise les données pour correspondre au type organizers
*/
const organizersPossibles = $derived.by(() => {
	const transformUsers = (users: Array<{ id: string; username: string }>) =>
		users.map((user) => ({
			id: user.id,
			username: user.username,
			tasks: [] // Initialisation avec un tableau vide
		}));
	return transformUsers(getSpace.members || []);
});
export const getOrganizersPossibles = () => organizersPossibles;

// ::: Alert Messages
export const alert = $state({
	message: "",
	type: "info" as "info" | "error" | "success",
	visible: false
});

export function showAlert(message: string, type: "info" | "error" | "success" = "info") {
	alert.message = message;
	alert.type = type;
	alert.visible = true;

	// Utiliser une variable pour l'ID du timeout pour pouvoir le nettoyer si un nouveau message arrive
	let timeoutId: number | undefined;
	if (timeoutId) {
		clearTimeout(timeoutId);
	}
	timeoutId = window.setTimeout(() => {
		alert.visible = false;
		timeoutId = undefined;
	}, 5000);
}

// ::: État pour détecter si l'utilisateur est sur mobile

// État pour la taille d'écran
export const displayState = $state({
	isMobile: typeof window !== "undefined" ? window.innerWidth < 640 : false,
	isMedium:
		typeof window !== "undefined" ? window.innerWidth >= 640 && window.innerWidth < 1024 : false,
	isLarge: typeof window !== "undefined" ? window.innerWidth >= 1024 : false
});

export const messageSheet = $state({
	isOpen: false,
	currentEventId: <string | null>null,
	currentEventName: <string | null>null,
	openMessages(eventId: string, eventName: string) {
		this.currentEventId = eventId;
		this.currentEventName = eventName;
		this.isOpen = true;
	}
});

// ::: État de loading global pour les transitions et lazy loading
export const loadingState = $state({
	is: false
});

// ::: Store de notifications
export type NotificationLogRecord = LogsResponse<unknown, { user_actor_id?: UsersResponse }>;

export const notificationState = $state({
	logs: [] as NotificationLogRecord[],
	unreadCount: 0,
	isInitialized: false,
	subscription: null as (() => void) | null
});

// ::: Validation d'événements // Crée pour les test... USELESS?
import type { EventType } from "$lib/types/event.types";
import {
	determineValidationProfile,
	validateEventStatic,
	type ValidationProfile
} from "$lib/validation/event-validator.svelte";

interface ValidationState {
	isValid: boolean;
	errors: Record<string, string>;
	profile: ValidationProfile | null;
}

export const validator = $state({
	state: {
		isValid: true,
		errors: {},
		profile: null
	} as ValidationState
});

export function validateEventManually(event: EventType) {
	const profile = determineValidationProfile(event);
	const result = validateEventStatic(event, profile);

	validator.state.isValid = result.isValid;
	validator.state.errors = result.errors as Record<string, string>;
	validator.state.profile = profile;
}

export function clearCurrentEventValidation() {
	validator.state.isValid = true;
	validator.state.errors = {};
	validator.state.profile = null;
}
