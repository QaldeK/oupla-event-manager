import { z } from 'zod';

// Définition des sous-schémas
export const RecurrenceTeamSchema = z.object({
	username: z.string().default(''),
	// email: z.string().email().default(''),
	id: z.string().default(''),
	role: z.string().default('')
});

export const RecurrenceSchema = z.object({
	firstDate: z.string().default(''),
	lastDate: z.string().default(''),
	recurrenceDates: z.array(z.string()).default([]),
	recurrenceType: z.string().default(''),
	monthlyByDayOccurrences: z.array(z.number().optional()).default([]),
	recurrenceTeam: z.array(RecurrenceTeamSchema).default([]),
	tasks: z.array(z.string()).default([]),
	autoConfirm: z.boolean().default(false),
	autoConfirmMin: z.number().optional(),
	notifyNoOrganizer: z.boolean().optional().default(false),
	notifyNoOrganizerDays: z.number().optional().default(5),
	notifyNotConfirmed: z.boolean().optional().default(false),
	notifyNotConfirmedDays: z.number().optional().default(3)
});

export const OrganizerSchema = z.object({
	email: z.string().email().optional().default(''),
	id: z.string().default(''),
	username: z.string().default(''),
	tasks: z.array(z.string()).default(['']),
	role: z.string().optional().default('')
});

export const OrganizerSchemaDatesProposed = z.object({
	// email: z.string().email().default(''),
	id: z.string().default(''),
	username: z.string().default(''),
	// tasks: z.array(z.string()).default(['']),
	role: z.string().optional().default(''),
	maybehere: z.string().optional().default('')
});

export const DateProposedSchema = z.object({
	dateStart: z.string().datetime().default(''),
	dateEnd: z.string().datetime().default(''),
	organizers: z.array(OrganizerSchemaDatesProposed).default([])
});

export const ProposalSchema = z.object({
	date_event: z.string(),
	time_start: z.string(),
	time_end: z.string(),
	start_event: z.string().optional(),
	selected: z.boolean().optional().default(false)
});

export const ExternalProposalSchema = z
	.object({
		period_preference: z.string().optional(),
		proposals: z.array(ProposalSchema).optional()
	})
	.default({});

export const EventFormSchema = z.object({
	// Métadonnées système
	created: z.string().datetime().optional(),
	created_by: z.string().optional(),
	updated: z.string().datetime().optional(),
	id: z.string().optional(),
	space: z.string(),

	event_title: z
		.string()
		.min(2, "Le titre de l'événement doit avoir au moins 2 caractères")
		.max(80, "Le titre de l'événement doit avoir moins de 80 caractères")
		.default(''),

	date_event: z
		.string()
		.min(10, "La date de l'événement est requise pour pouvoir confirmer l'événement")
		.default(''),
	time_start: z
		.string()
		.min(1, "Les horaires de réservation du lieux sont requises pour pouvoir confirmer l'événement")
		.default(''),

	time_end: z
		.string()
		.min(1, "Les horaires de réservation du lieux sont requises pour pouvoir confirmer l'événement")
		.default(''),

	start_public: z
		.string()
		.min(1, "L'horaire d'ouverture du lieu est requise pour pouvoir confirmer l'événement")
		.default(''),

	start_event: z.string().default(''),

	dateStart: z.string().datetime().optional(),
	dateEnd: z.string().datetime().optional(),

	// Catégories et salles
	categories: z.array(z.string()).min(1, 'Sélectionnez au moins une catégorie').default([]),

	rooms: z.array(z.string()).min(1, 'Sélectionnez au moins une salle').default([]),

	description: z.string().optional(),
	desc_public: z.string().optional(),

	// Prix et restrictions
	is_prix_libre: z.boolean().default(true),
	prix: z.string().optional(),
	isMixiteChoisie: z.boolean().default(false),
	mixite: z.string().optional(),
	is_age_no_restriction: z.boolean().default(true),
	age_advice: z.string().optional(),

	// Statuts
	isConfirmed: z.boolean().default(false),
	isPublic: z.boolean().default(true),
	isPublished: z.boolean().default(false),
	isSendToNewsletter: z.boolean().default(false),
	canceled: z.boolean().default(false),

	// Récurrence
	isRecurrent: z.boolean().default(false),
	isMasterRecurrent: z.boolean().default(false),
	masterRecurrentId: z.string().optional(),
	recurrence: RecurrenceSchema.nullable().optional(),

	// Sondage et dates proposées
	isSondage: z.boolean().default(false),
	dates_proposed: z.array(DateProposedSchema).nullable(),

	// Organisateurs et tâches
	organizers: z.array(OrganizerSchema).min(1, 'Au moins un organisateur est requis'),
	tasks: z.array(z.string()).min(1, 'Au moins une tâche est requise'),

	// Autres
	link: z.string().url().optional().nullable(),
	image: z.array(z.string()).optional(),
	duree: z.string().optional(),

	// Reporting
	reportedTo: z.string().optional(),
	reportedFrom: z.string().optional(),
	inConflictWith: z.array(z.string()).optional(),

	external_proposal: z
		.object({
			period_preference: z.string().optional(),
			proposals: z.array(ProposalSchema).optional()
		})
		.optional()
		.default({}),

	other_date_query: z.array(z.string()).optional()
});

//--- types inférés

export type EventFormType = z.infer<typeof EventFormSchema>;

export type OrganizerType = z.infer<typeof OrganizerSchema>;
export type OrganizerSchemaDatesProposed = z.infer<typeof OrganizerSchemaDatesProposed>;
export type RecurrenceType = z.infer<typeof RecurrenceSchema>;

export type DateProposedType = z.infer<typeof DateProposedSchema>;
export type ProposalType = z.infer<typeof ProposalSchema>;
export type ExternalProposalType = z.infer<typeof ExternalProposalSchema>;

// pour le modal dateAndOrg
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

//--- Schéma de sauvegarde (minimal)
export const SaveEventSchema = EventFormSchema.pick({
	event_title: true
});

export const SaveRecurrentMasterSchema = EventFormSchema.pick({
	event_title: true,
	rooms: true,
	categories: true,
	description: true,
	isRecurrent: true,
	recurrence: true
}).required();

//--- Schéma de publication (plus strict)
export const PublishEventSchema = EventFormSchema.pick({
	event_title: true,
	date_event: true,
	rooms: true,
	categories: true,
	desc_public: true,
	organizers: true,
	time_start: true,
	time_end: true,
	start_event: true,
	start_public: true
}).required();

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
	tasks: z.string().array().default([]),
	duree: z.string().min(1, "La durée de l'événement est requise")
});

export type PropositionFormType = z.infer<typeof PropositionFormSchema>;
