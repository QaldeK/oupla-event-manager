// src/lib/services/eventActions.ts
import { updateEvent } from "$lib/pocketbase.svelte";
import { showAlert, getSpace, modalState } from "$lib/shared";
import {
	formatDatePb,
	formatTimePb,
	filterAndConvertOrganizers,
	lisibleDate,
	lisibleTime
} from "$lib/utils";
import type { EventType, OrganizerType, TaskType, DateProposedType } from "$lib/types/types";
import type { UserType } from "$lib/types/types";

/**
 * Valide une date proposée pour un événement.
 * Cette action met à jour l'événement avec la date choisie,
 * transforme l'événement de sondage en événement confirmé,
 * et met à jour la liste des organisateurs.
 *
 * @param currentEvent L'événement actuel (EventType) concerné par la validation.
 * @param dateProposal La proposition de date (DateProposedType) à valider.
 * @param currentUser L'utilisateur (UserType) effectuant l'action. Doit avoir un rôle 'admin' ou 'dev'.
 */
export async function validateDate(
	currentEvent: EventType,
	dateProposal: DateProposedType,
	currentUser: UserType | null,
	notify?: boolean
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

	// Préparer les données pour la mise à jour de l'événement.
	// Utilise Partial<EventType> mais attention aux champs spécifiques de PocketBase (id, expand, etc.)
	const eventDataToUpdate: Partial<EventType> = {
		date_event: formatDatePb(dateProposal.dateStart),
		time_start: formatTimePb(dateProposal.dateStart),
		time_end: formatTimePb(dateProposal.dateEnd),
		dateStart: dateProposal.dateStart,
		dateEnd: dateProposal.dateEnd,
		isSondage: false
	};

	const confirmedOrganizers: OrganizerType[] =
		filterAndConvertOrganizers(dateProposal.organizers) || [];

	const updatedOrganizers = [...(currentEvent.organizers || [])];

	for (const confirmedOrg of confirmedOrganizers) {
		// Chercher si l'organisateur existe déjà
		const existingOrgIndex = updatedOrganizers.findIndex((org) => org.id === confirmedOrg.id);

		if (existingOrgIndex !== -1) {
			// 👉 Si l'organisateur existe, on met simplement à jour son statut et sa disponibilité
			// tout en préservant ses tâches existantes
			updatedOrganizers[existingOrgIndex] = {
				...confirmedOrg,
				tasks: updatedOrganizers[existingOrgIndex].tasks
			};
		} else {
			updatedOrganizers.push(confirmedOrg);
		}
	}

	eventDataToUpdate.organizers = updatedOrganizers;

	try {
		await updateEvent(currentEvent.id, eventDataToUpdate as Partial<EventType>);
		showAlert(
			"La date de l'événement a été validée et enregistrée avec succès. Un email avertira celles et ceux ayant participé au sondage",
			"success"
		);
	} catch (err) {
		console.error("Erreur lors de la validation de la date :", err);
		showAlert(
			"Une erreur est survenue lors de la validation de la date. Veuillez réessayer.",
			"error"
		);
	}
}

export const handleValidateDate = (
	currentEvent: EventType,
	dateProposal: DateProposedType,
	currentUser: UserType
) => {
	const confirmedOrganizersList = filterAndConvertOrganizers(dateProposal.organizers || []);
	const hasConfirmedOrganizers = confirmedOrganizersList.length > 0;

	modalState.confirm = {
		isOpen: true,
		data: {
			title: "Cloturer le sondage",
			message: hasConfirmedOrganizers
				? `Choisir la date du ${lisibleDate(dateProposal.dateStart)} (${lisibleTime(dateProposal.dateStart)}-${lisibleTime(dateProposal.dateEnd)}) ? Le sondage sera clôturé et les participants notifiés.`
				: `Attention : Aucun·e organisateur·ice n'a confirmé sa présence pour cette date (${lisibleDate(dateProposal.dateStart)}). Êtes-vous sûr·e de vouloir la valider ?`,
			variant: hasConfirmedOrganizers ? "warning" : "danger",
			showCheckbox: { checked: true, label: "Notifier les participant·es" },
			onConfirm: async (notify?: boolean) => {
				await validateDate(currentEvent, dateProposal, currentUser, notify);
			}
		}
	};
};

export const getUnassignedTasks = (event: EventType) => {
	if (!Array.isArray(event.tasks) || !Array.isArray(event.organizers)) {
		return [];
	}

	// Récupérer toutes les tâches assignées
	const assignedTasks = event.organizers.flatMap((org) => org.tasks || []);

	// Filtrer les tâches non assignées
	return event.tasks.filter((task) => !assignedTasks.includes(task.name));
};
