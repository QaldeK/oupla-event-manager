import { format, startOfMonth, endOfMonth, addDays, getDay, addWeeks, parse } from "date-fns";
import { fr } from "date-fns/locale";

// Types depuis event.schema
import type { EventType, RecurrenceType, RecurrenceConfigType } from "$lib/types/event.types";

export function getNthDayOfMonth(date: Date, dayOfWeek: number, occurrence: number) {
	let currentDay = startOfMonth(date);
	const end = endOfMonth(date);

	let count = 0;
	while (currentDay <= end) {
		if (getDay(currentDay) === dayOfWeek) {
			count++;
			if (count === occurrence) {
				// Check if the found date is within the month of the original date
				// This handles cases where getNthDayOfMonth might cross into the next month
				if (currentDay.getMonth() === date.getMonth()) {
					return currentDay;
				} else {
					// If it crosses month boundary, it means the Nth occurrence doesn't exist for that month
					return null; // Or handle appropriately, maybe throw error or log?
				}
			}
		}
		// Ensure we don't infinite loop if start is already end of month
		if (currentDay.getTime() === end.getTime()) break;
		currentDay = addDays(currentDay, 1);
	}
	return null; // Nth occurrence not found
}

export function getLastDayOfWeekInMonth(date: Date, dayOfWeek: number) {
	let currentDay = endOfMonth(date);

	// Go back max 6 days to find the last occurrence
	for (let i = 0; i < 7; i++) {
		if (getDay(currentDay) === dayOfWeek) {
			return currentDay;
		}
		if (currentDay.getDate() === 1) break; // Stop if we reach the beginning of the month
		currentDay = addDays(currentDay, -1);
	}
	return null;
}

export function getOccurrenceInMonth(date: Date) {
	const dayOfWeek = getDay(date);
	const monthStart = startOfMonth(date);
	const monthEnd = endOfMonth(date);
	let currentDay = monthStart;
	let count = 0;
	while (currentDay <= date) {
		if (getDay(currentDay) === dayOfWeek) {
			count++;
		}
		if (currentDay.getTime() === date.getTime()) break; // Arrêt précis
		if (currentDay >= monthEnd) break; // Sécurité fin de mois
		currentDay = addDays(currentDay, 1);
	}
	// Vérifier si c'est la dernière occurrence du mois
	const nextOccurrence = addWeeks(date, 1); // Date de la semaine suivante
	// Si la semaine suivante est toujours dans le même mois, ce n'était pas la dernière
	const isLast = nextOccurrence.getMonth() !== date.getMonth();

	return isLast ? 5 : count; // 5 pour 'Dernier'
}

function getOccurrenceLabel(occurrence: number): string {
	switch (occurrence) {
		case 1:
			return "1er";
		case 2:
			return "2eme";
		case 3:
			return "3eme";
		case 4:
			return "4eme";
		case 5:
			return "Dernier";
		default:
			return "";
	}
}

export function getFormattedLabel(occurrence: number, date: string) {
	if (!occurrence || !date) return "";
	try {
		return `${getOccurrenceLabel(occurrence)} ${format(date, "EEEE", { locale: fr })}`;
	} catch {
		return ""; // Handle potential parse error
	}
}

export const formatRecurrence = (recurrence: NonNullable<EventType["recurrence"]>): string => {
	const recurrenceTypes: Record<RecurrenceType, string> = {
		WEEKLY: "Hebdomadaire",
		BIWEEKLY: "Bi-hebdomadaire",
		MONTHLY_BY_DATE: "Mensuel (date fixe)",
		MONTHLY_BY_DAY: "Mensuel"
	};

	return recurrenceTypes[recurrence.recurrenceType as RecurrenceType] || recurrence.recurrenceType;
};

/**
 * Génère une description lisible de la récurrence
 * @param recurrence - L'objet de récurrence à décrire
 * @returns Une chaîne décrivant la récurrence de manière lisible
 */
export function getRecurrenceLabel(recurrence: RecurrenceConfigType): string {
	if (!recurrence.firstDate || !recurrence.recurrenceType) return "";

	try {
		const firstDate =
			typeof recurrence.firstDate === "string"
				? parse(recurrence.firstDate, "yyyy-MM-dd", new Date())
				: new Date(recurrence.firstDate);

		const weekdayName = format(firstDate, "EEEE", { locale: fr });
		const dateNumber = format(firstDate, "d", { locale: fr });

		switch (recurrence.recurrenceType) {
			case "WEEKLY":
				return `Tous les ${weekdayName}s`;

			case "BIWEEKLY":
				return `Un ${weekdayName} sur deux`;

			case "MONTHLY_BY_DATE":
				return `Tous les ${dateNumber} du mois`;

			case "MONTHLY_BY_DAY": {
				const occurrences = recurrence.monthlyByDayOccurrences;
				if (!occurrences?.length) {
					return `Tous les ${weekdayName}s du mois`;
				}

				if (occurrences.length === 1) {
					return getFormattedLabel(occurrences[0], recurrence.firstDate);
				}

				const ordinals = occurrences.map((occurrence) => getOccurrenceLabel(occurrence)).sort();
				const formatter = new Intl.ListFormat("fr", { style: "long", type: "conjunction" });
				return `Les ${formatter.format(ordinals)} ${weekdayName}s du mois`;
			}

			default:
				return "";
		}
	} catch (error) {
		console.error("Error formatting recurrence label:", error);
		return "";
	}
}

// Fonction de rétrocompatibilité - maintenue pour éviter les régressions
export function getMonthlyRecurrenceLabel(recurrence: RecurrenceConfigType): string {
	if (recurrence.recurrenceType !== "MONTHLY_BY_DAY") {
		// Utiliser la nouvelle fonction pour les autres types
		return getRecurrenceLabel(recurrence);
	}

	const occurrences = recurrence.monthlyByDayOccurrences;
	const firstDate = recurrence.firstDate;
	if (!occurrences?.length || !firstDate) {
		return "";
	}

	try {
		const weekday = format(firstDate, "EEEE", { locale: fr });

		if (occurrences.length === 1) {
			return getFormattedLabel(occurrences[0], firstDate);
		}

		const ordinals = occurrences.map((occurrence) => getOccurrenceLabel(occurrence)).sort(); // Sort labels for consistency
		// Use Intl.ListFormat for proper grammatical listing (e.g., "1er, 2ème et Dernier")
		// Ensure 'fr' locale is supported by the browser or polyfill Intl.ListFormat
		const formatter = new Intl.ListFormat("fr", { style: "long", type: "conjunction" });
		return `Les ${formatter.format(ordinals)} ${weekday}s du mois`;
	} catch (error) {
		console.error("Error formatting occurrence label:", error);
		return "";
	}
}

import { userDb } from "$lib/shared/userDb.svelte";
import type { UserType } from "$lib/types/types";

export const hasAuthorizations = (params: {
	isRecurrent?: boolean;
	recurrenceTeam?: { id: string; username: string }[];
	createdBy?: string;
}): boolean => {
	const currentUser = userDb.current;
	const currentRole = userDb.currentRole;

	if (!currentUser) return false;

	// Admin a toujours les droits pour les événement non récurrent
	if (currentRole === "admin") return true;

	// Vérifie si l'utilisateur fait partie de l'équipe récurrente
	if (params.isRecurrent && params.recurrenceTeam?.some((member) => member.id === currentUser.id)) {
		return true;
	}

	// Vérifie si l'utilisateur est le créateur
	if (params.createdBy === currentUser.id) {
		return true;
	}

	return false;
};

/**
 * Vérifie si l'utilisateur actuel fait partie de l'équipe de récurrence d'un événement
 * @param currentUser - L'utilisateur actuel
 * @param recurrenceTeam - L'équipe de récurrence de l'événement (optionnel)
 * @returns boolean - True si l'utilisateur est dans l'équipe ou admin, false sinon
 */
export const isInTeam = (
	currentUser: UserType | null,
	recurrenceTeam?: { id: string; username: string }[]
): boolean => {
	if (!currentUser) return false;

	// Si on a une recurrenceTeam, on vérifie si l'utilisateur en fait partie
	if (recurrenceTeam && recurrenceTeam.length > 0) {
		return recurrenceTeam.some((member) => member.id === currentUser.id);
	}

	return false;
};
