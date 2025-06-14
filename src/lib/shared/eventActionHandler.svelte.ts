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

// Messages standards unifiés
const STANDARD_MESSAGES = {
	CONFIRMATION_INFO:
		"<p>Une fois confirmé, la date de l'événement ne sera plus modifiable (il pourra cependant être annulé). S'il s'agit d'un événement public, il sera publié en ligne et pourra être ajouté à la newsletter.</p><p>Cliquez sur 'Confirmer' pour continuer.</p>",
	UNASSIGNED_TASKS_WARNING: (tasks: Array<{ name: string }>) =>
		`Il reste des tâches non assignées:\n${tasks.map((task) => `• ${task.name}`).join("\n")}\n\nVoulez-vous quand même confirmer l'événement ?`,
	CONFLICT_WARNING:
		"⚠️ Des conflits ont été détectés avec d'autres événements. Vérifiez les créneaux horaires avant de continuer.",
	SONDAGE_NOTIFICATION: "Une validation de sondage est nécessaire."
	// DEFAULT_SAVE_QUESTION supprimé - on procède directement si aucun problème
} as const;

/**
 * Orchestrateur unifié pour toutes les actions d'événement.
 * Construit un plan d'action cohérent basé sur plusieurs vérifications.
 *
 * AMÉLIORATIONS DE CETTE REFACTORISATION :
 * - ✅ Message d'information systématique pour toute confirmation d'événement
 * - ✅ Avertissement systématique en cas de conflit détecté
 * - ✅ Messages unifiés et DRY quelque soit le point d'entrée
 * - ✅ Gestion cohérente des tâches non assignées partout
 * - ✅ Élimination de la duplication de code entre flux
 * - ✅ Synchronisation correcte entre action PocketBase et messages de succès
 * - ✅ Modal d'information forcée pour les confirmations simples
 * - ✅ Unification avec createDateValidationPlan (messages de conflit détaillés)
 *
 * CORRECTIONS DE BUGS :
 * 1. Synchronisation : Le message de succès n'apparaît qu'après la réussite réelle sur PocketBase
 * 2. Bypass modal : Les confirmations simples passent TOUJOURS par la modal d'information
 *    (évite le bypass direct vers PROCEED_DIRECTLY qui ignorait la modal)
 * 3. Conflits récurrents : Désactivation de l'alerte pour EDIT_RECURRENT_ALL et NEW_RECURRENT
 *    (préserve la détection inConflictWith mais évite l'alerte ingérable)
 * 4. Suppression confirmation par défaut : Si aucun problème, procéder directement
 * 5. Unification sondages : createDateValidationPlan devient un wrapper avec messages détaillés
 *
 * @param eventData - Données de l'événement à traiter
 * @param options - Options de configuration pour l'action
 * @returns Plan d'action unifié avec messages standardisés
 */
export async function createEventActionPlan(
	eventData: EventType,
	options: {
		mode?: string;
		shouldConfirmIntent?: boolean;
		hasSondageBeenValidated?: boolean;
		excludeEventIds?: string[];
		currentUser?: UserType;
		isSimpleConfirmation?: boolean;
		notify?: boolean;
		sondageContext?: {
			dateProposal: DateProposedType;
			originalEvent: EventType;
			onValidate?: (eventData: Partial<EventType>) => Promise<void>;
		};
	}
): Promise<EventActionPlan> {
	let mode = options.mode ?? "create";
	let shouldConfirmIntent = options.shouldConfirmIntent ?? false;
	const {
		hasSondageBeenValidated = false,
		excludeEventIds = [],
		currentUser,
		isSimpleConfirmation = false,
		notify = true,
		sondageContext
	} = options;

	// Si confirmation simple, forcer les paramètres appropriés
	if (isSimpleConfirmation) {
		shouldConfirmIntent = true;
		mode = "update";
	}

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

		// --- 2.2. Retour anticipé pour les tâches non assignées ---
		if (completionCheck.hasUnassignedTasks && completionCheck.isValid) {
			// Sera géré dans la logique générale plus bas
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
		// Pour les confirmations simples, TOUJOURS montrer la modal d'information
		if (!hasConflicts && !needsSondageValidation && !needsCompletion && !isSimpleConfirmation) {
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

	// --- 4. Agréger les résultats pour construire le message et les actions ---
	const messages: string[] = [];
	let variant: ConfirmModalData["variant"] = "info";
	const title = shouldConfirmIntent ? "Confirmer l'événement" : "Enregistrer l'événement";
	let showCheckbox: { label: string; checked: boolean } | undefined;
	let additionalButton: ConfirmModalData["additionalButton"];

	// Toujours ajouter le message d'information pour les confirmations
	if (shouldConfirmIntent) {
		messages.push(STANDARD_MESSAGES.CONFIRMATION_INFO);
	}

	// Gestion des tâches non assignées (pour tous les cas de confirmation)
	if (
		shouldConfirmIntent &&
		completionCheck &&
		completionCheck.hasUnassignedTasks &&
		completionCheck.isValid
	) {
		messages.push(STANDARD_MESSAGES.UNASSIGNED_TASKS_WARNING(completionCheck.unassignedTasks));
		variant = "warning";
		if (notify) {
			showCheckbox = { checked: true, label: "Notifier les organisateur·ices" };
		}
	}

	// Gestion des conflits - SAUF pour les modifications en masse de récurrents
	// Pour EDIT_RECURRENT_ALL : on préserve la détection (inConflictWith) mais pas l'alerte
	// car gérer des conflits sur toutes les occurrences serait trop complexe pour l'utilisateur
	if (hasConflicts && mode !== "EDIT_RECURRENT_ALL" && mode !== "NEW_RECURRENT") {
		if (sondageContext) {
			// Pour les sondages, utiliser le message détaillé des conflits
			const conflictMessage = generateDateProposalConflictMessage(
				sondageContext.dateProposal,
				sondageContext.originalEvent
			);
			if (conflictMessage) {
				messages.push(conflictMessage);
				variant = "danger";
			}
		} else {
			// Message générique pour les autres cas
			messages.push(STANDARD_MESSAGES.CONFLICT_WARNING);
			variant = "warning";
		}
	}

	// Gestion du sondage
	if (needsSondageValidation) {
		if (sondageContext) {
			// Message spécialisé pour validation de date
			const confirmedOrganizersList = filterAndConvertOrganizers(
				sondageContext.dateProposal.organizers || []
			);
			const hasConfirmedOrganizers = confirmedOrganizersList.length > 0;

			if (hasConfirmedOrganizers) {
				messages.push(
					`<p>Choisir la date du ${lisibleDate(sondageContext.dateProposal.dateStart)} (${lisibleTime(sondageContext.dateProposal.dateStart)}-${lisibleTime(sondageContext.dateProposal.dateEnd)}) ? Le sondage sera clôturé et les participants notifiés.</p>`
				);

				if (sondageCheck.canBeConfirmed && !hasConflicts) {
					messages.push(
						"<p><strong>L'événement peut être confirmé</strong> (il sera publié sur le site et pourra être ajouté à la newsletter).</p>"
					);
				} else if (!sondageCheck.canBeConfirmed) {
					messages.push(
						"<p>Si vous souhaitez confirmer l'événement afin qu'il soit publié sur le site, vous devez auparavant compléter certaines informations.</p>"
					);
				}
			} else {
				messages.push(
					`Attention : Aucun·e organisateur·ice n'a confirmé sa présence pour cette date (${lisibleDate(sondageContext.dateProposal.dateStart)}). Êtes-vous sûr·e de vouloir la valider ?`
				);
				variant = "danger";
			}

			// Bouton pour confirmer directement si possible
			if (sondageCheck.canBeConfirmed && hasConfirmedOrganizers && !hasConflicts) {
				additionalButton = {
					label: "Valider et confirmer l'événement",
					variant: "success",
					onClick: async () => {
						try {
							const eventDataToUpdate = {
								...prepareDateValidationData(
									sondageContext.originalEvent,
									sondageContext.dateProposal
								),
								isConfirmed: true
							};

							if (sondageContext.onValidate) {
								await sondageContext.onValidate(eventDataToUpdate);
							} else {
								await updateEventData(sondageContext.originalEvent.id, eventDataToUpdate);
							}

							await notificationService.sendSondageValidationNotification({
								event: sondageContext.originalEvent,
								dateProposal: sondageContext.dateProposal,
								user: currentUser!,
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
			// Bouton pour compléter si nécessaire
			else if (hasConfirmedOrganizers && !sondageCheck.canBeConfirmed) {
				additionalButton = {
					label: "Compléter l'événement",
					variant: "success",
					onClick: () => {
						const eventDataToUpdate = prepareDateValidationData(
							sondageContext.originalEvent,
							sondageContext.dateProposal
						);
						eventState.is = { ...sondageContext.originalEvent, ...eventDataToUpdate };
						modalState.event = true;
						modalState.confirm.isOpen = false;
					}
				};
			}
		} else {
			// Message générique pour les autres cas de sondage
			const sondageMessage = sondageCheck.message || STANDARD_MESSAGES.SONDAGE_NOTIFICATION;
			messages.push(sondageMessage);

			// Bouton pour confirmer l'événement si possible ET si pas déjà demandé
			if (sondageCheck.canBeConfirmed && !shouldConfirmIntent) {
				additionalButton = {
					label: "Enregistrer et Confirmer l'événement",
					variant: "accent",
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

		showCheckbox = {
			label: "Notifier les participant·es",
			checked: true
		};
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

	// Si pas de message spécifique
	if (messages.length === 0) {
		if (shouldConfirmIntent) {
			messages.push(STANDARD_MESSAGES.CONFIRMATION_INFO);
		} else {
			// Si aucun problème détecté, procéder directement sans confirmation
			return {
				type: "PROCEED_DIRECTLY",
				action: () => {
					// Si c'est une confirmation simple, utiliser updateEventData
					if (isSimpleConfirmation) {
						return updateEventData(eventData.id, { isConfirmed: true }).then(() => ({
							type: "SUCCESS" as const,
							message: "L'événement a été confirmé avec succès."
						}));
					}
					// Si c'est un contexte de sondage, utiliser la validation spécialisée
					else if (sondageContext) {
						const eventDataToUpdate = prepareDateValidationData(
							sondageContext.originalEvent,
							sondageContext.dateProposal
						);

						if (sondageContext.onValidate) {
							return sondageContext.onValidate(eventDataToUpdate).then(() => ({
								type: "SUCCESS" as const,
								message: "Date validée avec succès."
							}));
						} else {
							return validateDate(
								sondageContext.originalEvent,
								sondageContext.dateProposal,
								currentUser!,
								false,
								false
							).then(() => ({
								type: "SUCCESS" as const,
								message: "Date validée avec succès."
							}));
						}
					}
					// Sinon, utiliser submitEvent
					else {
						return submitEvent(
							eventData,
							mode,
							shouldConfirmIntent,
							conflictCheck,
							false,
							hasSondageBeenValidated,
							currentUser
						);
					}
				}
			};
		}
	}

	// --- 5. Construire et retourner le plan d'action final ---
	return {
		type: "NEEDS_CONFIRMATION",
		confirmationDetails: {
			title,
			message: messages.join("\n\n"),
			variant,
			confirmLabel: shouldConfirmIntent ? "Confirmer" : "Enregistrer",
			showCheckbox,
			additionalButton
		},
		onConfirmedAction: async (notifyChecked) => {
			try {
				// Si c'est une confirmation simple, utiliser updateEventData
				if (isSimpleConfirmation) {
					// Attendre que la mise à jour soit réellement effectuée sur PocketBase
					await updateEventData(eventData.id, { isConfirmed: true });

					// Seulement après la mise à jour réussie, envoyer les notifications
					if (notifyChecked && currentUser) {
						await notificationService.sendEventConfirmationNotification({
							event: eventData,
							user: currentUser,
							options: { showUserFeedback: true }
						});
					}

					// Le message de succès ne sera affiché qu'après la réussite complète
					return { type: "SUCCESS", message: "L'événement a été confirmé avec succès." };
				}
				// Si c'est un contexte de sondage, utiliser la validation spécialisée
				else if (sondageContext) {
					const eventDataToUpdate = prepareDateValidationData(
						sondageContext.originalEvent,
						sondageContext.dateProposal
					);

					if (sondageContext.onValidate) {
						await sondageContext.onValidate(eventDataToUpdate);
					} else {
						await validateDate(
							sondageContext.originalEvent,
							sondageContext.dateProposal,
							currentUser!,
							notifyChecked,
							false
						);
					}
					return { type: "SUCCESS", message: "Date validée avec succès." };
				}
				// Sinon, utiliser submitEvent
				else {
					await submitEvent(
						eventData,
						mode,
						shouldConfirmIntent,
						conflictCheck,
						notifyChecked ?? false,
						hasSondageBeenValidated,
						currentUser
					);
					return { type: "SUCCESS", message: "Événement enregistré avec succès." };
				}
			} catch (error: unknown) {
				return {
					type: "ERROR",
					message: error instanceof Error ? error.message : "Erreur lors de l'opération",
					error
				};
			}
		}
	};
}

// Fonction de rétrocompatibilité pour createEventSubmissionPlan
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
	return createEventActionPlan(eventData, {
		...options,
		isSimpleConfirmation: false
	});
}

// Fonction de rétrocompatibilité pour createSimpleConfirmationPlan
export async function createSimpleConfirmationPlan(
	event: EventType,
	currentUser: UserType,
	notify: boolean = true
): Promise<EventActionPlan> {
	return createEventActionPlan(event, {
		currentUser,
		notify,
		isSimpleConfirmation: true
	});
}

/**
 * Orchestrateur pour la validation d'une date de sondage
 * Wrapper autour de createEventActionPlan avec gestion spécialisée des conflits détaillés
 */
export async function createDateValidationPlan(
	currentEvent: EventType,
	dateProposal: DateProposedType,
	currentUser: UserType,
	options?: {
		onValidate?: (eventData: Partial<EventType>) => Promise<void>;
	}
): Promise<EventActionPlan> {
	// Préparer les données de l'événement avec la date sélectionnée
	const eventDataToValidate = {
		...currentEvent,
		...prepareDateValidationData(currentEvent, dateProposal)
	};

	// Utiliser createEventActionPlan unifié avec customisation pour sondage
	return createEventActionPlan(eventDataToValidate, {
		mode: "update",
		shouldConfirmIntent: false,
		hasSondageBeenValidated: true,
		currentUser,
		notify: true,
		// Options spéciales pour les sondages
		sondageContext: {
			dateProposal,
			originalEvent: currentEvent,
			onValidate: options?.onValidate
		}
	});
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
