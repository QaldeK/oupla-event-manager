import { pb } from '$lib/pocketbase.svelte';
import { getSpace } from '$lib/shared/spaceOptions.svelte';
import type { EventFormType } from '$lib/types/event';

// Fonction pour obtenir les valeurs par défaut dynamiques
export function getNewEvent(): EventFormType {
	return {
		// Valeurs dynamiques
		space: getSpace.id,
		created_by: pb.authStore.model?.id || '',
		tasks: [getSpace.tasks.defaultTask],

		// Valeurs statiques
		event_title: '',
		date_event: '',
		time_start: '',
		time_end: '',
		start_public: '',
		start_event: '',
		isConfirmed: false,
		isPublic: true,
		isSendToNewsletter: false,
		isPublished: false,
		canceled: false,
		isMasterRecurrent: false,
		isRecurrent: false,
		masterRecurrentId: '',
		recurrence: {
			firstDate: '',
			lastDate: '',
			recurrenceDates: [],
			recurrenceType: '',
			monthlyByDayOccurrences: [],
			recurrenceTeam: [],
			tasks: []
		},
		dates_proposed: [],
		description: '',
		desc_public: '<p></p>',
		link: '',
		other_date_query: [],
		isMixiteChoisie: false,
		mixite: '',
		is_age_no_restriction: true,
		age_advice: '',
		is_prix_libre: true,
		prix: '',
		duree: '01:30',
		organizers: [],
		rooms: [''],
		categories: [''],
		reportedTo: '',
		reportedFrom: '',
		inConflictWith: [],
		external_proposal: {}
	};
}

// Pour la compatibilité avec le code existant
export const newEvent = getNewEvent();
