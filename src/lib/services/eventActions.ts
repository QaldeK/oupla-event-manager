// src/lib/services/eventActions.ts
import { updateEvent } from "$lib/pocketbase.svelte";
import { showAlert, eventState } from "$lib/shared/states.svelte";
// EventType et OrganizerType sont supposés être exportés depuis event.schema.ts
// OrganizerType doit inclure la propriété 'maybehere'.
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
	currentUser: UserType | null
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

	// Vérifier si l'utilisateur actuel a le rôle 'admin' ou 'dev'.
	// UserType.currentRole est utilisé conformément à sa définition.
	// FIXIT hasAuth
	if (!["admin"].includes(currentUser.currentRole)) {
		showAlert(
			"Permissions insuffisantes. Seuls les administrateurs ou développeurs peuvent valider une date.",
			"error"
		);
		return;
	}

	// Préparer les données pour la mise à jour de l'événement.
	// Utilise Partial<EventType> mais attention aux champs spécifiques de PocketBase (id, expand, etc.)
	const eventDataToUpdate: Partial<EventType> = {
		dateStart: dateProposal.dateStart,
		dateEnd: dateProposal.dateEnd,
		isSondage: false // Le sondage est terminé, l'événement devient un événement standard.
	};

	// Déterminer les organisateurs pour l'événement validé.
	// On prend ceux qui ont répondu "oui" à la date validée.
	const confirmedOrganizers = dateProposal.organizers
		?.filter((org) => org.maybehere === "oui")
		.map((org) => ({
			id: org.id,
			username: org.username,
			tasks: [] // TODO : initialiser a defaultTask
		}));

	//FIXIT !AI : on merge les organizers existant a confirmedOrganizers (sans doublon)
	if (confirmedOrganizers && confirmedOrganizers.length > 0) {
		eventDataToUpdate.organizers = confirmedOrganizers as OrganizerType[];
	} else {
		// S'il n'y a pas d'organisateurs ayant répondu "oui",
		// on conserve les organisateurs existants de l'événement ou on initialise à un tableau vide.
		eventDataToUpdate.organizers = currentEvent.organizers || [];
	}

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
