import type { TaskType } from "./event.types";

/**
 * Définit les identifiants uniques pour chaque règle de validation possible dans l'application.
 * Ceci est utilisé comme clé dans l'objet d'erreurs pour lier un message d'erreur à un champ spécifique.
 */
export type ValidationRule =
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

/**
 * Représente le contrat unifié pour le résultat d'une opération de validation d'événement.
 * Cette interface garantit que, peu importe d'où vient la validation (statique ou réactive),
 * l'objet de résultat aura toujours la même forme, facilitant sa consommation.
 */
export interface ValidationResult {
	/** Indique si l'événement est considéré comme valide selon les règles appliquées. */
	isValid: boolean;

	/** Un objet contenant les erreurs de validation spécifiques, avec la règle comme clé. */
	errors: Partial<Record<ValidationRule, string>>;

	/** La liste des tâches qui ne sont pas encore assignées à un organisateur. */
	unassignedTasks: TaskType[];

	/** Un booléen indiquant s'il y a des tâches non assignées. */
	hasUnassignedTasks: boolean;

	/**
	 * Une méthode pour obtenir un simple tableau des messages d'erreur.
	 * Utile pour afficher un résumé des erreurs à l'utilisateur.
	 */
	getErrors: () => string[];
}
