// src/lib/services/eventActions.ts
import { updateEvent } from "$lib/pocketbase.svelte";
import { validateEventStatic } from "$lib/validation/event-validator.svelte";
import { notificationService } from "$lib/services/notificationService.svelte";
import { modalState, showAlert, eventState } from "$lib/shared";
import type { DateProposedType, UserType } from "$lib/types/types";
import type { EventType } from "$lib/types/event.types";
import {
	filterAndConvertOrganizers,
	formatDatePb,
	formatTimePb,
	lisibleDate,
	lisibleTime
} from "$lib/utils";

/**
 * Calcule les tâches non assignées d'un événement
 */
export function getUnassignedTasks(event: EventType) {
	console.log("unassignedTasks compute");
	if (!Array.isArray(event.tasks) || !Array.isArray(event.organizers)) {
		return [];
	}
	const assignedTasks = event.organizers.flatMap((org) => org.tasks || []);
	console.log("unassignedTasks →→ " + assignedTasks);

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
