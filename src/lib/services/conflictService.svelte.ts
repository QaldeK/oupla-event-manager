import { findConflictsForEvent, type Conflict } from "./eventConflicts";
import { eventsStore } from "$lib/shared/eventsStore.svelte";
import { isValidDate } from "$lib/utils";
import { format } from "date-fns";

export interface ConflictCalculationOptions {
	eventId?: string;
	startDate: Date | null;
	endDate: Date | null;
	rooms: string[];
	includeCloseEvents?: boolean;
}

export interface ConflictResult {
	conflicts: Conflict[];
	hasConfirmedConflicts: boolean;
	confirmedConflicts: Conflict[];
	realConflicts: Conflict[];
	conflictIds: string[];
}

/**
 * Fonction réutilisable pour calculer les conflits
 * Peut être utilisée dans $derived ou appelée directement
 */
export function calculateConflicts(options: ConflictCalculationOptions): ConflictResult {
	const { eventId, startDate, endDate, rooms, includeCloseEvents = true } = options;

	// Validation des entrées
	if (
		!startDate ||
		!endDate ||
		!isValidDate(startDate) ||
		!isValidDate(endDate) ||
		!eventsStore.isInitialized
	) {
		return {
			conflicts: [],
			hasConfirmedConflicts: false,
			confirmedConflicts: [],
			realConflicts: [],
			conflictIds: []
		};
	}

	try {
		// Obtenir la clé de date
		const dateKey = format(startDate, "yyyy-MM-dd");
		const eventsOnDate = eventsStore.eventTimeInfoMap.get(dateKey) || [];

		// Calculer les conflits
		const conflicts = findConflictsForEvent(startDate, endDate, rooms, eventsOnDate, {
			excludeEventId: eventId,
			includeCloseEvents
		});

		// Analyser les types de conflits
		const confirmedConflicts = conflicts.filter(
			(conflict) => conflict.conflictType === "confirmed"
		);

		const realConflicts = conflicts.filter(
			(conflict) => conflict.conflictType === "confirmed" && conflict.hasSameRoom
		);

		return {
			conflicts,
			hasConfirmedConflicts: confirmedConflicts.length > 0,
			confirmedConflicts,
			realConflicts,
			conflictIds: conflicts.map((c) => c.id)
		};
	} catch (error) {
		console.error("Erreur lors du calcul des conflits:", error);
		return {
			conflicts: [],
			hasConfirmedConflicts: false,
			confirmedConflicts: [],
			realConflicts: [],
			conflictIds: []
		};
	}
}

/**
 * Classe pour gérer l'état des conflits de manière réactive et partagée
 */
export class ConflictCalculator {
	#eventId = $state<string | undefined>();
	#startDate = $state<Date | null>(null);
	#endDate = $state<Date | null>(null);
	#rooms = $state<string[]>([]);
	#includeCloseEvents = $state(true);

	constructor(options?: Partial<ConflictCalculationOptions>) {
		if (options) {
			this.updateOptions(options);
		}
	}

	updateOptions(options: Partial<ConflictCalculationOptions>) {
		if (options.eventId !== undefined) this.#eventId = options.eventId;
		if (options.startDate !== undefined) this.#startDate = options.startDate;
		if (options.endDate !== undefined) this.#endDate = options.endDate;
		if (options.rooms !== undefined) this.#rooms = options.rooms;
		if (options.includeCloseEvents !== undefined)
			this.#includeCloseEvents = options.includeCloseEvents;
	}

	// 👉 Getters réactifs - Svelte 5 les rend automatiquement réactifs
	get result(): ConflictResult {
		return calculateConflicts({
			eventId: this.#eventId,
			startDate: this.#startDate,
			endDate: this.#endDate,
			rooms: this.#rooms,
			includeCloseEvents: this.#includeCloseEvents
		});
	}

	get conflicts() {
		return this.result.conflicts;
	}
	get hasConfirmedConflicts() {
		return this.result.hasConfirmedConflicts;
	}
	get confirmedConflicts() {
		return this.result.confirmedConflicts;
	}
	get realConflicts() {
		return this.result.realConflicts;
	}
	get conflictIds() {
		return this.result.conflictIds;
	}
}
