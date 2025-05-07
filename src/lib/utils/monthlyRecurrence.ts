import { format, startOfMonth, endOfMonth, addDays, getDay, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";

// Types depuis event.schema
import type { RequiredRecurrenceType } from "$lib/schemas/event.schema";

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

// TODO : créer une fonction plus générique pour la description lisible de la récurrence (tous les 12 du mois, etc..)
export function getMonthlyRecurrenceLabel(recurrence: RequiredRecurrenceType): string {
	if (recurrence.recurrenceType !== "MONTHLY_BY_DAY") return "";
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
