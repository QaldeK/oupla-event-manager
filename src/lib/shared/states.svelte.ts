// import Device from 'svelte-device-info'; // TODO ? npm install svelte-device-info

// export const eventsList = $state();

import { getNewEvent } from "$lib/schemas/event.schema";
import { getSpace } from "$lib/shared/spaceOptions.svelte";
import { type TaskType } from "$lib/schemas/event.schema";

export interface ConfirmModalData {
	title: string;
	message: string;
	variant?: "warning" | "info" | "danger";

	showCheckbox?: {
		label: string;
		checked: boolean;
	};
	showCancelEventButton?: {
		label: string;
		onCancelEvent: () => void | Promise<void>;
	};

	onConfirm: ((notifyOthers?: boolean, customMessage?: string) => void | Promise<void>) | null;
}
// Interface pour TaskDialog (Gestion multiple)
export interface TaskModalData {
	username: string;
	tasksAvailable: TaskType[];
	selectedTaskNames: string[];
	eventIsConfirmed: boolean; // Utile pour affichage informatif dans TaskDialog
	eventId?: string;
	onSubmit: ((result: string[]) => void | Promise<void>) | null;
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

export const openTaskModal = (params: {
	username: string;
	tasksAvailable: TaskType[];
	selectedTaskNames: string[];
	eventIsConfirmed: boolean;
	eventId?: string;
	onSubmit: (result: string[]) => void | Promise<void>;
}) => {
	modalState.tasks = {
		isOpen: true,
		data: {
			username: params.username,
			tasksAvailable: $state.snapshot(params.tasksAvailable),
			selectedTaskNames: params.selectedTaskNames,
			eventIsConfirmed: params.eventIsConfirmed,
			eventId: params.eventId,
			onSubmit: params.onSubmit
		}
	};
};

// Evenement en cours de modification (pour EventModal...)
export const eventState = $state({
	is: getNewEvent()
});

/* ::: Organisateurs possibles (membres de l'espace)
  Récupère les membres de l'espace, et reorganise les données pour correspondre au type organizers
*/
const organizersPossibles = $derived.by(() => {
	const transformUsers = (users) =>
		users.map((user) => ({
			id: user.id,
			email: user.email,
			username: user.username,
			tasks: [] // Initialisation avec un tableau vide
		}));
	return transformUsers(getSpace.members);
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
	openMessages(eventId: string) {
		this.currentEventId = eventId;
		this.isOpen = true;
	}
});

import { userDb } from "$lib/shared/userDb.svelte";

// FIXIT recurrenceTeam
export const hasAuthorizations = (params: {
	isRecurrent?: boolean;
	recurrenceTeam?: string[];
	createdBy?: string;
}): boolean => {
	const currentUser = userDb.current;
	const currentRole = userDb.currentRole;

	if (!currentUser) return false;

	// Admin a toujours les droits
	if (currentRole === "admin") return true;

	// Vérifie si l'utilisateur fait partie de l'équipe récurrente
	if (params.isRecurrent && params.recurrenceTeam?.includes(currentUser.id)) {
		return true;
	}

	// Vérifie si l'utilisateur est le créateur et a le rôle "helpers"
	if (currentRole === "helpers" && params.createdBy === currentUser.id) {
		return true;
	}

	return false;
};
