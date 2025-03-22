import { pb } from '$lib/pocketbase.svelte';
import { getSpace } from '$lib/shared/spaceOptions.svelte';
import { userDb } from '$lib/shared/userDb.svelte';
import type { EventFormType } from '$lib/types/event';

// Fonction pour obtenir les valeurs par défaut dynamiques
export function getNewEvent(): EventFormType {
	return {
		// Valeurs dynamiques
		space: '',
		created_by: '',
		tasks: [],
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
		isSondage: false,
		masterRecurrentId: '',
		recurrence: {
			firstDate: '',
			lastDate: '',
			recurrenceDates: [],
			recurrenceType: '',
			monthlyByDayOccurrences: [],
			recurrenceTeam: [],
			tasks: [],
			autoConfirm: false,
			autoConfirmMin: 1,
			notifyNoOrganizer: true,
			notifyNoOrganizerDays: 7,
			notifyNotConfirmed: true,
			notifyNotConfirmedDays: 3
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
		duree: '',
		organizers: [],
		rooms: [''],
		categories: [''],
		reportedTo: '',
		reportedFrom: '',
		inConflictWith: [],
		external_proposal: {}
	};
}
