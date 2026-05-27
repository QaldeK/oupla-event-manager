/**
 * UTILITAIRES DE TEST - test-utils.ts
 *
 * Ce fichier contient des fonctions utilitaires pour créer des données de test
 * cohérentes avec la configuration de l'espace Mofo.
 *
 * UTILISATION :
 * - Import dans vos tests : import { createBaseEvent, createMofoTask, ... } from './test-utils';
 * - Ces fonctions créent des objets avec des données valides par défaut
 * - La configuration MOFO_SPACE_CONFIG reflète la vraie configuration de l'espace
 *
 * FONCTIONS PRINCIPALES :
 * - createBaseEvent() : Crée un événement vide avec les valeurs par défaut
 * - createCompleteEvent() : Crée un événement complet et valide
 * - createMofoTask() : Crée une tâche à partir du nom (doit exister dans la config)
 * - createMofoOrganizer() : Crée un organisateur à partir du username
 * - createRecurrenceConfig() : Crée une configuration de récurrence
 * - createDateProposed() : Crée une date proposée pour les sondages
 * - createExternalProposal() : Crée une proposition externe
 * - createEventDates() : Gère les dates multi-jours
 *
 * TESTS ASSOCIÉS :
 * bun run test utils.test.ts
 */

import type {
	EventType,
	TaskType,
	OrganizerType,
	RecurrenceConfigType,
	DateProposedType,
	ExternalProposalType
} from "$lib/types/event.types";
import { Collections } from "$lib/types/pocketbase";

export const MOFO_SPACE_CONFIG = {
	id: "xl69b9bu7yjbaj7",
	rooms: ["bibli", "salle-2", "salle 3"],
	categories: ["autre", "apéro", "concert", "discussion", "atelier", "réunion", "spectacle", "jeu"],
	tasks: [
		{
			name: "présence",
			description: "présence / participation à l'orga pendant l'événement",
			type: "onEvent",
			isDefault: true
		},
		{
			name: "com",
			description: "impression affiche, envoie de texto, ...",
			type: "beforeEvent",
			isDefault: false
		},
		{
			name: "ménage",
			description: "ménage et rangement après l'événement",
			type: "afterEvent",
			isDefault: false
		},
		{
			name: "contact",
			description: "Gestion du contact en amont avec les intervenant·es",
			type: "beforeEvent",
			isDefault: false
		},
		{
			name: "course",
			description: "acheter de la biere ! et du café",
			type: "beforeEvent",
			isDefault: false
		},
		{
			name: "animation",
			description: "préparation et animation (de l'atelier, la réu)",
			type: "onEvent",
			isDefault: false
		},
		{
			name: "ouverture",
			description: "acceuil des intervenant·es, préparation du lieu...",
			type: "onEvent",
			isDefault: false
		},
		{ name: "newtask", description: "testest", type: "onEvent", isDefault: false }
	],
	members: [
		{
			id: "o48pvotsdr2o7gt",
			username: "aldek",
			email: import.meta.env.VITE_TEST_EMAIL_ALDEK as string,
			role: "admin"
		},
		{ id: "ix78im6wl916zxr", username: "ghald", email: "ghald@riseup.net", role: "helpers" },
		{ id: "vzq3336334p5ewa", username: "pito", email: "pito@pito.com", role: "helpers" },
		{ id: "5tc53czs08l2z4b", username: "pati", email: "pati@pati.com", role: "invited" },
		{ id: "mjd2b54cwqf0681", username: "zeo", role: "helpers" },
		{ id: "5m4r8pas633m7up", username: "tati", role: "invited" },
		{ id: "7961w4ae24gi4xn", username: "touti", role: "invited" },
		{ id: "7nd048fgvfe8329", username: "lila", role: "helpers" },
		{ id: "3sdpmr92whfd7oa", username: "qko", email: "qk-oupla@gmx.com", role: "admin" },
		{
			id: "pt8013z6bhan87u",
			username: "users211593",
			email: import.meta.env.VITE_TEST_EMAIL_QKMAIL as string,
			role: "external"
		},
		{ id: "a4le7vb3m03p5w3", username: "pouet", email: "pouet@pouet.com", role: "external" },
		{ id: "22k3hmf98go8xsw", username: "newone", role: "helpers" }
	]
};

export function createBaseEvent(): EventType {
	return {
		id: "",
		event_title: "",
		description: "",
		desc_public: "",
		date_event: "",
		time_start: "",
		time_end: "",
		start_public: "",
		isPublic: false,
		isConfirmed: false,
		isSondage: false,
		isRecurrent: false,
		is_prix_libre: true,
		prix: "",
		isMixiteChoisie: false,
		mixite: "",
		is_age_no_restriction: true,
		age_advice: 0,
		categories: [],
		rooms: [],
		organizers: [],
		tasks: [],
		dates_proposed: [],
		external_proposal: {},
		other_date_query: [],
		recurrence: null,
		isMasterRecurrent: false,
		masterRecurrentId: "",
		space: MOFO_SPACE_CONFIG.id,
		created: "",
		updated: "",
		collectionId: "events",
		collectionName: Collections.Events,
		expand: undefined,
		// Champs manquants requis par EventType
		canceled: false,
		created_by: "",
		dateEnd: "",
		dateStart: "",
		duree: "",
		image: [],
		inConflictWith: [],
		isPublished: false,
		isSendToNewsletter: false,
		link: "",
		noOrganizerNotificationSent: false,
		notConfirmedNotificationSent: false,
		reportedFrom: "",
		reportedTo: "",
		start_event: ""
	};
}

export function createMofoTask(name: string): TaskType {
	const taskConfig = MOFO_SPACE_CONFIG.tasks.find((t) => t.name === name);
	if (!taskConfig) {
		throw new Error(`Tâche "${name}" non trouvée dans la configuration`);
	}
	return {
		name: taskConfig.name,
		description: taskConfig.description,
		type: taskConfig.type as "beforeEvent" | "afterEvent" | "onEvent",
		isDefault: taskConfig.isDefault
	};
}

export function createMofoOrganizer(username: string, tasks: string[] = []): OrganizerType {
	const member = MOFO_SPACE_CONFIG.members.find((m) => m.username === username);
	if (!member) {
		throw new Error(`Member "${username}" non trouvé dans la configuration`);
	}
	return {
		id: member.id,
		username: member.username,
		tasks,
		maybehere: null
	};
}

export function createRecurrenceConfig(): RecurrenceConfigType {
	return {
		firstDate: "2025-08-01",
		lastDate: "2025-12-31",
		recurrenceType: "WEEKLY",
		recurrenceDates: ["2025-08-01", "2025-08-08", "2025-08-15"],
		monthlyByDayOccurrences: [],
		recurrenceTeam: [
			{ username: "aldek", id: "o48pvotsdr2o7gt" },
			{ username: "ghald", id: "ix78im6wl916zxr" }
		],
		tasks: [createMofoTask("présence"), createMofoTask("com")],
		autoConfirm: false,
		autoConfirmMin: 2,
		notifyNoOrganizer: true,
		notifyNoOrganizerDays: 7,
		notifyNotConfirmed: true,
		notifyNotConfirmedDays: 3,
		minOrganizersRequired: 1,
		allTasksRequired: false
	};
}

export function createDateProposed(dateStart: string, dateEnd: string): DateProposedType {
	return {
		dateStart,
		dateEnd,
		organizers: [createMofoOrganizer("aldek"), createMofoOrganizer("ghald")]
	};
}

export function createExternalProposal(): ExternalProposalType {
	return {
		period_preference: "weekend",
		proposals: [
			{
				date_event: "2025-08-16",
				time_start: "14:00",
				time_end: "18:00",
				start_event: "2025-08-16T14:00:00.000Z",
				selected: false
			},
			{
				date_event: "2025-08-17",
				time_start: "10:00",
				time_end: "16:00",
				start_event: "2025-08-17T10:00:00.000Z",
				selected: true
			}
		]
	};
}

export function createEventDates(
	dateEvent: string,
	timeStart: string,
	timeEnd: string
): { date_event: string; time_start: string; time_end: string; start_public: string } {
	const startDateTime = new Date(`${dateEvent}T${timeStart}:00`);
	let endDateTime = new Date(`${dateEvent}T${timeEnd}:00`);

	// Si l'heure de fin est antérieure à l'heure de début, c'est le lendemain
	if (endDateTime <= startDateTime) {
		const newEndDateTime = new Date(endDateTime);
		newEndDateTime.setDate(newEndDateTime.getDate() + 1);
		endDateTime = newEndDateTime;
	}

	return {
		date_event: dateEvent,
		time_start: timeStart,
		time_end: timeEnd,
		start_public: startDateTime.toISOString()
	};
}

export function createCompleteEvent(
	title: string,
	category: string,
	dateEvent: string,
	timeStart: string,
	timeEnd: string,
	isPublic: boolean = true,
	isConfirmed: boolean = true
): EventType {
	const event = createBaseEvent();

	event.event_title = title;
	event.description = `Description pour ${title}`;
	event.desc_public = isPublic ? `Description publique pour ${title}` : "";
	event.date_event = dateEvent;
	event.time_start = timeStart;
	event.time_end = timeEnd;
	// Ne pas inclure start_public pour éviter les problèmes de format
	event.isPublic = isPublic;
	event.isConfirmed = isConfirmed;
	event.categories = [category];
	event.rooms = ["salle-2"];
	event.organizers = [createMofoOrganizer("aldek", ["présence"])];
	event.tasks = [createMofoTask("présence")];

	return event;
}
