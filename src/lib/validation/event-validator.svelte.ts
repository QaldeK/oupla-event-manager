import type { EventType } from "$lib/types/event.types";
import { getUnassignedTasks } from "$lib/services/eventActions";
import type { TaskType } from "$lib/types/event.types";
import type { ValidationResult, ValidationRule } from "$lib/types/validation.types";

// Nouveaux types pour les profils de validation
export type ValidationProfile = "DRAFT" | "STANDARD_EVENT" | "RECURRENT_MASTER";

interface ValidatorConfig {
	profile?: ValidationProfile | null;
}

type ValidatorFunction = (event: EventType) => string | undefined;

const PROFILE_RULES: Record<ValidationProfile, ValidationRule[]> = {
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

const VALIDATORS_CACHE = createValidators();

// 👉 Validators functions (extraites pour réutilisation)
function createValidators(): Record<ValidationRule, ValidatorFunction> {
	console.log("createValidators called");

	return {
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
				return "Sélectionnez au moins une salle pour pouvoir confirmer l'événement";
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
			if (e.isRecurrent && e.recurrence && !e.isConfirmed) {
				const minRequired = e.recurrence.minOrganizersRequired ?? 1;
				if ((e.organizers?.length || 0) < minRequired) {
					return `Définissez au moins ${minRequired} organisateur•ice${minRequired > 1 ? "s" : " pour confirmer l'événement"}`;
				}
			} else {
				if ((e.organizers?.length || 0) < 1 && !e.isConfirmed) {
					return "Définissez au moins un·e organisateur·ice pour confirmer l'événement";
				} else if ((e.organizers?.length || 0) < 1 && e.isConfirmed) {
					return "Attention, cet événement est confirmé mais n'a plus d'organisateur·ice.";
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
				return "L'horaire d'ouverture au public est requise pour pouvoir confirmer un événement public";
			}
			return undefined;
		},

		unassignedTasksCheck: (e) => {
			if (!e.recurrence?.allTasksRequired) {
				return undefined; // 👉 Sortie rapide - pas de calcul
			}

			const unassignedTasks = getUnassignedTasks(e);
			if (unassignedTasks.length === 0) {
				return undefined;
			}

			return `Toutes les tâches doivent être assignées (non assignées:  ${unassignedTasks
				.map((task) => task.name)
				.join(", ")})`;
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
}

// 👉 fonction statique pour validation one-shot

// 👉 Fonction pour déterminer le profil de validation basé sur l'événement
export function determineValidationProfile(event: EventType): ValidationProfile {
	// Événement existant
	if (event.id) {
		if (event.isMasterRecurrent) return "RECURRENT_MASTER";
		if (!event.isConfirmed) return "DRAFT";
		return "STANDARD_EVENT";
	}

	// Nouvel événement
	if (event.isMasterRecurrent) return "RECURRENT_MASTER";
	if (!event.isConfirmed) return "DRAFT";
	return "STANDARD_EVENT";
}

export function validateEventStatic(
	event: EventType,
	profile: ValidationProfile = "STANDARD_EVENT"
): ValidationResult {
	const rulesForProfile = PROFILE_RULES[profile];
	const errors: Partial<Record<ValidationRule, string>> = {};

	// Validation de chaque règle
	rulesForProfile.forEach((rule) => {
		const error = VALIDATORS_CACHE[rule]?.(event); // 👉 Cache global !
		if (error) {
			errors[rule] = error;
		}
	});

	let unassignedTasks: TaskType[] = [];
	let hasUnassignedTasks = false;

	if (profile === "STANDARD_EVENT" && event.recurrence?.allTasksRequired) {
		unassignedTasks = getUnassignedTasks({ ...event });
		hasUnassignedTasks = unassignedTasks.length > 0;
	}
	const hasRuleErrors = Object.keys(errors).length > 0;
	const unassignedBlock =
		profile === "STANDARD_EVENT" && event.recurrence?.allTasksRequired && hasUnassignedTasks;

	return {
		isValid: !hasRuleErrors && !unassignedBlock,
		errors,
		unassignedTasks,
		hasUnassignedTasks,
		getErrors(): string[] {
			const errorMessages = Object.values(errors).filter(Boolean) as string[];

			return errorMessages;
		}
	};
}

// 👉 Validateur réactif
export function createEventValidator(initialEvent: EventType, config: ValidatorConfig = {}) {
	console.log("createEventValidator");

	let event = $state<EventType>(initialEvent);
	let activeProfile = $state<ValidationProfile | null>(config.profile || null);

	const activeProfileErrors = $derived.by(() => {
		if (!activeProfile) return {};
		const result: Partial<Record<ValidationRule, string>> = {};
		const rulesForCurrentProfile = PROFILE_RULES[activeProfile];

		rulesForCurrentProfile.forEach((rule) => {
			const error = VALIDATORS_CACHE[rule](event); // 👉 Cache global
			if (error) {
				result[rule] = error;
			}
		});
		return result;
	});

	console.log("error", activeProfileErrors);

	// 👉 Calculs des tache non assignées quand nécessaire
	const unassignedTasks = $derived.by((): TaskType[] => {
		if (!activeProfile) return [];
		const rulesForCurrentProfile = PROFILE_RULES[activeProfile];
		if (!rulesForCurrentProfile.includes("unassignedTasksCheck")) {
			return [];
		}

		if (!event.recurrence?.allTasksRequired) {
			return [];
		}

		return getUnassignedTasks(event);
	});

	const hasUnassignedTasks = $derived(unassignedTasks.length > 0);

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
		get hasActiveProfile() {
			return activeProfile !== null;
		},

		isValid: (profile?: ValidationProfile): boolean => {
			// 👉 Délègue à la fonction statique !
			// XXX Pourquoi ?
			const result = validateEventStatic(event, profile || activeProfile || "STANDARD_EVENT");
			return result.isValid;
		},

		getErrors: (profile?: ValidationProfile): string[] => {
			// 👉 Délègue à la fonction statique !
			const result = validateEventStatic(event, profile || activeProfile || "STANDARD_EVENT");
			return result.getErrors();
		},

		get unassignedTasks() {
			return unassignedTasks;
		},
		get hasUnassignedTasks() {
			return hasUnassignedTasks;
		}
	};
}
