import type { EventsResponse } from "./pocketbase";

// Type principal basé sur EventsResponse avec types spécifiques pour les champs JSON
export type EventType = EventsResponse<
	string[], // categories
	DateProposedType[], // dates_proposed
	ExternalProposalType, // external_proposal
	OrganizerType[], // organizers
	string[], // other_date_query
	RecurrenceConfigType, // recurrence
	string[], // rooms
	TaskType[] // tasks
>;

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
	tasks: string[];
	// role: string;
	maybehere?: string | null;
}

export interface RecurrenceTeamType {
	username: string;
	id: string;
}

export interface RecurrenceConfigType {
	firstDate: string;
	lastDate: string;
	recurrenceType: RecurrenceType;
	recurrenceDates: string[];
	monthlyByDayOccurrences: number[];
	recurrenceTeam: RecurrenceTeamType[];
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

// Types pour les différents modes de validation
export type EventMode =
	| "NEW_SINGLE" // Création événement unique
	| "NEW_RECURRENT" // Création événement récurrent
	| "EDIT_SINGLE" // Modification événement unique
	| "EDIT_RECURRENT_ONE" // Modification occurrence unique
	| "EDIT_RECURRENT_ALL"; // Modification toutes occurrences

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

// Types pour les événements récurrents validés
export interface ValidMaster extends EventType {
	id: string;
	recurrence: RecurrenceConfigType;
}

export type ValidOccurrence = EventType & {
	id: string;
	date_event: string;
	masterRecurrentId: string;
	categories: string[];
	rooms: string[];
	tasks: TaskType[];
	organizers: OrganizerType[];
	dates_proposed: DateProposedType[];
	external_proposal: ExternalProposalType;
	other_date_query: string[];
};
