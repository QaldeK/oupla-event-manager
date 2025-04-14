import type { EventsRecord } from '$lib/types/pocketbase';
import { z } from 'zod';

// Base schemas
export const OrganizerSchema = z.object({
	id: z.string(),
	username: z.string(),
	tasks: z.array(z.string()),
	maybehere: z.string().nullable().optional()
});

export const TaskSchema = z.object({
	name: z.string(),
	description: z.string(),
	type: z.enum(['default', 'beforeEvent', 'afterEvent', 'onEvent', 'none'])
});

// Définir d'abord un RecurrenceSchema de base
const BaseRecurrenceSchema = z
	.object({
		firstDate: z
			.string({
				required_error: 'La date de début est requise'
			})
			.min(1, 'La date de début est requise'),
		lastDate: z
			.string({
				required_error: 'La date de fin est requise'
			})
			.min(1, 'La date de fin est requise'),
		recurrenceType: z
			.string({
				required_error: 'Le type de récurrence est requis'
			})
			.min(1, 'Le type de récurrence est requis'),
		recurrenceDates: z.array(z.string()),
		monthlyByDayOccurrences: z.array(z.number()),
		recurrenceTeam: z
			.array(
				z
					.object({
						username: z.string().min(1, "Le nom d'utilisateur est requis"),
						id: z.string().min(1, "L'ID est requis"),
						tasks: z.array(z.string().optional())
					})
					.optional()
			)
			.min(1, "L'équipe récurrente doit avoir au moins un membre"),
		tasks: z
			.array(
				z.object({
					name: z.string(),
					description: z.string(),
					type: z.string() // FIX: Accepter n'importe quelle string pour le type
				})
			)
			.min(1, 'Au moins une tâche est requise'),
		autoConfirm: z.boolean(),
		autoConfirmMin: z.number(),
		notifyNoOrganizer: z.boolean(),
		notifyNoOrganizerDays: z.number(),
		notifyNotConfirmed: z.boolean(),
		notifyNotConfirmedDays: z.number()
	})
	.refine(
		(data) => {
			if (data.recurrenceType === 'MONTHLY_BY_DAY') {
				return data.monthlyByDayOccurrences.length > 0;
			}
			return true;
		},
		{
			message: 'Au moins une occurrence est requise pour la récurrence mensuelle par jour',
			path: ['monthlyByDayOccurrences']
		}
	);

// Ensuite, créer des variantes selon les besoins
export const RecurrenceSchema = z.union([BaseRecurrenceSchema, z.null(), z.undefined()]);

export const RequiredRecurrenceSchema = BaseRecurrenceSchema;

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

// Fonction utilitaire pour les validations communes : prix, mixité, age
const validateCommonFields = (data: any, ctx: z.RefinementCtx) => {
	// Validation du prix
	if (!data.is_prix_libre && (!data.prix || data.prix.trim() === '')) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "Le prix est requis lorsque le prix n'est pas libre",
			path: ['prix']
		});
	}

	// Validation de la mixité
	if (data.isMixiteChoisie && (!data.mixite || data.mixite.trim() === '')) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'La description de la mixité est requise lorsque la mixité est choisie',
			path: ['mixite']
		});
	}

	// Validation de l'âge
	if (!data.is_age_no_restriction && (!data.age_advice || data.age_advice.trim() === '')) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "L'âge minimum est requis lorsque l'événement n'est pas tout public",
			path: ['age_advice']
		});
	}

	// Validation de start_public pour les événements publics
	if (data.isPublic && (!data.start_public || data.start_public.trim() === '')) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "L'horaire d'ouverture du lieu est requise pour un événement public",
			path: ['start_public']
		});
	}
};

// ::: TYPES DÉRIVÉS DES SOUS-STRUCTURES :::
export type OrganizerType = z.infer<typeof OrganizerSchema>;
export type RecurrenceType = z.infer<typeof RecurrenceSchema>; // for EventModal !isRecurrent
export type RequiredRecurrenceType = z.infer<typeof RequiredRecurrenceSchema>; // for RecurrentTab with no undefined values (isRecurrent)
export type DateProposedType = z.infer<typeof DateProposedSchema>;
export type ProposalType = z.infer<typeof ProposalSchema>;
export type ExternalProposalType = z.infer<typeof ExternalProposalSchema>;
export type TaskType = z.infer<typeof TaskSchema>;

export type TasktypeType = z.infer<typeof TaskSchema.shape.type>;
// === SCHÉMA DE FORMULAIRE PRINCIPAL ===
// Ce schéma définit les contraintes de validation pour l'interface utilisateur
const BaseEventFormSchema = z.object({
	// Métadonnées système (reprises de EventsRecord) → nullable/optionnal car non géré par l'user
	id: z.string().nullable().optional(),
	created: z.string().nullable().optional(),
	updated: z.string().nullable().optional(),
	created_by: z.string().nullable().optional(),
	space: z.string().nullable().optional(),

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
	start_public: z.string(),
	start_event: z.string().optional(),

	// Dates ISO pour les calculs internes
	dateStart: z.string().nullable().optional(),
	dateEnd: z.string().nullable().optional(),

	// Arrays avec validations
	categories: z.array(z.string()).min(1, 'Sélectionnez au moins une catégorie'),
	rooms: z.array(z.string()).min(1, 'Sélectionnez au moins une salle'),
	tasks: z
		.array(
			z.object({
				name: z.string(),
				description: z.string(),
				type: z.string() // FIX:  Temporairement on accepte n'importe quelle string
			})
		)
		.min(1, 'Au moins une tâche est requise'),

	// Descriptions
	description: z.string().nullable().optional(),
	desc_public: z.string(),

	// Prix et restrictions
	is_prix_libre: z.boolean().default(true),
	prix: z.string().nullable().optional(),
	isMixiteChoisie: z.boolean().default(false),
	mixite: z.string().nullable().optional(),
	is_age_no_restriction: z.boolean().default(true),
	age_advice: z.number().nullable().optional(),

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
	link: z.string().nullable().optional(),
	image: z.array(z.string()).nullable().optional(),
	duree: z.string().nullable().optional(),

	// Reporting
	reportedTo: z.string().nullable().optional(),
	reportedFrom: z.string().nullable().optional(),
	inConflictWith: z.array(z.string()).nullable().optional(),

	// Propositions externes
	external_proposal: ExternalProposalSchema.nullable().optional(),
	other_date_query: z.array(z.string()).nullable().optional()
});

export const EventFormSchema = BaseEventFormSchema.superRefine(validateCommonFields);

export type EventFormType = z.infer<typeof EventFormSchema>;

// Types composés pour l'application
export type SyncEventRecord = Omit<EventsRecord, 'expand'> & {
	categories: string[];
	dates_proposed: DateProposedType[];
	organizers: OrganizerType[];
	recurrence?: RecurrenceType;
	rooms: string[];
	tasks: TaskType[];
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
export const SaveEventSchema = BaseEventFormSchema.pick({
	event_title: true
});

// Schéma de publication avec validations spécifiques + communes
export const PublishEventSchema = BaseEventFormSchema.extend({
	recurrence: RecurrenceSchema.nullable().optional(), // Allow null or undefined
	// Pour tasks, on peut temporairement assouplir la validation
	// en attendant la mise à jour de la config
	tasks: z
		.array(
			z.object({
				name: z.string(),
				description: z.string(),
				type: z.string() // Temporairement on accepte n'importe quelle string
			})
		)
		.min(1, 'Au moins une tâche est requise')
});

// Schéma récurrent avec validations spécifiques + communes
export const SaveRecurrentMasterSchema = BaseEventFormSchema.extend({
	recurrence: RequiredRecurrenceSchema,
	organizers: z.array(OrganizerSchema).optional(),
	dateStart: z.string().optional(),
	dateEnd: z.string().optional(),
	date_event: z.string().optional(),
	tasks: z
		.array(
			z.object({
				name: z.string(),
				description: z.string(),
				type: z.string() // Accepter n'importe quelle string pour le type
			})
		)
		.min(1, 'Au moins une tâche est requise')
});

// schéma spécifique pour la page de proposition
export const PropositionFormSchema = z
	.object({
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
		age_advice: z.number().optional(),
		external_proposal: ExternalProposalSchema.nullable().optional(),
		// Champs système nécessaires
		isConfirmed: z.boolean().default(false),
		space: z.string(),
		created_by: z.string().optional()
	})
	.superRefine(validateCommonFields);

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
			console.warn('Validation Zod errors:', {
				formattedErrors: error.format(),
				flattenedErrors: error.flatten(),
				issues: error.issues
			});
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
		isMixiteChoisie: false,
		is_age_no_restriction: true,
		isConfirmed: false,
		isPublic: true,
		isPublished: false,
		isSendToNewsletter: false,
		canceled: false,
		isRecurrent: false,
		isMasterRecurrent: false,
		isSondage: false,
		organizers: [],
		dates_proposed: []
		// space: '', // À remplir par l'application
		// external_proposal: {
		// 	period_preference: '',
		// 	proposals: []
		// }
	};
}

export function getDefaultRecurrence(): RecurrenceType {
	return {
		firstDate: '',
		lastDate: '',
		recurrenceDates: [],
		recurrenceType: '',
		monthlyByDayOccurrences: [],
		recurrenceTeam: [],
		tasks: [],
		autoConfirm: false,
		autoConfirmMin: 1,
		notifyNoOrganizer: false,
		notifyNoOrganizerDays: 3,
		notifyNotConfirmed: false,
		notifyNotConfirmedDays: 3
	};
}
