import type { EventsRecord } from '$lib/types/pocketbase';
import { z } from 'zod';

// Base schemas
export const OrganizerSchema = z.object({
	id: z.string(),
	username: z.string(),
	email: z.string().email(),
	tasks: z.array(z.string()),
	role: z.string(),
	maybehere: z.string().optional()
});

export const RecurrenceSchema = z.object({
	firstDate: z.string(),
	lastDate: z.string(),
	recurrenceDates: z.array(z.string()),
	recurrenceType: z.string(),
	monthlyByDayOccurrences: z.array(z.number()),
	recurrenceTeam: z.array(
		z.object({
			username: z.string(),
			id: z.string(),
			role: z.string()
		})
	),
	tasks: z.array(z.string()),
	autoConfirm: z.boolean(),
	autoConfirmMin: z.number(),
	notifyNoOrganizer: z.boolean(),
	notifyNoOrganizerDays: z.number(),
	notifyNotConfirmed: z.boolean(),
	notifyNotConfirmedDays: z.number()
});

export const TaskSchema = z.object({
	name: z.string(),
	description: z.string(),
	type: z.enum(['default', 'beforeEvent', 'afterEvent', 'onEvent', 'none'])
});

export const TasksListSchema = z.array(TaskSchema);

export const DateProposedSchema = z.object({
	dateStart: z.string(),
	dateEnd: z.string(),
	organizers: z.array(OrganizerSchema)
});

export const ProposalSchema = z.object({
	date_event: z.string(),
	time_start: z.string(),
	time_end: z.string(),
	start_event: z.string().optional(),
	selected: z.boolean().optional()
});

export const ExternalProposalSchema = z.object({
	period_preference: z.string().optional(),
	proposals: z.array(ProposalSchema).optional()
});

// ::: TYPES DÉRIVÉS DES SOUS-STRUCTURES :::
export type OrganizerType = z.infer<typeof OrganizerSchema>;
export type RecurrenceType = z.infer<typeof RecurrenceSchema>;
export type DateProposedType = z.infer<typeof DateProposedSchema>;
export type ProposalType = z.infer<typeof ProposalSchema>;
export type ExternalProposalType = z.infer<typeof ExternalProposalSchema>;
export type TaskType = z.infer<typeof TaskSchema>;
export type TasksListType = z.infer<typeof TasksListSchema>;

// === SCHÉMA DE FORMULAIRE PRINCIPAL ===
// Ce schéma définit les contraintes de validation pour l'interface utilisateur
export const EventFormSchema = z.object({
	// Métadonnées système (reprises de EventsRecord)
	id: z.string().optional(),
	created: z.string().datetime().optional(),
	updated: z.string().datetime().optional(),
	created_by: z.string().optional(),
	space: z.string(),

	// Champs principaux avec validations UI
	event_title: z
		.string()
		.min(2, "Le titre de l'événement doit avoir au moins 2 caractères")
		.max(80, "Le titre de l'événement doit avoir moins de 80 caractères"),

	date_event: z
		.string()
		.min(10, "La date de l'événement est requise pour pouvoir confirmer l'événement"),
	time_start: z
		.string()
		.min(
			1,
			"Les horaires de réservation du lieux sont requises pour pouvoir confirmer l'événement"
		),
	time_end: z
		.string()
		.min(
			1,
			"Les horaires de réservation du lieux sont requises pour pouvoir confirmer l'événement"
		),
	start_public: z
		.string()
		.min(1, "L'horaire d'ouverture du lieu est requise pour pouvoir confirmer l'événement"),
	start_event: z.string(),

	// Dates ISO pour les calculs internes
	dateStart: z.string().datetime().optional(),
	dateEnd: z.string().datetime().optional(),

	// Arrays avec validations
	categories: z.array(z.string()).min(1, 'Sélectionnez au moins une catégorie'),
	rooms: z.array(z.string()).min(1, 'Sélectionnez au moins une salle'),
	tasks: z.array(TaskSchema).min(1, 'Au moins une tâche est requise'),

	// Descriptions
	description: z.string().nullable().optional(),
	desc_public: z.string().nullable().optional(),

	// Prix et restrictions
	is_prix_libre: z.boolean().default(true),
	prix: z.string().nullable().optional(),
	isMixiteChoisie: z.boolean().default(false),
	mixite: z.string().nullable().optional(),
	is_age_no_restriction: z.boolean().default(true),
	age_advice: z.string().nullable().optional(),

	// Statuts
	isConfirmed: z.boolean().default(false),
	isPublic: z.boolean().default(true),
	isPublished: z.boolean().default(false),
	isSendToNewsletter: z.boolean().default(false),
	canceled: z.boolean().default(false),

	// Récurrence
	isRecurrent: z.boolean().default(false),
	isMasterRecurrent: z.boolean().default(false),
	masterRecurrentId: z.string().nullable().optional(),
	recurrence: RecurrenceSchema.nullable().optional(),

	// Sondage et dates proposées
	isSondage: z.boolean().default(false),
	dates_proposed: z.array(DateProposedSchema).nullable().optional(),

	// Organisateurs
	organizers: z.array(OrganizerSchema).min(1, 'Au moins un organisateur est requis'),

	// Autres
	link: z.string().url().nullable().optional(),
	image: z.array(z.string()).nullable().optional(),
	duree: z.string().nullable().optional(),

	// Reporting
	reportedTo: z.string().nullable().optional(),
	reportedFrom: z.string().nullable().optional(),
	inConflictWith: z.array(z.string()).nullable().optional(),

	// Propositions externes
	external_proposal: ExternalProposalSchema.nullable().optional(),
	other_date_query: z.array(z.string()).optional()
});

export type EventFormType = z.infer<typeof EventFormSchema>;

// Types composés pour l'application
export type SyncEventRecord = Omit<EventsRecord, 'expand'> & {
	categories: string[];
	dates_proposed: DateProposedType[];
	organizers: OrganizerType[];
	recurrence?: RecurrenceType;
	rooms: string[];
	tasks: TasksListType;
	external_proposal: ExternalProposalType;
};

// Type composite final pour l'application
export type EventType = SyncEventRecord & Partial<EventFormType>;

// Types utilitaires
export type EventDateAndOrgType = Pick<
	EventFormType,
	| 'event_title'
	| 'id'
	| 'dates_proposed'
	| 'date_event'
	| 'time_start'
	| 'time_end'
	| 'organizers'
	| 'tasks'
>;

// Schémas de validation spécifiques avec des règles plus strictes
export const SaveEventSchema = EventFormSchema.pick({
	event_title: true
});

export const PublishEventSchema = EventFormSchema;

// Schéma pour les événements récurrents
export const SaveRecurrentMasterSchema = EventFormSchema.extend({
	recurrence: RecurrenceSchema.superRefine((recurrence, ctx) => {
		if (!recurrence.firstDate) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'La date de début est requise',
				path: ['firstDate']
			});
		}

		if (!recurrence.lastDate) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'La date de fin est requise',
				path: ['lastDate']
			});
		}

		if (!recurrence.recurrenceType) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Le type de récurrence est requis',
				path: ['recurrenceType']
			});
		}

		// Vérification spécifique pour les événements mensuels par jour
		if (
			recurrence.recurrenceType === 'MONTHLY_BY_DAY' &&
			!recurrence.monthlyByDayOccurrences.length
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Veuillez sélectionner au moins une occurrence mensuelle',
				path: ['monthlyByDayOccurrences']
			});
		}
	})
});

// schéma spécifique pour la page de proposition
export const PropositionFormSchema = z.object({
	event_title: z
		.string()
		.min(2, "Le titre de l'événement doit avoir au moins 2 caractères")
		.max(80, "Le titre de l'événement doit avoir moins de 80 caractères")
		.default(''),
	description: z.string().optional(),
	desc_public: z.string().optional().default('<p></p>'),
	categories: z.string().array().nonempty({ message: 'Sélectionnez au moins une catégorie' }),
	is_prix_libre: z.boolean().default(true),
	prix: z.string().optional(),
	isMixiteChoisie: z.boolean().default(false),
	mixite: z.string().optional(),
	isPublic: z.boolean().default(true),
	is_age_no_restriction: z.boolean().default(true),
	age_advice: z.string().optional(),
	external_proposal: ExternalProposalSchema.nullable().optional(),
	// Champs système nécessaires
	isConfirmed: z.boolean().default(false),
	space: z.string(),
	created_by: z.string().optional(),
	tasks: z.array(TaskSchema).min(1, 'Au moins une tâche est requise'),
	duree: z.string().min(1, "La durée de l'événement est requise")
});

export type PropositionFormType = z.infer<typeof PropositionFormSchema>;

// ::: ENUM ET FONCTION DE VALIDATION :::

// Enum pour les types de validation
export enum ValidationSchemaType {
	SAVE = 'save',
	PUBLISH = 'publish',
	DEFAULT = 'default',
	SAVE_RECURRENT_MASTER = 'save_recurrent_master'
}

// Fonction de validation générique
export function validateEvent(
	data: unknown,
	schemaType: ValidationSchemaType
): { success: boolean; errors?: z.ZodError } {
	const schemaMap = {
		[ValidationSchemaType.SAVE]: SaveEventSchema,
		[ValidationSchemaType.PUBLISH]: PublishEventSchema,
		[ValidationSchemaType.SAVE_RECURRENT_MASTER]: SaveRecurrentMasterSchema,
		[ValidationSchemaType.DEFAULT]: EventFormSchema
	};

	const schema = schemaMap[schemaType] || EventFormSchema;
	try {
		schema.parse(data);
		return { success: true };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return { success: false, errors: error };
		}
		throw error;
	}
}

// ::: FONCTION UTILITAIRE POUR CRÉER UN NOUVEL ÉVÉNEMENT :::
// Cette fonction crée un nouvel événement avec des valeurs par défaut
export function getNewEvent(): EventType {
	return {
		event_title: '',
		date_event: '',
		time_start: '',
		time_end: '',
		start_public: '',
		start_event: '',
		categories: [],
		rooms: [],
		tasks: [],
		description: '',
		desc_public: '',
		is_prix_libre: true,
		prix: '',
		isMixiteChoisie: false,
		mixite: '',
		is_age_no_restriction: true,
		age_advice: '',
		isConfirmed: false,
		isPublic: true,
		isPublished: false,
		isSendToNewsletter: false,
		canceled: false,
		isRecurrent: false,
		isMasterRecurrent: false,
		isSondage: false,
		organizers: [],
		dates_proposed: [],
		space: '', // À remplir par l'application
		external_proposal: {
			period_preference: '',
			proposals: []
		}
	};
}
