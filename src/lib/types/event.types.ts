import type { EventsRecord } from "./pocketbase";

// Types pour les énumérations
export const RecurrenceTypeEnum = {
	WEEKLY: "WEEKLY",
	BIWEEKLY: "BIWEEKLY",
	MONTHLY_BY_DATE: "MONTHLY_BY_DATE",
	MONTHLY_BY_DAY: "MONTHLY_BY_DAY"
} as const;

export type RecurrenceType = keyof typeof RecurrenceTypeEnum;

export const TaskTypeEnum = {
	BEFORE_EVENT: "beforeEvent",
	AFTER_EVENT: "afterEvent",
	ON_EVENT: "onEvent",
	NONE: "none",
	DEFAULT: "default"
} as const;

export type TaskTypeType = (typeof TaskTypeEnum)[keyof typeof TaskTypeEnum];

// Types métier pour les champs JSON
export interface TaskType {
	name: string;
	description: string;
	type: TaskTypeType;
	isDefault?: boolean;
}

export interface OrganizerType {
	id: string;
	username: string;
	email?: string;
	tasks?: string[];
	role?: string;
	maybehere?: string | null;
}

export interface RecurrenceConfigType {
	firstDate: string;
	lastDate: string;
	recurrenceType: RecurrenceType;
	recurrenceDates: string[];
	monthlyByDayOccurrences: number[];
	recurrenceTeam: Array<{
		username: string;
		id: string;
	}>;
	tasks: TaskType[];
	autoConfirm: boolean;
	autoConfirmMin: number;
	notifyNoOrganizer: boolean;
	notifyNoOrganizerDays: number;
	notifyNotConfirmed: boolean;
	notifyNotConfirmedDays: number;
	minOrganizersRequired: number;
	allTasksRequired: boolean;
}

export interface DateProposedType {
	dateStart: string;
	dateEnd: string;
	organizers: OrganizerType[];
}

export interface ProposalType {
	date_event: string;
	time_start: string;
	time_end: string;
	start_event?: string;
	selected?: boolean;
}

export interface ExternalProposalType {
	period_preference?: string;
	proposals?: ProposalType[];
}

// Type principal pour un événement avec types métier stricts
export interface EventType {
	// Champs système PocketBase
	id: string;
	created: string;
	updated: string;
	collectionId: string;
	collectionName: string;

	// Champs métier obligatoires
	event_title: string;
	created_by: string;
	space: string;
	categories: string[];
	rooms: string[];
	tasks: TaskType[];
	organizers: OrganizerType[];

	// Champs métier optionnels avec valeurs par défaut
	date_event?: string;
	time_start?: string;
	time_end?: string;
	start_public?: string;
	start_event?: string;
	dateStart?: string;
	dateEnd?: string;

	description?: string;
	desc_public?: string;
	duree?: string;
	link?: string;
	image?: string[];

	// Flags booléens avec valeurs par défaut
	isConfirmed: boolean;
	isPublic: boolean;
	isPublished: boolean;
	isSendToNewsletter: boolean;
	canceled: boolean;
	isRecurrent: boolean;
	isMasterRecurrent: boolean;
	isSondage: boolean;
	is_prix_libre: boolean;
	isMixiteChoisie: boolean;
	is_age_no_restriction: boolean;

	// Champs conditionnels
	prix?: string;
	mixite?: string;
	age_advice?: number;

	// Récurrence et relations
	masterRecurrentId?: string;
	recurrence?: RecurrenceConfigType;

	// Sondage et propositions
	dates_proposed?: DateProposedType[];
	external_proposal?: ExternalProposalType;
	other_date_query?: string[];

	// Conflits et rapports
	inConflictWith?: string[];
	reportedTo?: string;
	reportedFrom?: string;

	// Notifications
	noOrganizerNotificationSent?: boolean;
	notConfirmedNotificationSent?: boolean;
}

// Types pour les différents modes de validation
export type EventMode =
	| "NEW_SINGLE"
	| "NEW_RECURRENT"
	| "EDIT_SINGLE"
	| "EDIT_RECURRENT_ALL"
	| "EDIT_RECURRENT_OCCURRENCE";

export type ValidationContext = "SAVE" | "PUBLISH" | "RECURRENT_MASTER";

// Types utilitaires
export interface EventConflict {
	id: string;
	event_title: string;
	time_start: string;
	time_end: string;
	rooms: string[];
	conflictType: "confirmed" | "unconfirmed" | "sondage" | "close-confirmed" | "close-unconfirmed";
	hasSameRoom: boolean;
	date_event: string;
	isConfirmed: boolean;
	organizers: OrganizerType[];
	sourceEventId?: string;
}

// Factory pour créer un nouvel événement avec valeurs par défaut
export function createNewEvent(spaceId: string, userId: string): Partial<EventType> {
	return {
		event_title: "",
		created_by: userId,
		space: spaceId,
		categories: [],
		rooms: [],
		tasks: [],
		organizers: [],
		description: "",
		desc_public: "",
		isConfirmed: false,
		isPublic: true,
		isPublished: false,
		isSendToNewsletter: false,
		canceled: false,
		isRecurrent: false,
		isMasterRecurrent: false,
		isSondage: false,
		is_prix_libre: true,
		isMixiteChoisie: false,
		is_age_no_restriction: true,
		dates_proposed: []
	};
}

// Factory pour créer une nouvelle récurrence avec valeurs par défaut
export function createNewRecurrence(): RecurrenceConfigType {
	return {
		firstDate: "",
		lastDate: "",
		recurrenceType: "WEEKLY",
		recurrenceDates: [],
		monthlyByDayOccurrences: [],
		recurrenceTeam: [],
		tasks: [],
		autoConfirm: false,
		autoConfirmMin: 1,
		notifyNoOrganizer: false,
		notifyNoOrganizerDays: 3,
		notifyNotConfirmed: false,
		notifyNotConfirmedDays: 7,
		minOrganizersRequired: 1,
		allTasksRequired: false
	};
}
