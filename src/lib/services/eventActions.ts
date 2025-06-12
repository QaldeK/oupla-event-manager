// src/lib/services/eventActions.ts
import { updateEvent, updateReciprocalConflicts, pb } from "$lib/pocketbase.svelte";
import { validateEventStatic } from "$lib/validation/event-validator.svelte";
import { notificationService } from "$lib/services/notificationService.svelte";
import { modalState, showAlert, eventState } from "$lib/shared";
import { ConflictCalculator, calculateConflicts } from "$lib/services/conflictService.svelte";
import { eventsStore } from "$lib/shared/eventsStore.svelte";
import type { DateProposedType, UserType } from "$lib/types/types";
import type { EventType, RecurrenceType, RecurrenceConfigType } from "$lib/types/event.types";
import {
	filterAndConvertOrganizers,
	formatDatePb,
	formatTimePb,
	lisibleDate,
	lisibleTime
} from "$lib/utils";

// ::: FONCTIONS UTILITAIRES POUR LA GÉNÉRATION DE MESSAGES :::

/**
 * Génère un message de conflit formaté pour les confirmations
 * @param conflictDetection - Résultat de la détection des conflits
 * @param eventMode - Mode de l'événement (optionnel)
 * @param eventData - Données de l'événement (optionnel)
 * @returns Message formaté pour l'affichage
 */
export function generateConflictMessage(
	conflictDetection: ReturnType<typeof detectAllEventConflicts>,
	eventMode?: string,
	eventData?: EventType
): string {
	const { conflictIds, totalConflictCount, recurrentConflictsMap } = conflictDetection;

	// Helper pour formater les informations d'un événement en conflit
	const formatConflictEvent = (eventId: string): string => {
		const conflictEvent = eventsStore.getEventById(eventId);
		if (!conflictEvent) return `Événement ${eventId}`;

		const timeInfo =
			conflictEvent.time_start && conflictEvent.time_end
				? `de ${conflictEvent.time_start} à ${conflictEvent.time_end}`
				: "";

		const roomInfo = conflictEvent.rooms?.length ? ` (${conflictEvent.rooms.join(", ")})` : "";

		const statusInfo = conflictEvent.isConfirmed ? " [confirmé]" : " [non confirmé]";

		return `• ${conflictEvent.event_title}${statusInfo} ${timeInfo}${roomInfo}`;
	};

	let message = ``;

	if (eventMode === "NEW_RECURRENT" || eventMode === "EDIT_RECURRENT_ALL") {
		// Pour les événements récurrents, détailler par date
		if (recurrentConflictsMap.size > 0) {
			message += `Certaines occurrences de votre événement récurrent sont en conflit :\n\n`;

			for (const [dateStr, dateConflictIds] of recurrentConflictsMap) {
				const dateObj = new Date(dateStr);
				const formattedDate = dateObj.toLocaleDateString("fr-FR", {
					weekday: "long",
					year: "numeric",
					month: "long",
					day: "numeric"
				});

				message += `<bold>${formattedDate} :</bold><br/>`;
				dateConflictIds.forEach((conflictId) => {
					message += `  ${formatConflictEvent(conflictId)}\n`;
				});
				message += `\n`;
			}
		}
	} else {
		// Pour les événements simples
		const eventDate = eventData?.date_event ? new Date(eventData.date_event) : null;
		const formattedDate =
			eventDate?.toLocaleDateString("fr-FR", {
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric"
			}) || "la date sélectionnée";

		message += `Votre événement entre en conflit avec ${conflictIds.length} autre${conflictIds.length > 1 ? "s" : ""} événement${conflictIds.length > 1 ? "s" : ""} le ${formattedDate} :<br/>`;

		conflictIds.forEach((conflictId) => {
			message += `${formatConflictEvent(conflictId)}<br/>`;
		});
	}

	message += `<br/>Voulez-vous continuer malgré ${totalConflictCount > 1 ? "ces conflits" : "ce conflit"} ?`;

	return message;
}

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

/**
 * Valide et nettoie les conflits existants d'un événement
 * Supprime les doublons et les références invalides
 * @param eventId - ID de l'événement
 * @param existingConflicts - Liste des conflits existants
 * @returns Liste nettoyée des conflits valides
 */
export async function validateAndCleanExistingConflicts(
	eventId: string,
	existingConflicts: string[]
): Promise<string[]> {
	if (!existingConflicts || existingConflicts.length === 0) {
		return [];
	}

	// 👉 Déduplication initiale
	const uniqueConflicts = deduplicateConflictIds(existingConflicts, eventId);
	const validConflicts: string[] = [];

	// Vérifier que chaque conflit existe encore en base
	for (const conflictId of uniqueConflicts) {
		try {
			await pb.collection("events").getOne(conflictId);
			validConflicts.push(conflictId);
		} catch {
			console.warn(`Conflit invalide supprimé: ${conflictId} n'existe plus`);
		}
	}

	// Si des conflits ont été supprimés, mettre à jour l'événement
	if (validConflicts.length !== existingConflicts.length) {
		try {
			await updateEvent(eventId, { inConflictWith: validConflicts });
			console.log(
				`Conflits nettoyés pour l'événement ${eventId}: ${existingConflicts.length} -> ${validConflicts.length}`
			);
		} catch (error) {
			console.warn(`Impossible de nettoyer les conflits pour l'événement ${eventId}:`, error);
		}
	}

	return validConflicts;
}

/**
 * Détecte et répare les conflits bidirectionnels manquants
 * Vérifie que si l'événement A est en conflit avec B, alors B est aussi en conflit avec A
 * @param eventId - ID de l'événement à vérifier
 * @param conflictIds - Liste des conflits de l'événement
 */
export async function ensureBidirectionalConflicts(
	eventId: string,
	conflictIds: string[]
): Promise<void> {
	const uniqueConflictIds = deduplicateConflictIds(conflictIds, eventId);

	for (const conflictId of uniqueConflictIds) {
		try {
			const conflictEvent = await pb.collection("events").getOne(conflictId);
			const conflictEventConflicts = conflictEvent.inConflictWith || [];

			// Vérifier si le conflit bidirectionnel existe
			if (!conflictEventConflicts.includes(eventId)) {
				// 👉 Ajouter le conflit bidirectionnel manquant avec déduplication
				const updatedConflicts = deduplicateConflictIds([...conflictEventConflicts, eventId]);

				await updateEvent(conflictId, { inConflictWith: updatedConflicts });
				console.log(`Conflit bidirectionnel réparé: ${conflictId} -> ${eventId}`);
			}
		} catch (error) {
			console.warn(`Impossible de vérifier le conflit bidirectionnel pour ${conflictId}:`, error);
		}
	}
}

/**
 * Audit complet des conflits d'un événement
 * Nettoie, valide et répare les conflits bidirectionnels
 * @param eventId - ID de l'événement à auditer
 * @returns Rapport d'audit avec les actions effectuées
 */
export async function auditEventConflicts(eventId: string): Promise<{
	cleaned: number;
	invalid: number;
	repaired: number;
	finalConflicts: string[];
}> {
	try {
		const event = await pb.collection("events").getOne(eventId);
		const originalConflicts = event.inConflictWith || [];

		// 👉 Étape 1: Nettoyer et valider les conflits existants
		const validConflicts = await validateAndCleanExistingConflicts(eventId, originalConflicts);

		// 👉 Étape 2: S'assurer que les conflits sont bidirectionnels
		await ensureBidirectionalConflicts(eventId, validConflicts);

		// 👉 Calcul des statistiques
		const cleaned = originalConflicts.length - validConflicts.length;
		const invalid = originalConflicts.filter((id: string) => !validConflicts.includes(id)).length;

		return {
			cleaned,
			invalid,
			repaired: 0, // 🤔 À améliorer : compter les réparations effectuées
			finalConflicts: validConflicts
		};
	} catch (error) {
		console.error(`Erreur lors de l'audit des conflits pour l'événement ${eventId}:`, error);
		throw error;
	}
}

/**
 * Diagnostic rapide des conflits pour un événement ou tous les événements
 * @param eventId - ID de l'événement spécifique (optionnel)
 * @returns Rapport de diagnostic
 */
export async function quickConflictDiagnostic(eventId?: string): Promise<{
	eventCount: number;
	totalConflicts: number;
	duplicateConflicts: number;
	invalidConflicts: number;
	missingBidirectional: number;
	selfReferences: number;
	issues: Array<{
		eventId: string;
		issueType: string;
		description: string;
	}>;
}> {
	const report = {
		eventCount: 0,
		totalConflicts: 0,
		duplicateConflicts: 0,
		invalidConflicts: 0,
		missingBidirectional: 0,
		selfReferences: 0,
		issues: [] as Array<{
			eventId: string;
			issueType: string;
			description: string;
		}>
	};

	try {
		// Récupérer les événements à diagnostiquer
		const events = eventId
			? [await pb.collection("events").getOne(eventId)]
			: await pb.collection("events").getFullList();

		report.eventCount = events.length;

		for (const event of events) {
			const conflicts = event.inConflictWith || [];
			report.totalConflicts += conflicts.length;

			if (conflicts.length === 0) continue;

			// 👉 Détection des doublons
			const uniqueConflicts = [...new Set(conflicts)];
			const duplicates = conflicts.length - uniqueConflicts.length;
			if (duplicates > 0) {
				report.duplicateConflicts += duplicates;
				report.issues.push({
					eventId: event.id,
					issueType: "DUPLICATES",
					description: `${duplicates} conflit(s) en doublon`
				});
			}

			// 👉 Détection des auto-références
			const selfRefs = conflicts.filter((id: string) => id === event.id).length;
			if (selfRefs > 0) {
				report.selfReferences += selfRefs;
				report.issues.push({
					eventId: event.id,
					issueType: "SELF_REFERENCE",
					description: `${selfRefs} auto-référence(s)`
				});
			}

			// 👉 Vérification des conflits invalides et bidirectionnels
			for (const conflictId of uniqueConflicts) {
				if (conflictId === event.id) continue; // Déjà traité

				try {
					const conflictEvent = await pb.collection("events").getOne(conflictId as string);
					const conflictEventConflicts = conflictEvent.inConflictWith || [];

					// Vérifier si le conflit bidirectionnel existe
					if (!conflictEventConflicts.includes(event.id)) {
						report.missingBidirectional++;
						report.issues.push({
							eventId: event.id,
							issueType: "MISSING_BIDIRECTIONAL",
							description: `Conflit non réciproque avec ${conflictId}`
						});
					}
				} catch {
					report.invalidConflicts++;
					report.issues.push({
						eventId: event.id,
						issueType: "INVALID_CONFLICT",
						description: `Conflit invalide avec ${conflictId} (événement n'existe pas)`
					});
				}
			}
		}

		return report;
	} catch (error) {
		console.error("Erreur lors du diagnostic des conflits:", error);
		throw error;
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

	// 👉 Vérifier les conflits pour cette date
	const conflictMessage = generateDateProposalConflictMessage(dateProposal, currentEvent);

	// 👉 Vérifier si au moins un organisateur a confirmé 'oui'
	const confirmedOrganizers = filterAndConvertOrganizers(dateProposal.organizers || []);

	// Si conflits ou pas d'organisateurs confirmés, demander confirmation
	if (conflictMessage || confirmedOrganizers.length === 0) {
		let confirmationMessage = "";

		if (confirmedOrganizers.length === 0) {
			confirmationMessage +=
				"Aucun·e organisateur·ice n'a confirmé ('oui') sa présence pour cette date.<br/><br/>";
		}

		if (conflictMessage) {
			confirmationMessage += "<br/>" + conflictMessage + "<br/>";
		}

		if (confirmedOrganizers.length === 0 && !conflictMessage) {
			confirmationMessage += "Voulez-vous vraiment valider cette date ?";
		}

		// Ouvrir le modal de confirmation
		modalState.confirm = {
			isOpen: true,
			data: {
				title: conflictMessage ? "Attention : Conflits détectés" : "Attention",
				message: confirmationMessage,
				variant: conflictMessage ? "danger" : "warning",
				onConfirm: async () => {
					await proceedWithDateValidation(
						currentEvent,
						dateProposal,
						currentUser,
						notify,
						willBeConfirmed
					);
				}
			}
		};
		return;
	}

	// Pas de conflit et organisateurs confirmés, procéder directement
	await proceedWithDateValidation(currentEvent, dateProposal, currentUser, notify, willBeConfirmed);
}

/**
 * Procède à la validation de la date après confirmation
 */
async function proceedWithDateValidation(
	currentEvent: EventType,
	dateProposal: DateProposedType,
	currentUser: UserType,
	notify: boolean,
	willBeConfirmed: boolean
): Promise<void> {
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
 * Gère l'ouverture du modal de confirmation pour la validation d'une date avec détection des conflits
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
	let variant: "warning" | "danger" = hasConfirmedOrganizers ? "warning" : "danger";

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
				"<p><br/>Si vous souhaiter confirmer l'événement, vous devez auparavant completer certaines informations.</p>";
		}
	} else {
		message += `Attention : Aucun·e organisateur·ice n'a confirmé sa présence pour cette date (${lisibleDate(
			dateProposal.dateStart
		)}). Êtes-vous sûr·e de vouloir la valider ?`;
	}

	// Gestion des conflits
	if (conflictMessage) {
		// title = "Attention : Conflits détectés";
		variant = "danger";
		message += "<br/>" + conflictMessage + "<br/>";
	}

	let additionalButton:
		| {
				label: string;
				onClick: () => Promise<void>;
				variant?: "primary" | "success" | "warning" | "error";
		  }
		| undefined = undefined;

	// Bouton pour confirmer l'événement (priorité la plus haute)
	if (canBeConfirmed) {
		additionalButton = {
			label: "Valider et confirmer l'événement",
			variant: "success",
			onClick: async () => {
				// Récupérer l'état de la checkbox de notification
				const notifyCheckbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
				const notify = notifyCheckbox?.checked ?? true;

				const eventDataToUpdate = {
					...prepareDateValidationData(currentEvent, dateProposal),
					isConfirmed: true
				};

				if (options?.onValidate) {
					await options.onValidate(eventDataToUpdate);
				} else {
					await updateEventData(currentEvent.id, eventDataToUpdate);
				}

				if (notify) {
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
				// const notify = true; // 👉 Notification désactivée pour ce cas

				const eventDataToUpdate = prepareDateValidationData(currentEvent, dateProposal);

				// Ouvrir automatiquement le modal d'édition pour compléter
				setTimeout(() => {
					eventState.is = { ...currentEvent, ...eventDataToUpdate };
					eventState.pendingSondageValidation = true; // 👉 Indiquer qu'une validation de sondage vient d'avoir lieu
					modalState.event = true;
				}, 100);
			}
		};
	}

	modalState.confirm = {
		isOpen: true,
		data: {
			title,
			message,
			variant,
			showCheckbox: { checked: true, label: "Notifier les participant·es" },
			onConfirm: async (notify?: boolean) => {
				// Action par défaut : valider sans confirmer
				const eventDataToUpdate = prepareDateValidationData(currentEvent, dateProposal);

				if (options?.onValidate) {
					await options.onValidate(eventDataToUpdate);
				} else {
					await validateDate(currentEvent, dateProposal, currentUser, notify, false);
					return; // validateDate gère déjà les notifications
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
export function checkSondageValidation(
	eventData: EventType,
	hasSondageValidation: boolean
): {
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
				? `<p>Vous avez validé la date et cloturé le sondage : les participants seront notifiés. L'événement peut être confirmé afin d'être publié et ajouté à la newsletter.</p>`
				: `<p>Vous avez validé la date et cloturé le sondage. Les participants seront notifiés. Si vous souhaitez confirmer l'événement (publication en ligne), vous devez d'abord compléter certaines informations manquantes.</p>`,
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
	eventMode: string,
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
						eventId: excludeEventIds ? undefined : eventData.id,
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
					eventId: excludeEventIds ? undefined : eventData.id,
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
		showAlert("Événement sauvegardé, mais erreur lors de la mise à jour des conflits.", "error");
	}
}

/**
 * Prépare et affiche un modal de confirmation pour la soumission d'événement
 */
export function handleEventSubmissionConfirmation(
	eventData: EventType,
	options: {
		conflictCheck?: ReturnType<typeof checkEventConflicts>;
		sondageCheck?: ReturnType<typeof checkSondageValidation>;
		shouldConfirm?: boolean; // 👉 Indique si la confirmation est déjà demandée
		onConfirm: (shouldConfirm?: boolean, notifyOthers?: boolean) => Promise<void>;
		onCancel?: () => void;
		onComplete?: () => void; // 👉 Nouvelle action pour "Compléter"
	}
) {
	const { conflictCheck, sondageCheck, shouldConfirm = false, onConfirm, onComplete } = options;

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

		// Bouton pour confirmer l'événement si possible ET si pas déjà demandé
		if (sondageCheck.canBeConfirmed && !shouldConfirm) {
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
			title: shouldConfirm ? "Confirmer l'événement" : "Enregistrer l'événement",
			message: messages.join("\n\n"),
			variant,
			confirmLabel: shouldConfirm ? "Continuer" : "Enregistrer",
			showCheckbox: {
				label: "Notifier les participant·es",
				checked: true
			},
			onConfirm: (notifyOthers) => onConfirm(shouldConfirm, notifyOthers),
			additionalButton: additionalButtons[0] // Pour l'instant, un seul bouton additionnel
		}
	};
}
