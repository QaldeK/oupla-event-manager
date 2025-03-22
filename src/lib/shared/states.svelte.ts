// import Device from 'svelte-device-info'; // TODO ? npm install svelte-device-info

// export const eventsList = $state();

import { newEvent } from '$lib/constants/events.constants';
import { getSpace } from '$lib/shared/spaceOptions.svelte';

export const modalState = $state({
	dateSondage: false,
	organizers: false,
	event: false,
	report: false,
	inviteUser: false,
	tasks: {
		isOpen: false,
		data: {
			username: '',
			tasks: [] as string[],
			selectedTasks: [] as string[],
			onSubmit: null as ((tasks: string[]) => void) | null
		}
	},
	confirm: {
		isOpen: false,
		data: {
			title: '',
			message: '',
			variant: 'info',
			onConfirm: null as (() => void) | null
		}
	}
});

export const openTaskModal = (params: {
	username: string;
	tasks: string[];
	selectedTasks: string[];
	onSubmit: (tasks: string[]) => void; //  Add onSubmit here, making it required
}) => {
	modalState.tasks = {
		isOpen: true,
		data: {
			...params, // Spread existing params
			onSubmit: params.onSubmit // Explicitly pass onSubmit
		}
	};
};

// Evenement en cours de modification (pour EventModal...)
export const eventState = $state({
	is: newEvent
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
	message: '',
	type: 'info' as 'info' | 'error' | 'success',
	visible: false
});

export function showAlert(message: string, type: 'info' | 'error' | 'success' = 'info') {
	alert.message = message;
	alert.type = type;
	alert.visible = true;

	setTimeout(() => {
		alert.visible = false;
	}, 5000);
}

// ::: État pour détecter si l'utilisateur est sur mobile

// État pour la taille d'écran
export const displayState = $state({
	isMobile: window.innerWidth < 640,
	isMedium: window.innerWidth >= 640 && window.innerWidth < 1024,
	isLarge: window.innerWidth >= 1024
});

export const messageSheet = $state({
	isOpen: false,
	currentEventId: <string | null>null,
	openMessages(eventId: string) {
		this.currentEventId = eventId;
		this.isOpen = true;
	}
});

import { userDb } from '$lib/shared/userDb.svelte';

export const hasAuthorizations = (params: {
	isRecurrent?: boolean;
	recurrenceTeam?: string[];
	createdBy?: string;
}): boolean => {
	const currentUser = userDb.current;
	const currentRole = userDb.currentRole;

	if (!currentUser) return false;
	
	// Admin a toujours les droits
	if (currentRole === 'admin') return true;

	// Vérifie si l'utilisateur fait partie de l'équipe récurrente
	if (params.isRecurrent && params.recurrenceTeam?.includes(currentUser.id)) {
		return true;
	}

	// Vérifie si l'utilisateur est le créateur et a le rôle "helpers"
	if (currentRole === 'helpers' && params.createdBy === currentUser.id) {
		return true;
	}

	return false;
};
