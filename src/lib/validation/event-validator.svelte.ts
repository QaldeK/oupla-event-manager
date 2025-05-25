import type { EventType } from "$lib/types/event.types";

// Types des règles de validation individuelles
type ValidationRule =
	| "title"
	| "categories"
	| "rooms"
	| "tasks"
	| "date"
	| "timeStart"
	| "timeEnd"
	| "organizers"
	| "price"
	| "mixite"
	| "age"
	| "publicDescription"
	| "publicStartTime"
	| "recurrenceFirstDate"
	| "recurrenceLastDate"
	| "recurrenceOccurrences"
	| "recurrenceTeam"
	| "recurrenceTasks"
	| "unassignedTasksCheck";

// Nouveaux types pour les profils de validation
export type ValidationProfile = "DRAFT" | "STANDARD_EVENT" | "RECURRENT_MASTER";

interface ValidatorConfig {
	profile?: ValidationProfile;
}

type ValidatorFunction = (event: EventType) => string | undefined;

export function createEventValidator(initialEvent: EventType, config: ValidatorConfig = {}) {
	let event = $state<EventType>(initialEvent);
	let activeProfile = $state<ValidationProfile>(config.profile || "STANDARD_EVENT"); // Profil par défaut

	// Définition centralisée des règles pour chaque profil
	const profileRules: Record<ValidationProfile, ValidationRule[]> = {
		DRAFT: ["title"],
		STANDARD_EVENT: [
			"title",
			"categories",
			"rooms",
			"tasks",
			"date",
			"timeStart",
			"timeEnd",
			"organizers",
			"price",
			"mixite",
			"age",
			"publicDescription",
			"publicStartTime",
			"unassignedTasksCheck"
		],
		RECURRENT_MASTER: [
			"title",
			"categories",
			"rooms",
			"timeStart",
			"timeEnd",
			"price",
			"mixite",
			"age",
			"publicDescription",
			"publicStartTime",
			"recurrenceFirstDate",
			"recurrenceLastDate",
			"recurrenceOccurrences",
			"recurrenceTeam",
			"recurrenceTasks"
		]
	};

	// Validateurs individuels
	const validators: Record<ValidationRule, ValidatorFunction> = {
		title: (e) => {
			const title = e.event_title?.trim();
			if (!title) return "Le titre de l'événement est requis";
			if (title.length < 2) return "Le titre de l'événement doit avoir au moins 2 caractères";
			if (title.length > 80) return "Le titre de l'événement doit avoir moins de 80 caractères";
			return undefined;
		},
		categories: (e) => {
			if (!e.categories || e.categories.length === 0) {
				return "Sélectionnez au moins une catégorie pour confirmer l'événement";
			}
			return undefined;
		},
		rooms: (e) => {
			if (!e.rooms || e.rooms.length === 0) {
				return "Sélectionnez au moins une salle pour confirmer l'événement";
			}
			return undefined;
		},
		tasks: (e) => {
			if (!e.tasks || e.tasks.length === 0) {
				return "Au moins une tâche est requise pour confirmer l'événement";
			}
			return undefined;
		},
		date: (e) => {
			if (!e.date_event) {
				return "La date de l'événement est requise pour confirmer l'événement";
			}
			return undefined;
		},
		timeStart: (e) => {
			if (!e.time_start) {
				return "L'heure de début est requise pour confirmer l'événement";
			}
			return undefined;
		},
		timeEnd: (e) => {
			if (!e.time_end) {
				return "L'heure de fin est requise pour confirmer l'événement";
			}
			return undefined;
		},
		organizers: (e) => {
			if (e.isRecurrent && e.recurrence) {
				const minRequired = e.recurrence.minOrganizersRequired ?? 1;
				if ((e.organizers?.length || 0) < minRequired) {
					return `Au moins ${minRequired} organisateur${minRequired > 1 ? "s sont requis" : " est requis"}`;
				}
			} else {
				if ((e.organizers?.length || 0) < 1) {
					return "Au moins un organisateur est requis pour confirmer l'événement";
				}
			}
			return undefined;
		},
		price: (e) => {
			if (!e.is_prix_libre && (!e.prix || e.prix.trim() === "")) {
				return "Le prix est requis lorsque le prix n'est pas libre";
			}
			return undefined;
		},
		mixite: (e) => {
			if (e.isMixiteChoisie && (!e.mixite || e.mixite.trim() === "")) {
				return "La description de la mixité est requise lorsque la mixité est choisie";
			}
			return undefined;
		},
		age: (e) => {
			if (!e.is_age_no_restriction && !e.age_advice) {
				return "L'âge minimum est requis lorsque l'événement n'est pas tout public";
			}
			return undefined;
		},
		publicDescription: (e) => {
			if (e.isPublic && (!e.desc_public || e.desc_public.length < 14)) {
				return "Une description est requise pour pouvoir confirmer les événements publics";
			}
			return undefined;
		},
		publicStartTime: (e) => {
			if (e.isPublic && (!e.start_public || e.start_public.trim() === "")) {
				return "L'horaire d'ouverture du lieu est requis pour pouvoir confirmer un événement public";
			}
			return undefined;
		},

		unassignedTasksCheck: (e) => {
			if (e.recurrence?.allTasksRequired && hasUnassignedTasks()) {
				// hasUnassignedTasks() est $derived
				return `Toutes les tâches doivent être assignées : ${unassignedTasks
					.map((task) => task.name)
					.join(", ")}`;
			}
			return undefined;
		},

		recurrenceFirstDate: (e) => {
			if (e.isRecurrent && e.recurrence && !e.recurrence.firstDate) {
				return "La date de début est requise";
			}
			return undefined;
		},
		recurrenceLastDate: (e) => {
			if (e.isRecurrent && e.recurrence && !e.recurrence.lastDate) {
				return "La date de fin est requise";
			}
			return undefined;
		},
		recurrenceOccurrences: (e) => {
			if (
				e.isRecurrent &&
				e.recurrence &&
				e.recurrence.recurrenceType === "MONTHLY_BY_DAY" &&
				e.recurrence.monthlyByDayOccurrences.length === 0
			) {
				return "Au moins une occurrence est requise pour la récurrence mensuelle par jour";
			}
			return undefined;
		},
		recurrenceTeam: (e) => {
			if (e.isRecurrent && e.recurrence && e.recurrence.recurrenceTeam.length === 0) {
				return "L'équipe récurrente doit avoir au moins un membre";
			}
			return undefined;
		},
		recurrenceTasks: (e) => {
			if (e.isRecurrent && e.recurrence && e.recurrence.tasks.length === 0) {
				return "Au moins une tâche est requise pour la récurrence";
			}
			return undefined;
		}
	};

	// Calcul des tâches non assignées
	const unassignedTasks = $derived.by(() => {
		if (!Array.isArray(event.tasks) || !Array.isArray(event.organizers)) {
			return [];
		}
		const assignedTasks = event.organizers.flatMap((org) => org.tasks || []);
		return event.tasks.filter((task) => !assignedTasks.includes(task.name));
	});
	const hasUnassignedTasks = $derived(() => unassignedTasks.length > 0);

	// Erreurs pour le profil ACTIF (calculées réactivement)
	const activeProfileErrors = $derived.by(() => {
		const result: Partial<Record<ValidationRule, string>> = {};
		const rulesForCurrentProfile = profileRules[activeProfile];

		rulesForCurrentProfile.forEach((rule) => {
			const error = validators[rule](event);
			if (error) {
				result[rule] = error;
			}
		});
		return result;
	});

	return {
		updateEvent: (newEvent: EventType) => {
			event = newEvent;
		},
		setProfile: (newProfile: ValidationProfile) => {
			activeProfile = newProfile;
		},
		get event() {
			return event;
		},
		get errors() {
			return activeProfileErrors;
		},
		isValid: (profile?: ValidationProfile): boolean => {
			const profileToValidate = profile || activeProfile;
			const rulesToValidate = profileRules[profileToValidate];

			const hasRuleErrors = rulesToValidate.some((rule) => validators[rule](event) !== undefined);

			return !hasRuleErrors;
		},

		getErrors: (profile?: ValidationProfile): string[] => {
			const profileToQuery = profile || activeProfile;
			const rulesForProfile = profileRules[profileToQuery];

			const errorMessages = rulesForProfile
				.map((rule) => validators[rule](event))
				.filter(Boolean) as string[];
			return errorMessages;
		},

		get unassignedTasks() {
			return unassignedTasks;
		},
		get hasUnassignedTasks() {
			return hasUnassignedTasks();
		}
	};
}
