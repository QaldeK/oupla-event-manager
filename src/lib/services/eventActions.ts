// src/lib/services/eventActions.ts
import { updateEvent } from "$lib/pocketbase.svelte";
import { validateEvent, ValidationSchemaType } from "$lib/schemas/event.schema";
import { notificationService } from "$lib/services/notificationService.svelte";
import { modalState, showAlert } from "$lib/shared";
import type { DateProposedType, EventType, UserType } from "$lib/types/types";
import {
	filterAndConvertOrganizers,
	formatDatePb,
	formatTimePb,
	lisibleDate,
	lisibleTime
} from "$lib/utils";

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

export function canEventBeValidated(event: EventType): boolean {
	return Boolean(
		event.date_event && event.time_start && event.time_end // FIXIT : manage Organizer Tasks ?
	);
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

	const { success: canBePublished } = validateEvent(simulatedEvent, ValidationSchemaType.PUBLISH);

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

export const getUnassignedTasks = (event: EventType) => {
	if (!Array.isArray(event.tasks) || !Array.isArray(event.organizers)) {
		return [];
	}

	// Récupérer toutes les tâches assignées
	const assignedTasks = event.organizers.flatMap((org) => org.tasks || []);

	// Filtrer les tâches non assignées
	return event.tasks.filter((task) => !assignedTasks.includes(task.name));
};
