/**
 * 🎯 GESTIONNAIRE D'ACTIONS D'ÉVÉNEMENTS - ARCHITECTURE COMPLÈTE
 * ===============================================================
 *
 * Ce module orchestre toutes les actions sur les événements avec validation, gestion des conflits,
 * et affichage des modals de confirmation appropriées selon le contexte d'utilisation.
 *
 * 🎨 CONTEXTES D'UTILISATION
 * ===========================
 *
 * 📝 **EventModal** : Enregistrement/confirmation depuis le formulaire
 * 🗳️ **UserSondagesCard** : Validation de dates proposées
 * 🔘 **ButtonAction/RecurrentEventsCard** : Confirmation d'événements existants
 *
 * 🎨 TYPES DE MODALS GÉNÉRÉES
 * ============================
 *
 * 📋 **Standard** : Confirmation simple avec message informatif
 * ⚠️  **Warning** : Alertes pour conflits ou tâches non assignées
 * 🚨 **Danger** : Situations critiques (confirmé sans orga, conflits majeurs)
 * ✅ **Success** : Confirmations avec boutons d'action additionnels
 *
 * 🔧 FONCTIONS UTILITAIRES
 * =========================
 * - determineActionContext() : Analyse le contexte d'action
 * - canProceedDirectly() : Vérifie si action directe possible
 * - handleConfirmedEventWithoutOrganizer() : Cas critique spécialisé
 * - handleConfirmedIncompleteEvent() : Événement confirmé mais incomplet
 * - buildConfirmationDetails() : Construction des détails de confirmation
 */

import { calculateConflicts, type ConflictResult } from "$lib/services/conflictService.svelte";
import {
	applyDateProposalToEvent,
	getNewEvent,
	getUnassignedTasks,
	submitEvent,
	updateEventData,
	type EventActionPlan
} from "$lib/services/eventActions";
import type { Conflict } from "$lib/services/eventConflicts";
import { notificationService } from "$lib/services/notificationService.svelte";
import {
	eventState,
	modalState,
	showAlert,
	type ConfirmModalData
} from "$lib/shared/states.svelte";
import type { DateProposedType, EventMode, EventType } from "$lib/types/event.types";
import type { UserType } from "$lib/types/types";
import { filterAndConvertOrganizers, lisibleDate, lisibleTime } from "$lib/utils";
import { validateEventStatic } from "$lib/validation/event-validator.svelte";

// Messages standards unifiés
const STANDARD_MESSAGES = {
	CONFIRMATION_INFO:
		"<p>Une fois confirmé, la date de l'événement ne sera plus modifiable (il pourra cependant être annulé).</p><br/>",
	UNASSIGNED_TASKS_WARNING: (tasks: Array<{ name: string }>) =>
		`<p><strong>Tâches non assignées :</strong><span >${tasks.map((task) => `<span> ${task.name}</span>`).join(", ")}</span><br/>`,
	CONFLICT_WARNING:
		"Des conflits ont été détectés avec d'autres événements. Vérifiez les créneaux horaires avant de continuer.",
	SONDAGE_VALIDATION_INFO: (dateProposal: DateProposedType) =>
		`<p><strong>📅 Validation de sondage :</strong></p><p>La date du ${lisibleDate(dateProposal.dateStart)} (${lisibleTime(dateProposal.dateStart)}-${lisibleTime(dateProposal.dateEnd)}) sera définie comme date officielle de l'événement.</p><p>Le sondage sera clôturé et les participants seront notifiés.</p><br/>`,
	INCOMPLETE_EVENT_WARNING: (
		missingFields: string[] // Suppression de la balise <p> englobante
	) =>
		`<strong>Informations manquantes :</strong><ul class="text-fluid-sm">${missingFields.map((field) => `<li>• ${field}</li>`).join("")}</ul>`,
	NO_CONFIRMED_ORGANIZERS_WARNING: (dateProposal: DateProposedType) =>
		`<p><strong>Aucun organisateur confirmé :</strong></p><p>Aucun·e organisateur·ice n'a confirmé sa présence pour la date du ${lisibleDate(dateProposal.dateStart)}.</p><p>Voulez-vous quand même valider cette date ?</p><br/>`
} as const;

// Types pour clarifier les contextes
type ActionOptions = {
	/** Contexte d'origine de l'action */
	context: "form" | "external_action";
	/** Mode d'événement (pour EventModal) */
	mode?: EventMode;
	/** L'utilisateur valide une date de sondage */
	isValidatingSondage?: boolean;
	/** L'utilisateur veut confirmer l'événement (isConfirmed = true) */
	wantsToConfirmEvent?: boolean;
	/** Forcer la vérification des conflits même sans confirmation */
	checkConflicts?: boolean;
	/** IDs d'événements à exclure de détection de conflits */
	excludeEventIds?: string[];
	/** Utilisateur effectuant l'action */
	currentUser?: UserType;
	/** Activer les notifications */
	notify?: boolean;
	/** Date de sondage à valider (si isValidatingSondage = true) */
	dateSondageToValidate?: DateProposedType;
	/** Indique si l'événement vient de valider un sondage (pour EventModal) */
	hasSondageValidation?: boolean;
	/** Données de validation personnalisées (pour EventModal) */
	validationData?: {
		isValid: boolean;
		errors: Record<string, string>;
		hasUnassignedTasks: boolean;
		unassignedTasks: Array<{ name: string }>;
	};
};

type ActionExecutor = () => Promise<EventActionPlan>;

/**
 * Détermine si on peut procéder directement sans modal de confirmation
 */
function canProceedDirectly(
	options: ActionOptions,
	checks: {
		hasConflicts: boolean;
		needsCompletion: boolean;
		hasUnassignedTasks: boolean;
	}
): boolean {
	const { hasConflicts, needsCompletion, hasUnassignedTasks } = checks;

	// Les validations de sondage doivent TOUJOURS afficher une modal
	if (options.isValidatingSondage) {
		return false;
	}

	// Les cas avec hasSondageValidation depuis EventModal doivent afficher une modal
	if (options.hasSondageValidation) {
		return false;
	}

	// Les confirmations depuis des actions externes doivent afficher une modal
	if (options.context === "external_action" && options.wantsToConfirmEvent) {
		return false;
	}

	// Si événement incomplet et qu'on veut le confirmer, afficher modal
	if (options.wantsToConfirmEvent && needsCompletion) {
		return false;
	}

	// Si conflits détectés (realConflicts pour confirmation, confirmedConflicts pour sondage)
	if (hasConflicts) {
		return false;
	}

	// Si tâches non assignées et qu'on veut confirmer
	if (options.wantsToConfirmEvent && hasUnassignedTasks) {
		return false;
	}

	// Pas de problème détecté, on peut procéder directement
	return true;
}

/**
 * Crée l'exécuteur d'action approprié selon le contexte
 */
function createActionExecutor(
	eventData: EventType,
	options: ActionOptions,
	conflictResults: ConflictResult
): ActionExecutor {
	return async (): Promise<EventActionPlan> => {
		try {
			let result: EventActionPlan;

			if (options.isValidatingSondage && options.dateSondageToValidate) {
				// Validation de sondage : transformer dateProposal en date officielle
				// 👉 La logique de validation est maintenant gérée dans onConfirmedAction pour permettre un flux en deux étapes.
				// Cet exécuteur ne sera plus appelé pour la validation de sondage initiale.
				// On lance une erreur pour signaler une utilisation incorrecte.
				throw new Error(
					"createActionExecutor ne doit pas être appelé directement pour la validation de sondage."
				);
			} else if (options.context === "form") {
				// Soumission depuis EventModal
				result = await submitEvent(eventData, {
					mode: options.mode || "NEW_SINGLE",
					wantsToConfirmEvent: options.wantsToConfirmEvent || false,
					conflictIds: conflictResults.conflictIds
				});
			} else {
				// Mise à jour depuis action externe (confirmation, etc.)
				const updateData: Partial<EventType> = {};
				if (options.wantsToConfirmEvent) {
					updateData.isConfirmed = true;
				}

				result = await updateEventData(eventData.id, updateData);
			}

			// Réinitialiser l'état si nécessaire
			if (result.type === "SUCCESS") {
				resetEventState();
			}

			return result;
		} catch (error) {
			console.error("Erreur dans l'exécution de l'action:", error);
			return {
				type: "ERROR",
				message: error instanceof Error ? error.message : "Erreur lors de l'opération",
				error
			};
		}
	};
}

/**
 * Gère le cas critique d'un événement confirmé sans organisateur
 */
function handleConfirmedEventWithoutOrganizer(
	eventData: EventType,
	options: ActionOptions,
	conflictResults: ConflictResult,
	completionCheck: { errors: Record<string, string> }
): EventActionPlan {
	const conflictMessage =
		conflictResults.conflicts.length > 0
			? generateConflictMessage(conflictResults.conflicts, options.dateSondageToValidate)
			: "";

	const messages = [
		"<p><strong>🚨 Attention :</strong> Cet événement est confirmé mais aucun organisateur n'est assigné.</p>",

		"<ul><li>Continuer malgré tout</li><li>Assigner des organisateurs d'abord</li></ul>"
	];

	if (conflictMessage) {
		messages.push(conflictMessage);
	}

	return {
		type: "NEEDS_CONFIRMATION",
		confirmationDetails: {
			title: "Événement confirmé sans organisateur",
			message: messages.join("\n"),
			variant: "danger",
			confirmLabel: "Continuer quand même",
			additionalButton: {
				label: "Assigner des organisateurs",
				variant: "accent",
				onClick: () => {
					eventState.is = eventData;
					modalState.event = true;
					modalState.confirm.isOpen = false;
				}
			}
		},
		onConfirmedAction: async () => {
			const executor = createActionExecutor(eventData, options, conflictResults);
			return await executor();
		}
	};
}

/**
 * Gère le cas d'un événement confirmé mais incomplet
 */
function handleConfirmedIncompleteEvent(
	eventData: EventType,
	options: ActionOptions,
	conflictResults: ConflictResult,
	completionCheck: { errors: Record<string, string>; getErrors: () => string[] }
): EventActionPlan {
	const errorMessages = completionCheck.getErrors();
	const conflictMessage =
		conflictResults.conflicts.length > 0
			? generateConflictMessage(conflictResults.conflicts, options.dateSondageToValidate)
			: "";

	const messages = [
		"<p><strong>⚠️ Événement confirmé mais incomplet :</strong></p>",
		STANDARD_MESSAGES.INCOMPLETE_EVENT_WARNING(errorMessages),
		"<p>Voulez-vous compléter l'événement avant de continuer ?</p>"
	];

	if (conflictMessage) {
		messages.push(conflictMessage);
	}

	return {
		type: "NEEDS_CONFIRMATION",
		confirmationDetails: {
			title: "Événement incomplet",
			message: messages.join("\n"),
			variant: "warning",
			confirmLabel: "Continuer quand même",
			additionalButton: {
				label: "Compléter l'événement",
				variant: "accent",
				onClick: () => {
					eventState.is = eventData;
					modalState.event = true;
					modalState.confirm.isOpen = false;
				}
			}
		},
		onConfirmedAction: async () => {
			const executor = createActionExecutor(eventData, options, conflictResults);
			return await executor();
		}
	};
}

/**
 * Gère le cas d'un événement incomplet depuis un contexte externe
 * Dans ce cas, l'utilisateur ne peut PAS confirmer, il doit d'abord compléter
 */
function handleIncompleteEventFromExternalContext(
	eventData: EventType,
	completionCheck: { getErrors: () => string[] },
	dateProposal?: DateProposedType // Nouveau paramètre pour la date de sondage
): EventActionPlan {
	const errorMessages = completionCheck.getErrors();

	let messageContent = ``;

	if (dateProposal) {
		messageContent += `<p>La date du sondage (<strong>${lisibleDate(dateProposal.dateStart)}</strong> de ${lisibleTime(dateProposal.dateStart)} à ${lisibleTime(dateProposal.dateEnd)}) a été validée.</p>`;
		messageContent += `<p>Cependant, l'événement n'est pas encore complet et ne peut pas être confirmé pour publication (site, newsletter).</p>`;
		messageContent += `<p>Pour le confirmer maintenant, vous devrez compléter les informations manquantes :</p>`;
	} else {
		messageContent += `<p>Cet événement est incomplet et ne peut pas être confirmé.</p>`;
		messageContent += `<p>Veuillez compléter les informations manquantes :</p>`;
	}

	messageContent += `<p>${STANDARD_MESSAGES.INCOMPLETE_EVENT_WARNING(errorMessages)}</p>`;

	return {
		type: "NEEDS_CONFIRMATION",
		confirmationDetails: {
			title: "Événement incomplet",
			message: messageContent,
			variant: "warning",
			confirmLabel: "Ne pas confirmer maintenant",
			showCancelButton: false,
			additionalButton: {
				label: "Compléter l'événement",
				variant: "accent",
				onClick: () => {
					eventState.is = eventData;
					modalState.event = true;
					modalState.confirm.isOpen = false;
				}
			}
		},
		onConfirmedAction: async () => {
			// Pas d'action de confirmation, juste fermer le modal
			return { type: "SUCCESS", message: "" };
		}
	};
}

/**
 * Construit les détails de confirmation selon le contexte et les vérifications
 */
function buildConfirmationDetails(
	eventData: EventType,
	options: ActionOptions,
	checks: {
		hasConflicts: boolean;
		needsCompletion: boolean;
		hasUnassignedTasks: boolean;
		conflictResults: ConflictResult;
		completionCheck: {
			errors?: Record<string, string>;
			getErrors?: () => string[];
			unassignedTasks?: Array<{ name: string }>;
		} | null;
		unassignedTasks: Array<{ name: string }>;
	}
): {
	messages: string[];
	variant: ConfirmModalData["variant"];
	showCheckbox?: { label: string; checked: boolean };
	additionalButton?: ConfirmModalData["additionalButton"];
} {
	const {
		hasConflicts,
		needsCompletion,
		hasUnassignedTasks,
		conflictResults,
		completionCheck,
		unassignedTasks
	} = checks;

	const messages: string[] = [];
	let variant: "info" | "warning" | "danger" = "info";
	let showCheckbox: { label: string; checked: boolean } | undefined;
	let additionalButton: ConfirmModalData["additionalButton"];

	// 1. Messages pour validation de sondage
	if (options.isValidatingSondage && options.dateSondageToValidate) {
		const dateProposal = options.dateSondageToValidate;
		messages.push(STANDARD_MESSAGES.SONDAGE_VALIDATION_INFO(dateProposal));

		// Vérifier les organisateurs confirmés pour cette date
		const confirmedOrganizers = filterAndConvertOrganizers(dateProposal.organizers || []);
		const hasConfirmedOrganizers = confirmedOrganizers.length > 0;

		if (!hasConfirmedOrganizers) {
			messages.push(STANDARD_MESSAGES.NO_CONFIRMED_ORGANIZERS_WARNING(dateProposal));
			variant = "warning";
		}

		// Checkbox pour notifications
		// TODO: on gere les notifications pour les event isConfirmed, sinon par cron pour les sondages ?
		// if (options.notify) {
		// 	showCheckbox = { label: "Notifier les participants au sondage", checked: true };
		// }
	}

	// 2. Messages pour hasSondageValidation depuis EventModal
	if (options.hasSondageValidation) {
		messages.push(
			"<p><strong>📅 Validation de sondage :</strong></p><p>Cette action va valider la date sélectionnée et clôturer le sondage.</p>"
		);
		// if (options.notify) {
		// 	showCheckbox = { label: "Notifier les participants au sondage", checked: true };
		// }
	}

	// 3. Messages de confirmation d'événement
	if (options.wantsToConfirmEvent) {
		messages.push(STANDARD_MESSAGES.CONFIRMATION_INFO);
		if (eventData.isPublic) {
			messages.push(
				"<p>Comme il s'agit d'un événement public, il sera publié en ligne et pourra être ajouté à la newsletter.</p>"
			);
		}
		// Notifications pour confirmation
		if (options.notify && !showCheckbox) {
			showCheckbox = { label: "Notifier les organisateur·ices", checked: true };
		}
	}

	// Note: Les événements incomplets depuis contexte externe sont gérés
	// directement dans createEventActionPlan via handleIncompleteEventFromExternalContext
	// et n'arrivent jamais ici

	// 5. Messages pour tâches non assignées (seulement si confirmation demandée)
	if (hasUnassignedTasks && unassignedTasks.length > 0 && options.wantsToConfirmEvent) {
		messages.push(STANDARD_MESSAGES.UNASSIGNED_TASKS_WARNING(unassignedTasks));
		if (variant === "info") variant = "warning";
	}

	// 6. Messages de conflits
	if (hasConflicts) {
		const conflictType =
			options.isValidatingSondage || options.hasSondageValidation
				? "confirmedConflicts"
				: "realConflicts";

		const relevantConflicts =
			conflictType === "confirmedConflicts"
				? conflictResults.confirmedConflicts
				: conflictResults.realConflicts;

		if (relevantConflicts.length > 0) {
			const conflictMessage = generateConflictMessage(
				relevantConflicts,
				options.dateSondageToValidate
			);
			if (conflictMessage) {
				messages.push(conflictMessage);
				if (variant === "info") variant = "warning";
			}
		}
	}

	return { messages, variant, showCheckbox, additionalButton };
}

/**
 * Réinitialise l'état de l'événement après une action réussie
 */
function resetEventState() {
	eventState.is = getNewEvent();
	modalState.event = false;
}

/**
 * Génère un message de conflit formaté
 */
function generateConflictMessage(conflicts: Conflict[], dateProposal?: DateProposedType): string {
	if (!conflicts.length) return "";

	const conflictsByType = conflicts.reduce(
		(acc, conflict) => {
			if (conflict.conflictType === "confirmed") {
				acc.confirmed.push(conflict);
			} else {
				acc.potential.push(conflict);
			}
			return acc;
		},
		{ confirmed: [] as Conflict[], potential: [] as Conflict[] }
	);

	const messages: string[] = [];

	if (conflictsByType.confirmed.length > 0) {
		messages.push(
			`<p><strong>Evénement confirmer au même moment :</strong></p><ul>${conflictsByType.confirmed
				.map((conflict) => {
					const rooms = conflict.hasSameRoom ? " (même salle)" : `${conflict.rooms}`;
					const timeInfo =
						conflict.time_start && conflict.time_end
							? ` (${conflict.time_start}-${conflict.time_end})`
							: "";
					return `<li>• ${conflict.event_title}${timeInfo}${rooms}</li>`;
				})
				.join("")}</ul>`
		);
	}

	if (conflictsByType.potential.length > 0) {
		messages.push(
			`<p><strong>ℹ️ Événements proches :</strong></p><ul>${conflictsByType.potential
				.map((conflict) => {
					const timeInfo =
						conflict.time_start && conflict.time_end
							? ` (${conflict.time_start}-${conflict.time_end})`
							: "";
					return `<li>• ${conflict.event_title}${timeInfo}</li>`;
				})
				.join("")}</ul>`
		);
	}

	return messages.join("\n");
}

/**
 * Vérifie les conflits d'événements selon le contexte
 */
function checkEventConflicts(eventData: EventType, options: ActionOptions): ConflictResult {
	// Pour les validations de sondage, utiliser les données de la dateProposal
	if (options.isValidatingSondage && options.dateSondageToValidate) {
		const dateProposal = options.dateSondageToValidate;
		const startDate = new Date(dateProposal.dateStart);
		const endDate = new Date(dateProposal.dateEnd);

		return calculateConflicts({
			eventId: eventData.id,
			startDate,
			endDate,
			rooms: eventData.rooms || [],
			includeCloseEvents: true
		});
	}

	// Pour les autres cas, utiliser les données de l'événement
	if (!eventData.date_event || !eventData.time_start || !eventData.time_end) {
		return {
			conflicts: [],
			hasConfirmedConflicts: false,
			confirmedConflicts: [],
			realConflicts: [],
			conflictIds: []
		};
	}

	try {
		const startDate = new Date(`${eventData.date_event}T${eventData.time_start}:00`);
		const endDate = new Date(`${eventData.date_event}T${eventData.time_end}:00`);

		const results = calculateConflicts({
			eventId: eventData.id,
			startDate,
			endDate,
			rooms: eventData.rooms || [],
			includeCloseEvents: true
		});

		// Filtrer les IDs exclus si nécessaire
		if (options.excludeEventIds && options.excludeEventIds.length > 0) {
			const filteredResults = {
				...results,
				conflicts: results.conflicts.filter(
					(conflict) => !options.excludeEventIds?.includes(conflict.id)
				),
				conflictIds: results.conflictIds.filter((id) => !options.excludeEventIds?.includes(id))
			};

			filteredResults.hasConfirmedConflicts = filteredResults.confirmedConflicts.length > 0;
			return filteredResults;
		}

		return results;
	} catch (error) {
		console.error("Erreur lors de la vérification des conflits:", error);
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
 * 🎯 FONCTION PRINCIPALE : Créer un plan d'action pour un événement
 *
 * Cette fonction analyse l'événement et le contexte pour déterminer :
 * - Si l'action peut être exécutée directement
 * - Si une modal de confirmation est nécessaire
 * - Quelles vérifications effectuer (conflits, complétude, tâches)
 * - Quels messages afficher à l'utilisateur
 */
async function createEventActionPlan(
	eventData: EventType,
	options: ActionOptions
): Promise<EventActionPlan> {
	// 1. Cas critique : événement confirmé sans organisateur
	if (eventData.isConfirmed && options.context === "external_action") {
		const completionCheck = validateEventStatic(eventData);
		if (completionCheck.errors.organizers) {
			const conflicts = checkEventConflicts(eventData, options);
			return handleConfirmedEventWithoutOrganizer(eventData, options, conflicts, completionCheck);
		}
	}

	// 2. Effectuer les vérifications nécessaires
	const shouldCheckConflicts =
		options.wantsToConfirmEvent ||
		options.checkConflicts ||
		options.isValidatingSondage ||
		options.hasSondageValidation;

	const conflictResults = shouldCheckConflicts
		? checkEventConflicts(eventData, options)
		: ({
				conflicts: [],
				hasConfirmedConflicts: false,
				confirmedConflicts: [],
				realConflicts: [],
				conflictIds: []
			} as ConflictResult);

	// Déterminer le type de conflits pertinents selon le contexte
	const hasConflicts =
		options.isValidatingSondage || options.hasSondageValidation
			? conflictResults.confirmedConflicts.length > 0
			: conflictResults.realConflicts.length > 0;

	// 3. Vérification de complétude
	let completionCheck = null;
	let needsCompletion = false;

	// Utiliser les données de validation personnalisées si disponibles (EventModal)
	if (options.validationData) {
		needsCompletion = !options.validationData.isValid;
		completionCheck = {
			errors: options.validationData.errors,
			hasUnassignedTasks: options.validationData.hasUnassignedTasks,
			unassignedTasks: options.validationData.unassignedTasks,
			getErrors: () => Object.values(options.validationData!.errors)
		};
	} else if (options.wantsToConfirmEvent || options.context === "external_action") {
		// Validation complète pour les confirmations
		completionCheck = validateEventStatic(eventData);
		needsCompletion = !completionCheck.isValid;
	}

	// 4. Vérification des tâches non assignées
	const unassignedTasks = getUnassignedTasks(eventData);
	const hasUnassignedTasks = unassignedTasks.length > 0;

	// 5. Cas spécial : événement incomplet depuis contexte externe
	if (
		needsCompletion &&
		options.context === "external_action" &&
		options.wantsToConfirmEvent &&
		completionCheck
	) {
		return handleIncompleteEventFromExternalContext(eventData, completionCheck);
	}

	// 6. Cas spécial : événement confirmé mais incomplet (autre contexte)
	if (needsCompletion && eventData.isConfirmed && completionCheck) {
		return handleConfirmedIncompleteEvent(eventData, options, conflictResults, completionCheck);
	}

	// 7. Vérifier si on peut procéder directement
	const checks = { hasConflicts, needsCompletion, hasUnassignedTasks };

	if (canProceedDirectly(options, checks)) {
		return {
			type: "PROCEED_DIRECTLY",
			action: createActionExecutor(eventData, options, conflictResults)
		};
	}

	// 8. Construire les détails de confirmation
	const confirmationDetails = buildConfirmationDetails(eventData, options, {
		hasConflicts,
		needsCompletion,
		hasUnassignedTasks,
		conflictResults,
		completionCheck,
		unassignedTasks
	});

	// 9. Déterminer le titre et le label selon le contexte
	let title = "Action sur l'événement";
	let confirmLabel = "Continuer";

	if (options.isValidatingSondage && options.wantsToConfirmEvent) {
		title = "Valider et confirmer l'événement";
		confirmLabel = "Valider et confirmer";
	} else if (options.isValidatingSondage) {
		title = "Valider la date du sondage";
		confirmLabel = "Valider la date";
	} else if (options.hasSondageValidation && options.wantsToConfirmEvent) {
		title = "Valider sondage et confirmer";
		confirmLabel = "Valider et confirmer";
	} else if (options.hasSondageValidation) {
		title = "Valider le sondage";
		confirmLabel = "Valider";
	} else if (options.wantsToConfirmEvent) {
		title = "Confirmer l'événement";
		confirmLabel = "Confirmer l'événement";
	} else {
		title = "Enregistrer l'événement";
		confirmLabel = "Enregistrer";
	}

	// 10. Cas spécifique : validation de sondage avec flux en deux étapes
	if (options.isValidatingSondage) {
		return {
			type: "NEEDS_CONFIRMATION",
			confirmationDetails: {
				title,
				message: confirmationDetails.messages.join("\n\n"),
				variant: confirmationDetails.variant,
				confirmLabel,
				showCheckbox: confirmationDetails.showCheckbox
			},
			onConfirmedAction: async (notifyChecked) => {
				if (!options.dateSondageToValidate || !options.currentUser) {
					return { type: "ERROR", message: "Données de validation manquantes." };
				}

				try {
					// Étape 1: Appliquer la date au record de l'événement
					const updatedEvent = await applyDateProposalToEvent(
						eventData,
						options.dateSondageToValidate
					);

					// Étape 2: Vérifier si l'événement mis à jour est complet
					const completionCheck = validateEventStatic(updatedEvent);

					// Étape 3: Renvoyer un nouveau plan d'action pour la deuxième étape (confirmer ou compléter)
					if (completionCheck.isValid) {
						// L'événement est complet, proposer la confirmation
						return await createEventActionPlan(updatedEvent, {
							context: "external_action",
							wantsToConfirmEvent: true,
							currentUser: options.currentUser,
							notify: notifyChecked // Transmettre le souhait de notifier
						});
					} else {
						// L'événement est incomplet, notifier de la validation et proposer de compléter
						if (notifyChecked) {
							await notificationService.sendSondageValidationNotification({
								event: updatedEvent,
								dateProposal: options.dateSondageToValidate,
								user: options.currentUser,
								options: { showUserFeedback: true }
							});
						}
						// Utiliser le handler existant pour les événements incomplets
						return handleIncompleteEventFromExternalContext(
							updatedEvent,
							completionCheck,
							options.dateSondageToValidate
						);
					}
				} catch (error: unknown) {
					return {
						type: "ERROR",
						message:
							error instanceof Error ? error.message : "Erreur lors de la validation de la date.",
						error
					};
				}
			}
		};
	}

	// 10. Retourner le plan d'action avec modal de confirmation
	return {
		type: "NEEDS_CONFIRMATION",
		confirmationDetails: {
			title,
			message: confirmationDetails.messages.join("\n\n"),
			variant: confirmationDetails.variant,
			confirmLabel,
			showCheckbox: confirmationDetails.showCheckbox,
			additionalButton: confirmationDetails.additionalButton
		},
		onConfirmedAction: async (notifyChecked) => {
			try {
				const executor = createActionExecutor(eventData, options, conflictResults);
				const result = await executor();

				// Gestion des notifications après succès
				if (result.type === "SUCCESS" && notifyChecked && options.currentUser) {
					if (options.isValidatingSondage && options.dateSondageToValidate) {
						await notificationService.sendSondageValidationNotification({
							event: eventData,
							dateProposal: options.dateSondageToValidate,
							user: options.currentUser,
							options: { showUserFeedback: true }
						});
					} else if (options.hasSondageValidation) {
						await notificationService.sendSondageValidationNotification({
							event: eventData,
							dateProposal: options.dateSondageToValidate!, // Devrait être fourni
							user: options.currentUser,
							options: { showUserFeedback: true }
						});
					} else if (options.wantsToConfirmEvent) {
						await notificationService.sendEventConfirmationNotification({
							event: eventData,
							user: options.currentUser,
							options: { showUserFeedback: true }
						});
					}
				}

				return result;
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

/**
 * 🚀 FONCTION PRINCIPALE : Gérer une action sur un événement
 *
 * Point d'entrée principal pour toutes les actions sur les événements.
 * Crée un plan d'action et l'exécute selon le type (direct ou avec confirmation).
 */
async function handleEventAction(plan: EventActionPlan): Promise<void> {
	try {
		if (plan.type === "PROCEED_DIRECTLY") {
			// Exécution directe
			const result = await plan.action();
			if (result.type === "SUCCESS") {
				showAlert(result.message || "Opération réussie", "success");
			} else if (result.type === "ERROR") {
				showAlert(result.message || "Une erreur est survenue", "error");
			}
		} else if (plan.type === "NEEDS_CONFIRMATION") {
			// Affichage de la modal de confirmation
			modalState.confirm = {
				isOpen: true,
				data: {
					...plan.confirmationDetails,
					onConfirm: async (notifyChecked?: boolean) => {
						// Fermer le modal actuel avant de potentiellement en ouvrir un autre
						modalState.confirm.isOpen = false;

						try {
							const result = await plan.onConfirmedAction(notifyChecked);

							// Gérer le résultat de l'action
							if (result.type === "SUCCESS") {
								if (result.message) {
									showAlert(result.message, "success");
								}
							} else if (result.type === "ERROR") {
								showAlert(result.message || "Une erreur est survenue", "error");
							} else {
								// Si un autre plan est retourné (chaînage), l'exécuter
								await handleEventAction(result);
							}
						} catch (error) {
							console.error("Erreur lors de la confirmation:", error);
							showAlert("Une erreur est survenue lors de la confirmation", "error");
						}
					}
				}
			};
		}
	} catch (error) {
		console.error("Erreur dans handleEventAction:", error);
		showAlert("Une erreur inattendue est survenue", "error");
	}
}

// Exports
export { createEventActionPlan, handleEventAction, type ActionOptions };
