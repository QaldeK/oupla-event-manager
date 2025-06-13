// src/lib/shared/eventActionHandler.svelte.ts
import {
	modalState,
	showAlert,
	eventState,
	type ConfirmModalData
} from "$lib/shared/states.svelte";
import {
	detectAllEventConflicts,
	checkSondageValidation,
	generateDateProposalConflictMessage,
	submitEvent,
	prepareDateValidationData,
	updateEventData,
	validateDate,
	type EventActionPlan,
	getNewEvent
} from "$lib/services/eventActions";
import { validateEventStatic } from "$lib/validation/event-validator.svelte";
import { notificationService } from "$lib/services/notificationService.svelte";
import type { EventType, DateProposedType } from "$lib/types/event.types";
import type { UserType } from "$lib/types/types";
import { filterAndConvertOrganizers, lisibleDate, lisibleTime } from "$lib/utils";

/**
 * Orchestrateur pour la soumission d'un formulaire d'événement.
 * Construit un plan d'action unifié basé sur plusieurs vérifications.
 */
export async function createEventSubmissionPlan(
	eventData: EventType,
	options: {
		mode: string;
		shouldConfirmIntent: boolean;
		hasSondageBeenValidated: boolean;
		excludeEventIds?: string[];
		currentUser?: UserType;
	}
): Promise<EventActionPlan> {
	const {
		mode,
		shouldConfirmIntent,
		hasSondageBeenValidated,
		excludeEventIds = [],
		currentUser
	} = options;

	// --- 1. Vérifications TOUJOURS nécessaires ---
	const conflictCheck = detectAllEventConflicts(eventData, mode, excludeEventIds);
	const sondageCheck = checkSondageValidation(eventData, hasSondageBeenValidated);

	// --- 2. Vérification de complétude SEULEMENT si confirmation demandée ---
	let completionCheck = null;
	let needsCompletion = false;

	if (shouldConfirmIntent) {
		completionCheck = validateEventStatic(eventData);
		needsCompletion = !completionCheck.isValid;

		// --- 2.1. Cas spécifique : événement déjà confirmé sans organisateurs ---
		if (eventData.isConfirmed && completionCheck.errors.organizers) {
			const allErrors = completionCheck.getErrors();
			const hasOtherErrors = allErrors.length > 1 || !allErrors[0]?.includes("organisateur");

			return {
				type: "NEEDS_CONFIRMATION",
				confirmationDetails: {
					title: "Événement confirmé sans organisateur·ice",
					message: `<p><strong>Cet événement est déjà confirmé</strong>${
						eventData.isPublic
							? " et publié sur le site (et possiblement annoncé dans une newsletter)." //FIXIT: champs isSendToNewsletter
							: "."
					}</p><p>Il n'a actuellement aucun·e organisateur·ice assigné·e${
						hasOtherErrors ? " et d'autres informations sont manquantes" : ""
					}. Envisagez d'annuler l'événement...</p>${"<p><strong>En cas d'annulation :</strong> l'événement sera affiché comme annulé sur le site public et pourra être signalé dans les newsletters.</p>"}`,
					variant: "danger",
					confirmLabel: "Poursuivre malgré tout",
					showCheckbox: { checked: true, label: "Notifier les administrateur·ices" },
					additionalButton: {
						label: "Compléter l'événement",
						variant: "success",
						onClick: () => {
							eventState.is = eventData;
							modalState.event = true;
							modalState.confirm.isOpen = false;
						}
					},
					showCancelButton: false,
					showCancelEventButton: {
						label: "Annuler l'événement",
						onCancelEvent: async () => {
							try {
								await updateEventData(
									eventData.id,
									{ canceled: true },
									"L'événement a été annulé avec succès."
								);

								// TODO: Ajouter notification aux administrateurs
								console.log("Notification aux administrateurs pour annulation");

								showAlert("L'événement a été annulé avec succès.", "success");

								// Fermer les modaux
								eventState.is = getNewEvent();
								eventState.pendingSondageValidation = false;
								modalState.event = false;
								modalState.confirm.isOpen = false;
							} catch (error: unknown) {
								const errorMessage =
									error instanceof Error ? error.message : "Erreur lors de l'annulation";
								showAlert(errorMessage, "error");
								console.error("Erreur lors de l'annulation:", error);
							}
						}
					}
				},
				onConfirmedAction: async (notify) => {
					try {
						await submitEvent(
							eventData,
							mode,
							shouldConfirmIntent,
							conflictCheck,
							false, // pas de notification générale
							hasSondageBeenValidated,
							currentUser
						);

						if (notify) {
							// TODO: Ajouter notification aux administrateurs
							console.log("Notification aux administrateurs pour événement sans organisateur");
						}

						return {
							type: "SUCCESS",
							message: "Événement enregistré malgré l'absence d'organisateur·ice."
						};
					} catch (error: unknown) {
						return {
							type: "ERROR",
							message: error instanceof Error ? error.message : "Erreur lors de l'enregistrement",
							error
						};
					}
				}
			};
		}
	}

	// --- 3. Vérifier si l'événement peut être soumis directement ---
	const hasConflicts = conflictCheck.hasConflicts;
	const needsSondageValidation = sondageCheck.needsValidation;

	// Si pas de confirmation demandée : vérifier seulement conflits + sondage
	if (!shouldConfirmIntent) {
		if (!hasConflicts && !needsSondageValidation) {
			return {
				type: "PROCEED_DIRECTLY",
				action: () =>
					submitEvent(
						eventData,
						mode,
						false, // pas de confirmation
						conflictCheck,
						false, // pas de notification par défaut
						hasSondageBeenValidated,
						currentUser
					)
			};
		}
	}
	// Si confirmation demandée : vérifier tout
	else {
		if (!hasConflicts && !needsSondageValidation && !needsCompletion) {
			return {
				type: "PROCEED_DIRECTLY",
				action: () =>
					submitEvent(
						eventData,
						mode,
						true, // confirmation demandée
						conflictCheck,
						false,
						hasSondageBeenValidated,
						currentUser
					)
			};
		}
	}
	// --- 3. Agréger les résultats pour construire le message et les actions ---
	const messages: string[] = [];
	let variant: ConfirmModalData["variant"] = "info";
	const title = shouldConfirmIntent ? "Confirmer l'événement" : "Enregistrer l'événement";
	let showCheckbox: { label: string; checked: boolean } | undefined;
	let additionalButton: ConfirmModalData["additionalButton"];

	// Gestion des conflits
	if (hasConflicts) {
		// Générer un message de conflit basique si pas de message spécifique
		const conflictMessage = "Des conflits ont été détectés avec d'autres événements.";
		messages.push(conflictMessage);
		variant = "warning";
	}

	// Gestion du sondage
	if (needsSondageValidation) {
		const sondageMessage = sondageCheck.message || "Une validation de sondage est nécessaire.";
		messages.push(sondageMessage);
		showCheckbox = {
			label: "Notifier les participant·es",
			checked: true
		};

		// Bouton pour confirmer l'événement si possible ET si pas déjà demandé
		if (sondageCheck.canBeConfirmed && !shouldConfirmIntent) {
			additionalButton = {
				label: "Confirmer l'événement",
				variant: "success",
				onClick: async () => {
					const resultPlan = await submitEvent(
						eventData,
						mode,
						true, // confirmer l'événement
						conflictCheck,
						true, // notify
						hasSondageBeenValidated,
						currentUser
					);
					await handleEventAction(resultPlan);
				}
			};
		}
		// Bouton pour compléter les informations manquantes
		else if (sondageCheck.showCompleteButton) {
			additionalButton = {
				label: "Compléter l'événement",
				variant: "warning",
				onClick: () => {
					eventState.is = eventData;
					modalState.event = true;
					modalState.confirm.isOpen = false;
				}
			};
		}
	}

	// Gestion de la validation
	if (needsCompletion && !needsSondageValidation) {
		// Si c'est un événement confirmé, proposer aussi l'option "Compléter l'événement"
		if (eventData.isConfirmed) {
			const validation = validateEventStatic(eventData);
			const errorMessages = validation.getErrors();

			return {
				type: "NEEDS_CONFIRMATION",
				confirmationDetails: {
					title: "Événement confirmé incomplet",
					message: `<p><strong>Cet événement est déjà confirmé</strong>${
						eventData.isPublic ? " et publié sur le site" : ""
					}.Pourtant, certaines informations importantes ne sont pas renseignées :</p>${errorMessages
						.map((error) => `<li class="text-fluid-sm">• ${error}</li>`)
						.join("")}`,
					variant: "warning",
					confirmLabel: "Continuer",
					showCancelButton: false,
					additionalButton: {
						label: "Compléter l'événement",
						variant: "success",
						onClick: () => {
							eventState.is = eventData;
							modalState.event = true;
							modalState.confirm.isOpen = false;
						}
					}
				},
				onConfirmedAction: async () => {
					try {
						await submitEvent(
							eventData,
							mode,
							shouldConfirmIntent,
							conflictCheck,
							false, // pas de notification
							hasSondageBeenValidated,
							currentUser
						);
						return {
							type: "SUCCESS",
							message: "Événement enregistré malgré les informations manquantes."
						};
					} catch (error: unknown) {
						return {
							type: "ERROR",
							message: error instanceof Error ? error.message : "Erreur lors de l'enregistrement",
							error
						};
					}
				}
			};
		}

		return {
			type: "NEEDS_COMPLETION",
			completionDetails: { eventData }
		};
	}

	// Si pas de message spécifique, message par défaut
	if (messages.length === 0) {
		messages.push("Voulez-vous enregistrer cet événement ?");
	}

	// --- 4. Construire et retourner le plan d'action final ---
	return {
		type: "NEEDS_CONFIRMATION",
		confirmationDetails: {
			title,
			message: messages.join("\n\n"),
			variant,
			confirmLabel: shouldConfirmIntent ? "Continuer" : "Enregistrer",
			showCheckbox,
			additionalButton
		},
		onConfirmedAction: (notify) =>
			submitEvent(
				eventData,
				mode,
				shouldConfirmIntent,
				conflictCheck,
				notify ?? false,
				hasSondageBeenValidated,
				currentUser
			)
	};
}

/**
 * Orchestrateur pour la confirmation simple d'un événement existant
 */
export async function createSimpleConfirmationPlan(
	event: EventType,
	currentUser: UserType,
	notify: boolean = true
): Promise<EventActionPlan> {
	const validation = validateEventStatic(event);

	// Si l'événement ne peut pas être confirmé, afficher les erreurs
	if (!validation.isValid) {
		return {
			type: "NEEDS_COMPLETION",
			completionDetails: { eventData: event }
		};
	}

	// S'il y a des tâches non assignées mais que ce n'est pas bloquant
	if (validation.hasUnassignedTasks) {
		return {
			type: "NEEDS_CONFIRMATION",
			confirmationDetails: {
				title: "Confirmer l'événement",
				message: `Il reste des tâches non assignées:\n${validation.unassignedTasks
					.map((task) => `• ${task.name}`)
					.join("\n")}\n\nVoulez-vous quand même confirmer l'événement ?`,
				variant: "warning",
				showCheckbox: notify
					? { checked: true, label: "Notifier les organisateur·ices" }
					: undefined
			},
			onConfirmedAction: async (notifyChecked) => {
				try {
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
					return { type: "SUCCESS", message: "L'événement a été confirmé avec succès." };
				} catch (error: unknown) {
					return {
						type: "ERROR",
						message: error instanceof Error ? error.message : "Erreur lors de la confirmation",
						error
					};
				}
			}
		};
	}

	// Si tout est OK, demander confirmation simple
	return {
		type: "NEEDS_CONFIRMATION",
		confirmationDetails: {
			title: "Confirmer l'événement",
			message:
				"<p>Une fois confirmé, la date de l'événement ne sera plus modifiable (il pourra cependant être annulé). S'il s'agit d'un événement public, il sera publié en ligne et pourra être ajouté à la newsletter.</p><p>Cliquez sur 'Confirmer' pour continuer.</p>",
			variant: "info",
			showCheckbox: notify ? { checked: true, label: "Notifier les organisateur·ices" } : undefined
		},
		onConfirmedAction: async (notifyChecked) => {
			try {
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
				return { type: "SUCCESS", message: "L'événement a été confirmé avec succès." };
			} catch (error: unknown) {
				return {
					type: "ERROR",
					message: error instanceof Error ? error.message : "Erreur lors de la confirmation",
					error
				};
			}
		}
	};
}

/**
 * Orchestrateur pour la validation d'une date de sondage
 */
export async function createDateValidationPlan(
	currentEvent: EventType,
	dateProposal: DateProposedType,
	currentUser: UserType,
	options?: {
		onValidate?: (eventData: Partial<EventType>) => Promise<void>;
	}
): Promise<EventActionPlan> {
	const confirmedOrganizersList = filterAndConvertOrganizers(dateProposal.organizers || []);
	const hasConfirmedOrganizers = confirmedOrganizersList.length > 0;

	// 👉 Vérifier les conflits pour cette date
	const conflictMessage = generateDateProposalConflictMessage(dateProposal, currentEvent);

	// Simuler l'événement pour vérifier s'il peut être publié
	const simulatedEvent: EventType = {
		...currentEvent,
		...prepareDateValidationData(currentEvent, dateProposal)
	};

	const validation = validateEventStatic(simulatedEvent);
	const canBePublished = validation.isValid;
	const canBeConfirmed = canBePublished && hasConfirmedOrganizers && !conflictMessage;

	// 👉 Construction du message avec gestion des conflits
	let message = "";
	const title = "Clôturer le sondage";
	let variant: ConfirmModalData["variant"] = hasConfirmedOrganizers ? "warning" : "danger";

	// Message principal selon les organisateurs
	if (hasConfirmedOrganizers) {
		message += `<p>Choisir la date du ${lisibleDate(dateProposal.dateStart)} (${lisibleTime(
			dateProposal.dateStart
		)}-${lisibleTime(dateProposal.dateEnd)}) ? Le sondage sera clôturé et les participants notifiés.<p/>`;

		if (canBeConfirmed) {
			message +=
				"<p><strong>L'événement peut être confirmé</strong> (il sera publié sur le site et pourra être ajouté à la newsletter).</p>";
		} else if (!canBePublished) {
			message +=
				"<p><br/>Si vous souhaiter confirmer l'événement afin qu'il soit publié sur le site, vous devez auparavant completer certaines informations.</p>";
		}
	} else {
		message += `Attention : Aucun·e organisateur·ice n'a confirmé sa présence pour cette date (${lisibleDate(
			dateProposal.dateStart
		)}). Êtes-vous sûr·e de vouloir la valider ?`;
	}

	// Gestion des conflits
	if (conflictMessage) {
		variant = "danger";
		message += "<br/>" + conflictMessage + "<br/>";
	}

	let additionalButton: ConfirmModalData["additionalButton"];

	// Bouton pour confirmer l'événement (priorité la plus haute)
	if (canBeConfirmed) {
		additionalButton = {
			label: "Valider et confirmer l'événement",
			variant: "success",
			onClick: async () => {
				try {
					const eventDataToUpdate = {
						...prepareDateValidationData(currentEvent, dateProposal),
						isConfirmed: true
					};

					if (options?.onValidate) {
						await options.onValidate(eventDataToUpdate);
					} else {
						await updateEventData(currentEvent.id, eventDataToUpdate);
					}

					await notificationService.sendSondageValidationNotification({
						event: currentEvent,
						dateProposal,
						user: currentUser,
						options: {
							showUserFeedback: true,
							willBeConfirmed: true,
							specificFeedbackMessage:
								"Date validée et événement confirmé. Notification envoyée aux participants."
						}
					});

					showAlert("Date validée et événement confirmé avec succès.", "success");
					eventState.is = getNewEvent();
					eventState.pendingSondageValidation = false;
					modalState.event = false;
					modalState.confirm.isOpen = false;
				} catch (error: unknown) {
					const errorMessage =
						error instanceof Error ? error.message : "Erreur lors de la validation";
					showAlert(errorMessage, "error");
				}
			}
		};
	}
	// Bouton pour compléter l'événement (si pas confirmable mais possible)
	else if (hasConfirmedOrganizers && !canBeConfirmed) {
		additionalButton = {
			label: "Compléter l'événement",
			variant: "success",
			onClick: async () => {
				const eventDataToUpdate = prepareDateValidationData(currentEvent, dateProposal);
				eventState.is = { ...currentEvent, ...eventDataToUpdate };
				modalState.event = true;
				modalState.confirm.isOpen = false;
			}
		};
	}

	return {
		type: "NEEDS_CONFIRMATION",
		confirmationDetails: {
			title,
			message,
			variant,
			showCheckbox: { checked: true, label: "Notifier les participant·es" },
			additionalButton
		},
		onConfirmedAction: async (notify) => {
			try {
				// Action par défaut : valider sans confirmer
				const eventDataToUpdate = prepareDateValidationData(currentEvent, dateProposal);

				if (options?.onValidate) {
					await options.onValidate(eventDataToUpdate);
				} else {
					await validateDate(currentEvent, dateProposal, currentUser, notify, false);
					return { type: "SUCCESS", message: "Date validée avec succès." };
				}

				if (notify) {
					await notificationService.sendSondageValidationNotification({
						event: currentEvent,
						dateProposal,
						user: currentUser,
						options: {
							showUserFeedback: true,
							willBeConfirmed: false,
							specificFeedbackMessage:
								"Date validée. Notification envoyée aux participants du sondage."
						}
					});
				}

				return { type: "SUCCESS", message: "Date validée avec succès." };
			} catch (error: unknown) {
				return {
					type: "ERROR",
					message: error instanceof Error ? error.message : "Erreur lors de la validation",
					error
				};
			}
		}
	};
}

/**
 * Gère l'exécution d'un EventActionPlan.
 * Affiche les UI correspondantes (alertes, modaux).
 */
export async function handleEventAction(plan: EventActionPlan): Promise<void> {
	switch (plan.type) {
		case "PROCEED_DIRECTLY": {
			const resultPlan = await plan.action();
			await handleEventAction(resultPlan);
			break;
		}

		case "SUCCESS":
			if (plan.message) {
				showAlert(plan.message, "success");
			}
			// Fermer les modaux ouverts
			eventState.is = getNewEvent();
			eventState.pendingSondageValidation = false;
			modalState.event = false;
			modalState.confirm.isOpen = false;
			break;

		case "ERROR":
			showAlert(plan.message, "error");
			console.error("Erreur dans handleEventAction:", plan.error);
			break;

		case "NEEDS_CONFIRMATION": {
			modalState.confirm = {
				isOpen: true,
				data: {
					title: plan.confirmationDetails.title,
					message: plan.confirmationDetails.message,
					variant: plan.confirmationDetails.variant,
					confirmLabel: plan.confirmationDetails.confirmLabel || "Confirmer",
					showCheckbox: plan.confirmationDetails.showCheckbox,
					showCancelButton: plan.confirmationDetails.showCancelButton,
					showCancelEventButton: plan.confirmationDetails.showCancelEventButton,
					additionalButton: plan.confirmationDetails.additionalButton,
					onConfirm: async (notify?: boolean) => {
						const resultPlan = await plan.onConfirmedAction(notify);
						await handleEventAction(resultPlan);
					}
				}
			};
			break;
		}

		case "NEEDS_COMPLETION": {
			const validation = validateEventStatic(plan.completionDetails.eventData as EventType);
			const errorMessages = validation.getErrors();

			modalState.confirm = {
				isOpen: true,
				data: {
					title: "Événement incomplet",
					variant: "warning",
					message: `<p>Certaines informations doivent être renseignées pour confirmer l'événement:</p>${errorMessages
						.map((error) => `<li class="text-fluid-sm"> ${error}</li>`)
						.join("")}`,
					onConfirm: () => {
						// Maintenant on ouvre le modal d'édition
						eventState.is = plan.completionDetails.eventData as EventType;
						// eventState.pendingSondageValidation = true; // Si applicable
						modalState.event = true;
					},
					confirmLabel: "Compléter l'événement"
				}
			};
			break;
		}
	}
}
