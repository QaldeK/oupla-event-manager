// src/lib/services/eventActions.ts
import {
	createEvent,
	createRecurrentEvent,
	pb,
	updateAllOccurrences,
	updateEvent,
	updateReciprocalConflicts
} from "$lib/pocketbase.svelte";
import { ConflictCalculator, calculateConflicts } from "$lib/services/conflictService.svelte";
import type { ConfirmModalData } from "$lib/shared/states.svelte";
import type {
	EventMode,
	EventType,
	RecurrenceConfigType,
	RecurrenceType
} from "$lib/types/event.types";
import type { EventsRecord } from "$lib/types/pocketbase";
import type { DateProposedType, UserType } from "$lib/types/types";
import { filterAndConvertOrganizers, formatDatePb, formatTimePb } from "$lib/utils";

// ::: 1. TYPES D'ACTION :::

export type EventActionPlan =
	| { type: "PROCEED_DIRECTLY"; action: () => Promise<EventActionPlan> }
	| { type: "SUCCESS"; message?: string; payload?: unknown }
	| { type: "ERROR"; message: string; error?: unknown }
	| {
			type: "NEEDS_CONFIRMATION";
			confirmationDetails: Omit<ConfirmModalData, "onConfirm">;
			onConfirmedAction: (notify?: boolean) => Promise<EventActionPlan>;
	  }
	| { type: "NEEDS_COMPLETION"; completionDetails: { eventData: Partial<EventType> } };

// ::: 2. LOGIQUE DE SAUVEGARDE :::

/**
 * Nettoie les données d'un événement avant envoi à PocketBase
 * Supprime les champs générés par PocketBase et non compatibles
 */
function cleanEventDataForPocketBase(event: EventType | Partial<EventType>): Partial<EventsRecord> {
	const cleanedData = { ...event };

	// Supprimer les champs générés par PocketBase
	const fieldsToRemove = [
		"id",
		"collectionId",
		"collectionName",
		"created",
		"updated",
		"expand"
	] as const;

	fieldsToRemove.forEach((field) => {
		if (field in cleanedData) {
			delete (cleanedData as Record<string, unknown>)[field];
		}
	});

	return cleanedData;
}

/**
 * Fonction pure pour sauvegarder un événement
 * @param eventData - Données de l'événement à sauvegarder
 * @param eventMode - Mode de l'événement
 * @param shouldConfirm - Si l'événement doit être confirmé
 * @param conflictDetection - Résultat de la détection des conflits
 * @param notifyOthers - Si les autres doivent être notifiés
 * @param hasSondageValidation - Si une validation de sondage a eu lieu
 * @returns EventActionPlan avec le résultat de l'opération
 */
export async function submitEvent(
	eventData: EventType,
	options: {
		mode: EventMode;
		wantsToConfirmEvent: boolean;
		conflictIds: string[];
		notify?: boolean;
		hasSondageValidation?: boolean;
		currentUser?: UserType;
	}
): Promise<EventActionPlan> {
	try {
		// Confirmer l'événement si demandé
		if (options.wantsToConfirmEvent) {
			eventData.isConfirmed = true;
		}

		// 👉 Utiliser les conflits détectés de manière unifiée
		const conflictIds = options.conflictIds;
		let createdEventIds: string[] = [];

		// Sauvegarde selon le mode
		switch (options.mode) {
			case "NEW_SINGLE": {
				const createdEvent = await createEvent(eventData);
				// 👉 Pour un nouvel événement, on récupère l'ID créé
				if (createdEvent?.id) {
					eventData.id = createdEvent.id;
					createdEventIds = [createdEvent.id];
				}
				break;
			}
			case "NEW_RECURRENT": {
				const result = await createRecurrentEvent(eventData);
				// 👉 Récupérer les IDs des événements créés
				console.log("✅ Événements créés:", result);
				if (result?.eventIds) {
					createdEventIds = result.eventIds;
					console.log("📋 IDs récupérés:", createdEventIds);
				} else {
					console.warn("⚠️ Pas d'eventIds retournés");
				}
				break;
			}
			case "EDIT_SINGLE":
			case "EDIT_RECURRENT_ONE": {
				// Nettoyer les données avant envoi à PocketBase
				const cleanedData = cleanEventDataForPocketBase(eventData);
				await updateEvent(eventData.id, cleanedData);
				break;
			}
			case "EDIT_RECURRENT_ALL": {
				const result = await updateAllOccurrences(eventData);
				// 👉 Récupérer les IDs des événements mis à jour
				if (result?.eventIds) {
					createdEventIds = result.eventIds;
				}
				break;
			}
		}

		// 👉 Gérer les conflits après sauvegarde
		// Pour les événements modifiés, toujours appeler la gestion des conflits pour nettoyer les anciens
		const isEditMode =
			options.mode === "EDIT_SINGLE" ||
			options.mode === "EDIT_RECURRENT_ONE" ||
			options.mode === "EDIT_RECURRENT_ALL";
		const shouldManageConflicts =
			conflictIds.length > 0 || (isEditMode && eventData.inConflictWith?.length > 0);

		if (shouldManageConflicts) {
			console.log(
				"🔧 Gestion conflits - Mode:",
				options.mode,
				"IDs:",
				createdEventIds,
				"Conflits simples:",
				conflictIds,
				"Anciens conflits:",
				eventData.inConflictWith
			);
			await handleEventConflictsAfterSave(
				options.mode,
				eventData,
				conflictIds,
				createdEventIds,
				new Map()
			);
		}

		// 👉 Les notifications sont maintenant gérées dans eventActionHandler
		// pour éviter les doublons et avoir une gestion centralisée

		return {
			type: "SUCCESS",
			message: "L'événement a été enregistré avec succès.",
			payload: { eventId: eventData.id, createdEventIds }
		};
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : "Une erreur est survenue lors de l'enregistrement.";
		console.error("Erreur lors de la sauvegarde de l'événement:", error);
		return {
			type: "ERROR",
			message: errorMessage,
			error
		};
	}
}

// ::: 3. FONCTIONS UTILITAIRES POUR LA GÉNÉRATION DE MESSAGES :::

/**
 * Génère un message de conflit formaté pour les confirmations
 * @param conflictDetection - Résultat de la détection des conflits
 * @param eventMode - Mode de l'événement (optionnel)
 * @param eventData - Données de l'événement (optionnel)
 * @returns Message formaté pour l'affichage
 * USELESS ?
 */
// export function generateConflictMessage(
// 	conflictDetection: ReturnType<typeof detectAllEventConflicts>,
// 	eventMode?: string,
// 	eventData?: EventType
// ): string {
// 	const { conflictIds, totalConflictCount, recurrentConflictsMap } = conflictDetection;

// 	// Helper pour formater les informations d'un événement en conflit
// 	const formatConflictEvent = (eventId: string): string => {
// 		const conflictEvent = eventsStore.getEventById(eventId);
// 		if (!conflictEvent) return `Événement ${eventId}`;

// 		const timeInfo =
// 			conflictEvent.time_start && conflictEvent.time_end
// 				? `de ${conflictEvent.time_start} à ${conflictEvent.time_end}`
// 				: "";

// 		const roomInfo = conflictEvent.rooms?.length ? ` (${conflictEvent.rooms.join(", ")})` : "";

// 		const statusInfo = conflictEvent.isConfirmed ? " [confirmé]" : " [non confirmé]";

// 		return `• ${conflictEvent.event_title}${statusInfo} ${timeInfo}${roomInfo}`;
// 	};

// 	let message = ``;

// 	if (eventMode === "NEW_RECURRENT" || eventMode === "EDIT_RECURRENT_ALL") {
// 		// Pour les événements récurrents, détailler par date
// 		if (recurrentConflictsMap.size > 0) {
// 			message += `Certaines occurrences de votre événement récurrent sont en conflit :\n\n`;

// 			for (const [dateStr, dateConflictIds] of recurrentConflictsMap) {
// 				const dateObj = new Date(dateStr);
// 				const formattedDate = dateObj.toLocaleDateString("fr-FR", {
// 					weekday: "long",
// 					year: "numeric",
// 					month: "long",
// 					day: "numeric"
// 				});

// 				message += `<bold>${formattedDate} :</bold><br/>`;
// 				dateConflictIds.forEach((conflictId) => {
// 					message += `  ${formatConflictEvent(conflictId)}\n`;
// 				});
// 				message += `\n`;
// 			}
// 		}
// 	} else {
// 		// Pour les événements simples
// 		const eventDate = eventData?.date_event ? new Date(eventData.date_event) : null;
// 		const formattedDate =
// 			eventDate?.toLocaleDateString("fr-FR", {
// 				weekday: "long",
// 				year: "numeric",
// 				month: "long",
// 				day: "numeric"
// 			}) || "la date sélectionnée";

// 		message += `Votre événement entre en conflit avec ${conflictIds.length} autre${conflictIds.length > 1 ? "s" : ""} événement${conflictIds.length > 1 ? "s" : ""} le ${formattedDate} :<br/>`;

// 		conflictIds.forEach((conflictId) => {
// 			message += `${formatConflictEvent(conflictId)}<br/>`;
// 		});
// 	}

// 	message += `<br/>Voulez-vous continuer malgré ${totalConflictCount > 1 ? "ces conflits" : "ce conflit"} ?`;

// 	return message;
// }

/**
 * Génère un message de conflit simplifié pour une date proposée
 * @param dateProposed - Date proposée à valider
 * @param currentEvent - Événement actuel
 * @returns Message de conflit formaté ou null si pas de conflit
 */
export function generateDateProposalConflictMessage(
	dateProposed: DateProposedType,
	currentEvent: EventType
): string | null {
	// Utiliser ConflictCalculator directement
	const conflictCalculator = new ConflictCalculator();

	const startDate = new Date(dateProposed.dateStart);
	const endDate = new Date(dateProposed.dateEnd);

	conflictCalculator.updateOptions({
		eventId: currentEvent.id,
		startDate,
		endDate,
		rooms: currentEvent.rooms || [],
		includeCloseEvents: true
	});

	const conflicts = conflictCalculator.result;

	if (conflicts.conflicts.length === 0) {
		return null;
	}

	const dateFormatted = new Date(dateProposed.dateStart).toLocaleDateString("fr-FR", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric"
	});

	let message = `Cette date entre en conflit avec ${conflicts.conflicts.length} autre${conflicts.conflicts.length > 1 ? "s" : ""} événement${conflicts.conflicts.length > 1 ? "s" : ""} le ${dateFormatted} :<br/>`;

	conflicts.conflicts.forEach((conflict) => {
		const timeInfo =
			conflict.time_start && conflict.time_end
				? `de ${conflict.time_start} à ${conflict.time_end}`
				: "";
		const roomInfo = conflict.rooms?.length ? ` (${conflict.rooms.join(", ")})` : "";
		const statusInfo = conflict.conflictType === "confirmed" ? " [confirmé]" : " [non confirmé]";
		message += `• ${conflict.event_title}${statusInfo} ${timeInfo}${roomInfo}<br/>`;
	});

	// message += `<br/>Voulez-vous valider cette date malgré ${conflicts.conflicts.length > 1 ? "ces conflits" : "ce conflit"} ?`;

	return message;
}

// ::: FONCTIONS UTILITAIRES POUR LA GESTION DES CONFLITS :::
// USELESS ?

/**
 * Déduplique et nettoie une liste d'IDs de conflits
 * @param conflictIds - Liste des IDs de conflits à déduplicer
 * @param eventId - ID de l'événement actuel (à exclure de la liste)
 * @returns Liste dédupliquée et nettoyée des IDs de conflits
 */
export function deduplicateConflictIds(conflictIds: string[], eventId?: string): string[] {
	return [
		...new Set(
			conflictIds
				.filter((id) => id && typeof id === "string" && id.trim() !== "")
				.filter((id) => !eventId || id !== eventId)
		)
	];
}

/**
 * Nettoie les conflits bidirectionnels (supprime eventId des conflits des autres événements)
 * @param eventId - ID de l'événement à supprimer des conflits
 * @param conflictIdsToClean - IDs des événements dont il faut nettoyer les conflits
 */
export async function cleanupBidirectionalConflicts(
	eventId: string,
	conflictIdsToClean: string[]
): Promise<void> {
	const uniqueConflictIds = deduplicateConflictIds(conflictIdsToClean, eventId);

	for (const conflictId of uniqueConflictIds) {
		try {
			const conflictEvent = await pb.collection("events").getOne(conflictId);
			const currentConflicts = conflictEvent.inConflictWith || [];

			// 👉 Suppression de eventId avec déduplication
			const updatedConflicts = deduplicateConflictIds(
				currentConflicts.filter((id: string) => id !== eventId)
			);

			await updateEvent(conflictId, { inConflictWith: updatedConflicts });
		} catch (error) {
			console.warn(`Impossible de nettoyer l'ancien conflit ${conflictId}:`, error);
		}
	}
}

// ::: FONCTION UTILITAIRE POUR CRÉER UN NOUVEL ÉVÉNEMENT :::
// Cette fonction crée un nouvel événement avec des valeurs par défaut
// No Zod changes needed here
export function getNewEvent(): Partial<EventType> {
	return {
		event_title: "",
		date_event: "",
		time_start: "",
		time_end: "",
		start_public: "",
		start_event: "",
		categories: [],
		rooms: [],
		tasks: [], // Consider if default tasks should be added, e.g. based on TaskSchema
		description: "",
		desc_public: "",
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
		dates_proposed: [],
		other_date_query: []
		// space: '', // À remplir par l'application
		// external_proposal: {
		// 	period_preference: '',
		// 	proposals: []
		// }
	};
}

// No Zod changes needed here
export function getDefaultRecurrence(): Omit<RecurrenceConfigType, "recurrenceType"> & {
	recurrenceType: RecurrenceType; // This ensures recurrenceType is one of the enum values
} {
	return {
		firstDate: "",
		lastDate: "",
		recurrenceDates: [],
		recurrenceType: "WEEKLY", // Default valid enum value
		monthlyByDayOccurrences: [],
		recurrenceTeam: [],
		tasks: [], // Consider if default tasks should be added
		autoConfirm: false,
		autoConfirmMin: 1,
		notifyNoOrganizer: false,
		notifyNoOrganizerDays: 3,
		notifyNotConfirmed: false,
		notifyNotConfirmedDays: 7,
		minOrganizersRequired: 1,
		allTasksRequired: false
	};
}

/**
 * Calcule les tâches non assignées d'un événement
 */
export function getUnassignedTasks(event: EventType) {
	// console.log("{DEBUG] unassignedTasks compute");
	if (!Array.isArray(event.tasks) || !Array.isArray(event.organizers)) {
		return [];
	}
	const assignedTasks = event.organizers.flatMap((org) => org.tasks || []);
	// console.log("[DEBUG: unassignedTasks → " + assignedTasks);

	return event.tasks.filter((task) => !assignedTasks.includes(task.name));
}

/**
 * Prépare les données de l'événement pour la validation d'une date
 */
export function prepareDateValidationData(
	currentEvent: EventType,
	dateProposal: DateProposedType
): Partial<EventType> {
	const confirmedOrganizers = filterAndConvertOrganizers(dateProposal.organizers || []);
	const updatedOrganizers = [...(currentEvent.organizers || [])];

	for (const confirmedOrg of confirmedOrganizers) {
		const existingOrgIndex = updatedOrganizers.findIndex((org) => org.id === confirmedOrg.id);
		if (existingOrgIndex !== -1) {
			updatedOrganizers[existingOrgIndex] = {
				...confirmedOrg,
				tasks: updatedOrganizers[existingOrgIndex].tasks
			};
		} else {
			updatedOrganizers.push(confirmedOrg);
		}
	}

	return {
		date_event: formatDatePb(dateProposal.dateStart),
		time_start: formatTimePb(dateProposal.dateStart),
		time_end: formatTimePb(dateProposal.dateEnd),
		dateStart: dateProposal.dateStart,
		dateEnd: dateProposal.dateEnd,
		isSondage: false,
		organizers: updatedOrganizers
	};
}

/**
 * Met à jour l'événement avec les nouvelles données
 */
export async function updateEventData(
	eventId: string,
	data: Partial<EventType>,
	successMessage?: string
): Promise<EventActionPlan> {
	try {
		// Nettoyer les données avant envoi à PocketBase
		const cleanedData = cleanEventDataForPocketBase(data);
		await updateEvent(eventId, cleanedData);
		console.log(successMessage || "Événement mis à jour avec succès");
		return {
			type: "SUCCESS",
			message: successMessage || "L'événement a été mis à jour avec succès."
		};
	} catch (error) {
		console.error("Erreur lors de la mise à jour de l'événement:", error);
		return {
			type: "ERROR",
			message:
				error instanceof Error ? error.message : "Erreur lors de la mise à jour de l'événement.",
			error
		};
	}
}

/**
 * Applique une date de sondage à un événement, le mettant à jour en base de données,
 * et retourne une version mise à jour de l'objet événement pour un enchaînement d'actions.
 * @param currentEvent L'événement à mettre à jour.
 * @param dateProposal La date de sondage à appliquer.
 * @returns L'objet événement avec les données de la date fusionnées (mise à jour optimiste).
 */
export async function applyDateProposalToEvent(
	currentEvent: EventType,
	dateProposal: DateProposedType
): Promise<EventType> {
	const eventDataToUpdate = prepareDateValidationData(currentEvent, dateProposal);

	// Créer l'événement mis à jour pour le calcul des conflits
	const updatedEvent = { ...currentEvent, ...eventDataToUpdate };

	// Recalculer les conflits après modification de la date
	let conflictIds: string[] = [];
	try {
		const conflictResult = detectAllEventConflicts(updatedEvent, "EDIT_SINGLE", [updatedEvent.id]);
		conflictIds = conflictResult.conflictIds;
	} catch (error) {
		console.error("Erreur lors du calcul des conflits:", error);
	}

	// Fusionner les données de date et les conflits pour une seule mise à jour
	const dataWithConflicts = {
		...eventDataToUpdate,
		inConflictWith: conflictIds
	};

	await updateEventData(
		currentEvent.id,
		dataWithConflicts,
		"La date du sondage a été appliquée à l'événement."
	);

	// Mettre à jour les conflits réciproques uniquement (sans re-modifier l'événement)
	try {
		if (conflictIds.length > 0) {
			await updateReciprocalConflicts(currentEvent.id, conflictIds);
		}

		// Nettoyer les anciens conflits bidirectionnels si nécessaire
		const previousConflicts = currentEvent.inConflictWith || [];
		const conflictsToRemove = previousConflicts.filter((id) => !conflictIds.includes(id));
		if (conflictsToRemove.length > 0) {
			await cleanupBidirectionalConflicts(currentEvent.id, conflictsToRemove);
		}
	} catch (error) {
		console.error("Erreur lors de la mise à jour des conflits réciproques:", error);
		// On ne fait pas échouer l'opération principale pour un problème de conflits
	}

	// Retourne l'événement avec les nouvelles données fusionnées pour une utilisation immédiate.
	return { ...updatedEvent, inConflictWith: conflictIds };
}

/**
 * Vérifie si une validation de sondage est nécessaire
 */
// export function checkSondageValidation(
// 	eventData: EventType,
// 	hasSondageValidation: boolean
// ): {
// 	needsValidation: boolean;
// 	message?: string;
// 	variant?: "info" | "warning";
// 	canBeConfirmed?: boolean;
// 	showCompleteButton?: boolean;
// } {
// 	// Logique pour déterminer si on a besoin de validation sondage
// 	if (hasSondageValidation && !eventData.isSondage) {
// 		const canBeConfirmed = validateEventStatic(eventData).isValid;
// 		return {
// 			needsValidation: true,
// 			message: canBeConfirmed
// 				? `<p>Vous avez validé la date et cloturé le sondage : les participant·es seront notifiés.</p> L'événement peut être confirmé afin d'être publié sur le site et ajouté à la newsletter.</p>`
// 				: `<p>Vous avez validé la date et cloturé le sondage. Les participants seront notifiés.</p> <p> Si vous souhaitez confirmer l'événement (publication en ligne), vous devez d'abord compléter certaines informations manquantes.</p>`,
// 			variant: canBeConfirmed ? "info" : "warning",
// 			canBeConfirmed,
// 			showCompleteButton: !canBeConfirmed // Afficher le bouton "Compléter" si l'événement n'est pas prêt
// 		};
// 	}
// 	return { needsValidation: false };
// }

/**
 * Vérifie les conflits d'événements
 */
export function checkEventConflicts(conflictCalculator: {
	hasConfirmedConflicts: boolean;
	conflictIds: string[];
	confirmedConflicts: Array<{
		event_title: string;
		time_start: string;
		time_end: string;
		hasSameRoom?: boolean;
	}>;
}): {
	hasConflicts: boolean;
	message?: string;
	canProceed?: boolean;
} {
	const conflicts = conflictCalculator;

	if (!conflicts.hasConfirmedConflicts) {
		return {
			hasConflicts: conflicts.conflictIds.length > 0,
			canProceed: true
		};
	}
	const conflictDetails = conflicts.confirmedConflicts
		.map(
			(c: { event_title: string; time_start: string; time_end: string; hasSameRoom?: boolean }) =>
				`• ${c.event_title} (${c.time_start}-${c.time_end}${c.hasSameRoom ? ", même salle" : ""})`
		)
		.join("\n");

	const hasMultipleConflicts = conflicts.confirmedConflicts.length > 1;
	const hasSameRoomConflicts = conflicts.confirmedConflicts.some((c) => c.hasSameRoom);

	let conflictMessage: string;
	if (hasMultipleConflicts) {
		if (hasSameRoomConflicts) {
			conflictMessage = "Des événements sont déjà programmés au même moment";
		} else {
			conflictMessage = "Des événements sont déjà proposés au même moment";
		}
	} else {
		const singleConflict = conflicts.confirmedConflicts[0];
		if (singleConflict.hasSameRoom) {
			conflictMessage = "Un autre événement est déjà programmé au même moment dans la même salle";
		} else {
			conflictMessage = "Un autre événement est déjà proposé au même moment";
		}
	}

	return {
		hasConflicts: true,
		message: `${conflictMessage} :<br/>${conflictDetails}`,
		canProceed: false // Nécessite confirmation utilisateur
	};
}

/**
 * Met à jour les conflits d'un événement de manière réciproque avec déduplication améliorée
 */
export async function updateEventConflicts(
	eventId: string,
	conflictIds: string[],
	previousConflictIds: string[] = []
): Promise<void> {
	try {
		// 👉 Déduplication améliorée des conflits entrants et précédents
		const uniqueConflictIds = deduplicateConflictIds(conflictIds, eventId);
		const uniquePreviousConflictIds = deduplicateConflictIds(previousConflictIds, eventId);

		// Nettoyer les anciens conflits qui ne sont plus d'actualité
		const conflictsToRemove = uniquePreviousConflictIds.filter(
			(id) => !uniqueConflictIds.includes(id)
		);

		if (conflictsToRemove.length > 0) {
			await cleanupBidirectionalConflicts(eventId, conflictsToRemove);
		}

		// Mettre à jour l'événement avec ses nouveaux conflits (dédupliqués)
		await updateEvent(eventId, { inConflictWith: uniqueConflictIds });

		// Mettre à jour les conflits réciproques
		if (uniqueConflictIds.length > 0) {
			await updateReciprocalConflicts(eventId, uniqueConflictIds);
		}
	} catch (error) {
		console.error("Erreur lors de la mise à jour des conflits:", error);
		throw error;
	}
}

/**
 * Fonction unifiée pour détecter tous les conflits d'un événement
 */
export function detectAllEventConflicts(
	eventData: EventType,
	eventMode: EventMode,
	excludeEventIds?: string[]
): {
	hasConflicts: boolean;
	conflictIds: string[];
	recurrentConflictsMap: Map<string, string[]>;
	totalConflictCount: number;
} {
	let conflictIds: string[] = [];
	const recurrentConflictsMap = new Map<string, string[]>();
	let totalConflictCount = 0;

	if (eventMode === "NEW_RECURRENT" || eventMode === "EDIT_RECURRENT_ALL") {
		// Événements récurrents
		if (
			eventData.recurrence?.recurrenceDates &&
			Array.isArray(eventData.recurrence.recurrenceDates)
		) {
			eventData.recurrence.recurrenceDates.forEach((dateStr: string) => {
				try {
					// Créer les dates de début et fin pour cette occurrence
					const startDate = new Date(`${dateStr}T${eventData.time_start || "00:00"}:00`);
					const endDate = new Date(`${dateStr}T${eventData.time_end || "23:59"}:00`);

					// Calculer les conflits pour cette date spécifique
					const conflictResult = calculateConflicts({
						eventId: excludeEventIds && excludeEventIds.length > 0 ? undefined : eventData.id,
						startDate,
						endDate,
						rooms: eventData.rooms || [],
						includeCloseEvents: true
					});

					// Filtrer les conflits pour exclure les événements spécifiés
					let filteredConflictIds = conflictResult.conflictIds;
					if (excludeEventIds && excludeEventIds.length > 0) {
						filteredConflictIds = conflictResult.conflictIds.filter(
							(conflictId) => !excludeEventIds.includes(conflictId)
						);
					}

					// Stocker les IDs des conflits pour cette date
					if (filteredConflictIds.length > 0) {
						// Déduplication des conflits
						const uniqueConflicts = [...new Set(filteredConflictIds)];
						recurrentConflictsMap.set(dateStr, uniqueConflicts);
						totalConflictCount += uniqueConflicts.length;
					}
				} catch (error) {
					console.warn(`Erreur lors du calcul des conflits pour la date ${dateStr}:`, error);
				}
			});
		}
	} else {
		// Événements simples - utiliser le ConflictCalculator existant si possible
		if (eventData.date_event && eventData.time_start && eventData.time_end) {
			try {
				const startDate = new Date(`${eventData.date_event}T${eventData.time_start}:00`);
				const endDate = new Date(`${eventData.date_event}T${eventData.time_end}:00`);

				const conflictResult = calculateConflicts({
					eventId: excludeEventIds && excludeEventIds.length > 0 ? undefined : eventData.id,
					startDate,
					endDate,
					rooms: eventData.rooms || [],
					includeCloseEvents: true
				});

				// Filtrer et dédupliquer
				let filteredConflictIds = conflictResult.conflictIds;
				if (excludeEventIds && excludeEventIds.length > 0) {
					filteredConflictIds = conflictResult.conflictIds.filter(
						(conflictId) => !excludeEventIds.includes(conflictId)
					);
				}
				conflictIds = [...new Set(filteredConflictIds)];
				totalConflictCount = conflictIds.length;
			} catch (error) {
				console.warn("Erreur lors du calcul des conflits pour l'événement simple:", error);
			}
		}
	}

	return {
		hasConflicts: totalConflictCount > 0,
		conflictIds,
		recurrentConflictsMap,
		totalConflictCount
	};
}

/**
 * Calcule les conflits pour un événement récurrent en fonction de ses dates
 * @deprecated Utiliser detectAllEventConflicts() à la place
 */
export function calculateRecurrentEventConflicts(
	eventData: EventType,
	excludeEventIds?: string[]
): Map<string, string[]> {
	const result = detectAllEventConflicts(eventData, "NEW_RECURRENT", excludeEventIds);
	return result.recurrentConflictsMap;
}

/**
 * Gère les conflits pour une liste d'événements (récurrents)
 */
export async function updateMultipleEventConflicts(
	eventIds: string[],
	getConflictIds: (eventId: string) => string[]
): Promise<void> {
	// 👉 Déduplication des IDs d'événements
	const uniqueEventIds = deduplicateConflictIds(eventIds);

	const updatePromises = uniqueEventIds.map(async (eventId) => {
		try {
			const conflictIds = getConflictIds(eventId);
			// 👉 Déduplication des conflits retournés par la fonction
			const uniqueConflictIds = deduplicateConflictIds(conflictIds, eventId);
			await updateEventConflicts(eventId, uniqueConflictIds);
		} catch (error) {
			console.warn(
				`Erreur lors de la mise à jour des conflits pour l'événement ${eventId}:`,
				error
			);
		}
	});

	await Promise.allSettled(updatePromises);
}

/**
 * Gère les conflits pour les événements récurrents avec mapping des dates
 */
export async function updateRecurrentEventConflicts(
	eventIds: string[],
	recurrenceDates: string[],
	conflictsMap: Map<string, string[]>
): Promise<void> {
	// 👉 Déduplication des IDs d'événements
	const uniqueEventIds = deduplicateConflictIds(eventIds);

	const updatePromises = uniqueEventIds.map(async (eventId, index) => {
		try {
			const dateStr = recurrenceDates[index];
			const conflictIds = conflictsMap.get(dateStr) || [];

			// 👉 Déduplication des conflits avec exclusion de l'événement actuel
			const uniqueConflictIds = deduplicateConflictIds(conflictIds, eventId);

			if (uniqueConflictIds.length > 0) {
				await updateEventConflicts(eventId, uniqueConflictIds);
			}
		} catch (error) {
			console.warn(
				`Erreur lors de la mise à jour des conflits pour l'événement ${eventId}:`,
				error
			);
		}
	});

	await Promise.allSettled(updatePromises);
}

/**
 * Fonction principale pour gérer les conflits après sauvegarde d'événement
 */
export async function handleEventConflictsAfterSave(
	eventMode: string,
	eventData: EventType,
	conflictIds: string[],
	eventIds?: string[], // Pour les événements récurrents
	recurrentConflictsMap?: Map<string, string[]> // Pour les conflits spécifiques aux événements récurrents
): Promise<void> {
	try {
		switch (eventMode) {
			case "NEW_SINGLE":
			case "EDIT_SINGLE":
			case "EDIT_RECURRENT_ONE":
				// Un seul événement
				if (eventData.id) {
					const previousConflicts = eventData.inConflictWith || [];
					await updateEventConflicts(eventData.id, conflictIds, previousConflicts);
				}
				break;

			case "NEW_RECURRENT":
			case "EDIT_RECURRENT_ALL":
				// Événements récurrents - utiliser la map des conflits calculée
				if (eventIds && eventIds.length > 0 && eventData.recurrence?.recurrenceDates) {
					if (recurrentConflictsMap && recurrentConflictsMap.size > 0) {
						// Utiliser les conflits précalculés
						await updateRecurrentEventConflicts(
							eventIds,
							eventData.recurrence.recurrenceDates as string[],
							recurrentConflictsMap
						);
					} else if (conflictIds.length > 0) {
						// Fallback : appliquer les mêmes conflits à toutes les occurrences
						// 👉 Déduplication des conflits avant application
						const uniqueConflictIds = deduplicateConflictIds(conflictIds);
						await updateMultipleEventConflicts(eventIds, () => uniqueConflictIds);
					}
				}
				break;

			default:
				console.warn(`Mode d'événement non reconnu pour la gestion des conflits: ${eventMode}`);
		}
	} catch (error) {
		console.error("Erreur lors de la gestion des conflits après sauvegarde:", error);
		// 👉 Ne pas faire échouer la sauvegarde pour un problème de conflits
		// Note: L'erreur est loggée mais pas affichée à l'utilisateur - le handler s'en chargera
	}
}

/** Rétablir un événement annulé */
export async function restoreCanceledEvent(eventData: EventType): Promise<EventActionPlan> {
	try {
		const eventId = eventData.id;

		// 1. Simuler l'état de l'événement après restauration pour la détection des conflits.
		const restoredEventData: EventType = { ...eventData, canceled: false };

		// 2. Recalculer les conflits pour l'événement restauré.
		const conflictResult = detectAllEventConflicts(restoredEventData, "EDIT_SINGLE", [eventId]);
		const newConflictIds = conflictResult.conflictIds;

		await updateEvent(eventId, {
			canceled: false,
			inConflictWith: newConflictIds
		});

		// 4. Gérer les conflits réciproques sur les AUTRES événements.
		const previousConflictIds = eventData.inConflictWith || [];
		const conflictsToRemove = previousConflictIds.filter((id) => !newConflictIds.includes(id));

		if (newConflictIds.length > 0) {
			await updateReciprocalConflicts(eventId, newConflictIds);
		}
		if (conflictsToRemove.length > 0) {
			await cleanupBidirectionalConflicts(eventId, conflictsToRemove);
		}
		return {
			type: "SUCCESS",
			message: "L'événement a été rétabli avec succès."
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error
				? error.message
				: "Une erreur est survenue lors du rétablissement de l'événement.";
		console.error("Erreur lors du rétablissement de l'événement:", error);
		return {
			type: "ERROR",
			message: errorMessage,
			error
		};
	}
}

export async function cancelEventWithConflictCleanup(
	eventData: EventType
): Promise<EventActionPlan> {
	try {
		const eventId = eventData.id;

		updateEvent(eventId, { canceled: true });

		// 2. Nettoyer les conflits bidirectionnels
		const previousConflictIds = eventData.inConflictWith || [];
		await cleanupBidirectionalConflicts(eventId, previousConflictIds);

		return {
			type: "SUCCESS",
			message: "L'événement a été annulé avec succès."
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Une erreur est survenue lors de l'annulation.";
		console.error("Erreur lors de l'annulation de l'événement:", error);
		return {
			type: "ERROR",
			message: errorMessage,
			error
		};
	}
}
