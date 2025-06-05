// src/lib/services/eventActions.ts
import { updateEvent } from "$lib/pocketbase.svelte";
import { validateEventStatic } from "$lib/validation/event-validator.svelte";
import { notificationService } from "$lib/services/notificationService.svelte";
import { modalState, showAlert, eventState } from "$lib/shared";
import type { DateProposedType, UserType } from "$lib/types/types";
import type { EventType, RecurrenceType, RecurrenceConfigType } from "$lib/types/event.types";
import {
	filterAndConvertOrganizers,
	formatDatePb,
	formatTimePb,
	lisibleDate,
	lisibleTime
} from "$lib/utils";

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
	eventData: Partial<EventType>,
	successMessage?: string
): Promise<void> {
	try {
		await updateEvent(eventId, eventData);
		if (successMessage) {
			showAlert(successMessage, "success");
		}
	} catch (err) {
		console.error("Erreur lors de la mise à jour de l'événement:", err);
		showAlert("Une erreur est survenue lors de la mise à jour. Veuillez réessayer.", "error");
		throw err;
	}
}

/**
 * Valide une date proposée pour un événement
 */
export async function validateDate(
	currentEvent: EventType,
	dateProposal: DateProposedType,
	currentUser: UserType | null,
	notify: boolean = true,
	willBeConfirmed: boolean = false
): Promise<void> {
	if (!currentUser) {
		showAlert("Utilisateur non authentifié. Veuillez vous reconnecter.", "error");
		return;
	}

	if (!currentEvent) {
		showAlert("Aucun événement n'est sélectionné pour la validation.", "error");
		console.error("validateDate a été appelée sans currentEvent.");
		return;
	}

	const eventDataToUpdate = prepareDateValidationData(currentEvent, dateProposal);

	await updateEventData(
		currentEvent.id,
		eventDataToUpdate,
		"La date de l'événement a été validée et enregistrée avec succès."
	);

	// Envoyer une notification aux participants du sondage si demandé
	if (notify) {
		await notificationService.sendSondageValidationNotification({
			event: currentEvent,
			dateProposal,
			user: currentUser,
			options: {
				showUserFeedback: true,
				willBeConfirmed: willBeConfirmed,
				specificFeedbackMessage: willBeConfirmed
					? "Date validée et événement confirmé. Notification envoyée aux participants."
					: "Date validée. Notification envoyée aux participants du sondage."
			}
		});
	}
}

/**
 * Gère l'ouverture du modal de confirmation pour la validation d'une date
 */
export function handleDateValidationModal(
	currentEvent: EventType,
	dateProposal: DateProposedType,
	currentUser: UserType,
	options?: {
		onValidate?: (eventData: Partial<EventType>) => Promise<void>;
		additionalAction?: {
			condition: boolean;
			label: string;
			action: (notify?: boolean) => Promise<void>;
		};
	}
) {
	const confirmedOrganizersList = filterAndConvertOrganizers(dateProposal.organizers || []);
	const hasConfirmedOrganizers = confirmedOrganizersList.length > 0;

	// Simuler l'événement pour vérifier s'il peut être publié
	const simulatedEvent: EventType = {
		...currentEvent,
		...prepareDateValidationData(currentEvent, dateProposal)
	};

	const validation = validateEventStatic(simulatedEvent);
	const canBePublished = validation.isValid;

	const message = hasConfirmedOrganizers
		? `Choisir la date du ${lisibleDate(dateProposal.dateStart)} (${lisibleTime(
				dateProposal.dateStart
			)}-${lisibleTime(dateProposal.dateEnd)}) ? Le sondage sera clôturé et les participants notifiés.${
				canBePublished
					? " Vous pouvez confirmer l'événement (il sera publié sur le site et pourra être ajouté à la newsletter)"
					: ""
			}`
		: `Attention : Aucun·e organisateur·ice n'a confirmé sa présence pour cette date (${lisibleDate(
				dateProposal.dateStart
			)}). Êtes-vous sûr·e de vouloir la valider ?`;

	const additionalButton =
		options?.additionalAction?.condition && canBePublished && hasConfirmedOrganizers
			? {
					label: options.additionalAction.label,
					onClick: options.additionalAction.action
				}
			: undefined;

	modalState.confirm = {
		isOpen: true,
		data: {
			title: "Cloturer le sondage",
			message,
			variant: hasConfirmedOrganizers ? "warning" : "danger",
			showCheckbox: { checked: true, label: "Notifier les participant·es" },
			onConfirm: async (notify?: boolean) => {
				const eventDataToUpdate = prepareDateValidationData(currentEvent, dateProposal);
				// Déterminer si l'événement sera également confirmé
				let willBeConfirmed = false;
				if (options?.additionalAction?.condition && canBePublished && hasConfirmedOrganizers) {
					willBeConfirmed = true;
				}

				if (options?.onValidate) {
					await options.onValidate(eventDataToUpdate);
					// Envoyer notification après validation si notify est vrai
					if (notify) {
						await notificationService.sendSondageValidationNotification({
							event: currentEvent,
							dateProposal,
							user: currentUser,
							options: {
								showUserFeedback: true,
								willBeConfirmed: willBeConfirmed,
								specificFeedbackMessage: willBeConfirmed
									? "Date validée et événement confirmé. Notification envoyée aux participants."
									: "Date validée. Notification envoyée aux participants du sondage."
							}
						});
					}
				} else {
					await validateDate(currentEvent, dateProposal, currentUser, notify, willBeConfirmed);
				}
			},
			additionalButton
		}
	};
}

/**
 * Confirme un événement après validation du schéma et vérification des tâches
 */
export async function confirmEventAction(
	event: EventType,
	currentUser: UserType,
	notify: boolean = true
): Promise<void> {
	const validation = validateEventStatic(event);

	// Si l'événement ne peut pas être confirmé, afficher les erreurs
	if (!validation.isValid) {
		const errorMessages = validation.getErrors();
		modalState.confirm = {
			isOpen: true,
			data: {
				title: "Événement incomplet",
				variant: "warning",
				message: `Certaines informations doivent être renseignées avant de pouvoir de confirmer l'événements.<br/>${errorMessages.map((error) => `• ${error}`).join("<br/>")}`,
				onConfirm: () => {
					// Ouvrir le modal d'édition
					eventState.is = event;
					modalState.event = true;
				},
				confirmLabel: "Compléter l'événement"
			}
		};
		return;
	}

	// S'il y a des tâches non assignées mais que ce n'est pas bloquant
	if (validation.hasUnassignedTasks) {
		modalState.confirm = {
			isOpen: true,
			data: {
				title: "Confirmer l'événement",
				variant: "warning",
				message: `Il reste des tâches non assignées:\n${validation.unassignedTasks
					.map((task) => `• ${task.name}`)
					.join("\n")}\n\nVoulez-vous quand même confirmer l'événement ?`,
				showCheckbox: notify
					? { checked: true, label: "Notifier les organisateur·ices" }
					: undefined,
				onConfirm: async (notifyChecked?: boolean) => {
					await updateEventData(
						event.id,
						{ isConfirmed: true },
						"L'événement a été confirmé avec succès."
					);
					if (notifyChecked) {
						await notificationService.sendEventConfirmationNotification({
							event,
							user: currentUser,
							options: { showUserFeedback: true }
						});
					}
				}
			}
		};
		return;
	}

	// Si tout est OK, demander confirmation simple
	modalState.confirm = {
		isOpen: true,
		data: {
			title: "Confirmer l'événement",
			variant: "info",
			message: "Voulez-vous confirmer cet événement ?",
			showCheckbox: notify ? { checked: true, label: "Notifier les organisateur·ices" } : undefined,
			onConfirm: async (notifyChecked?: boolean) => {
				await updateEventData(
					event.id,
					{ isConfirmed: true },
					"L'événement a été confirmé avec succès."
				);
				if (notifyChecked) {
					await notificationService.sendEventConfirmationNotification({
						event,
						user: currentUser,
						options: { showUserFeedback: true }
					});
				}
			}
		}
	};
}

// --- Refactoring  ---

/**
 * Vérifie si une validation de sondage est nécessaire
 */
export function checkSondageValidation(eventData: EventType, hasSondageValidation: boolean): {
	needsValidation: boolean;
	message?: string;
	variant?: "info" | "warning";
	canBeConfirmed?: boolean;
	showCompleteButton?: boolean;
} {
	// Logique pour déterminer si on a besoin de validation sondage
	if (hasSondageValidation && !eventData.isSondage) {
		const canBeConfirmed = validateEventStatic(eventData).isValid;
		return {
			needsValidation: true,
			message: canBeConfirmed
				? `Vous avez validé la date et cloturé le sondage : les participants seront notifiés. L'événement peut être confirmé afin d'être publié et ajouté à la newsletter.`
				: `Vous avez validé la date et cloturé le sondage. Les participants seront notifiés. Si vous souhaitez confirmer l'événement (publication en ligne), vous devez d'abord compléter certaines informations manquantes.`,
			variant: canBeConfirmed ? "info" : "warning",
			canBeConfirmed,
			showCompleteButton: !canBeConfirmed // Afficher le bouton "Compléter" si l'événement n'est pas prêt
		};
	}
	return { needsValidation: false };
}

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
			(c: {
				event_title: string;
				time_start: string;
				time_end: string;
				hasSameRoom?: boolean;
			}) =>
				`• ${c.event_title} (${c.time_start}-${c.time_end}${c.hasSameRoom ? ", même salle" : ""})`
		)
		.join("\n");

	return {
		hasConflicts: true,
		message: `⚠️ Conflit détecté avec des événements confirmés :\n\n${conflictDetails}\n\nVoulez-vous enregistrer malgré ce conflit ?`,
		canProceed: false // Nécessite confirmation utilisateur
	};
}

/**
 * Prépare et affiche un modal de confirmation pour la soumission d'événement
 */
export function handleEventSubmissionConfirmation(
	eventData: EventType,
	options: {
		conflictCheck?: ReturnType<typeof checkEventConflicts>;
		sondageCheck?: ReturnType<typeof checkSondageValidation>;
		onConfirm: (shouldConfirm?: boolean) => Promise<void>;
		onCancel?: () => void;
		onComplete?: () => void; // 👉 Nouvelle action pour "Compléter"
	}
) {
	const { conflictCheck, sondageCheck, onConfirm, onComplete } = options;

	// Construire le message combiné
	const messages: string[] = [];
	let variant: "info" | "warning" | "danger" = "info";
	const additionalButtons: Array<{
		label: string;
		variant: "error" | "success" | "warning" | "primary" | "secondary" | "accent" | "ghost";
		onClick: () => void;
	}> = [];

	// Ajouter message de conflit si nécessaire
	if (conflictCheck?.hasConflicts && conflictCheck.message) {
		messages.push(conflictCheck.message);
		variant = "warning";
	}

	// Ajouter message de sondage si nécessaire
	if (sondageCheck?.needsValidation && sondageCheck.message) {
		messages.push(sondageCheck.message);

		// Bouton pour confirmer l'événement si possible
		if (sondageCheck.canBeConfirmed) {
			additionalButtons.push({
				label: "Confirmer l'événement",
				variant: "success",
				onClick: () => onConfirm(true)
			});
		}
		// 👉 Bouton pour compléter les informations manquantes
		else if (sondageCheck.showCompleteButton && onComplete) {
			additionalButtons.push({
				label: "Compléter l'événement",
				variant: "warning",
				onClick: onComplete
			});
		}
	}

	// Si pas de message spécifique, message par défaut
	if (messages.length === 0) {
		messages.push("Voulez-vous enregistrer cet événement ?");
	}

	modalState.confirm = {
	isOpen: true,
	data: {
		title: "Enregistrer l'événement",
		message: messages.join("\n\n"),
		variant,
		onConfirm: () => onConfirm(false),
		additionalButton: additionalButtons[0] // Pour l'instant, un seul bouton additionnel
	}
};
}
