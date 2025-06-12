<script lang="ts">
	import Modal from "$lib/components/Modal.svelte";
	import DatePickerProposed from "$lib/components/forModal/DatePickerProposed.svelte";
	import { updateEvent } from "$lib/pocketbase.svelte";
	import { notificationService } from "$lib/services/notificationService.svelte";
	import { validateDate } from "$lib/services/eventActions";
	import { eventState, modalState, showAlert } from "$lib/shared/states.svelte";
	import { userDb } from "$lib/shared/userDb.svelte";
	import type { DateProposedType, EventType } from "$lib/types/types";
	import { filterAndConvertOrganizers, formatDatePb, formatTimePb } from "$lib/utils";

	let eventData = $state<EventType>(eventState.is as EventType);
	let dateAccepted: DateProposedType | null = $state(null);

	const closeModal = () => {
		modalState.dateSondage = false;
	};

	// ::: Event Handlers from DatePickerProposed :::
	function handleUpdateDatesProposed(dates: DateProposedType[]) {
		eventData.dates_proposed = dates;
		// Si une date acceptée est retirée, on la désélectionne
		if (dateAccepted && !dates.some((d) => d.dateStart === dateAccepted?.dateStart)) {
			dateAccepted = null;
		}
	}

	function handleUpdateIsSondage(isSondage: boolean) {
		eventData.isSondage = isSondage;
	}

	// 👉 Fonction pour valider une date proposée avec gestion des conflits
	async function handleValidateDate(dateProposal: DateProposedType) {
		if (!eventData?.id || !userDb.current) {
			showAlert("Erreur : données manquantes pour la validation", "error");
			return;
		}

		try {
			await validateDate(eventData, dateProposal, userDb.current, true, false);
			// Si validation réussie, fermer le modal
			closeModal();
		} catch (error) {
			console.error("Erreur lors de la validation de la date :", error);
			showAlert("Erreur lors de la validation de la date", "error");
		}
	}

	async function handleSubmit() {
		if (!eventData?.id) return;
		try {
			let dataToUpdate: Partial<EventType> = {};

			// Cas 1: Une date a été validée dans ce modal
			if (dateAccepted) {
				// 👉 On filtre les organisateurs 'oui' pour la date acceptée
				const confirmedOrganizers = filterAndConvertOrganizers(dateAccepted.organizers ?? []);

				// Vérifier si au moins un organisateur est confirmé 'oui'
				if (confirmedOrganizers.length === 0) {
					// Afficher la confirmation
					modalState.confirm = {
						isOpen: true,
						data: {
							title: "Attention",
							message:
								"Aucun·e organisateur·ice n'a confirmé ('oui') sa présence pour cette date. Voulez-vous vraiment la valider ?",
							variant: "warning", // 👉 Utiliser warning plutôt que danger peut-être ?
							onConfirm: async () => {
								// Confirmer sans organisateurs 'oui'
								dataToUpdate = {
									date_event: formatDatePb(dateAccepted!.dateStart),
									time_start: formatTimePb(dateAccepted!.dateStart),
									time_end: formatTimePb(dateAccepted!.dateEnd),
									organizers: confirmedOrganizers, // Sera vide ou seulement les 'maybehere' convertis
									dateStart: dateAccepted!.dateStart, // Garder la date ISO complète
									dateEnd: dateAccepted!.dateEnd, // Garder la date ISO complète
									isSondage: false, // Le sondage est terminé
									dates_proposed: [] // Vider les propositions
								};
								await updateEvent(eventData.id!, dataToUpdate);

								// Envoyer notification aux participants du sondage
								await notificationService.sendSondageValidationNotification({
									event: eventData,
									dateProposal: dateAccepted!,
									user: userDb.current!,
									options: { showUserFeedback: true }
								});

								closeModal();
							}
						}
					};
					return; // Sortir car on attend la confirmation
				} else {
					// Assez d'organisateurs, on prépare la mise à jour
					dataToUpdate = {
						date_event: formatDatePb(dateAccepted.dateStart),
						time_start: formatTimePb(dateAccepted.dateStart),
						time_end: formatTimePb(dateAccepted.dateEnd),
						organizers: confirmedOrganizers,
						dateStart: dateAccepted.dateStart,
						dateEnd: dateAccepted.dateEnd,
						isSondage: false,
						dates_proposed: []
					};
				}
			}
			// Cas 2: Pas de date validée, on sauvegarde juste les dates proposées actuelles
			else {
				dataToUpdate = {
					dates_proposed: eventData.dates_proposed,
					isSondage: eventData.isSondage // Sauvegarder si l'utilisateur a cliqué "annuler ce sondage"
					// Ne pas toucher aux organisateurs principaux ici
				};
			}

			// Appeler PocketBase seulement si des données sont à mettre à jour
			if (Object.keys(dataToUpdate).length > 0) {
				await updateEvent(eventData.id, dataToUpdate);

				// Si une date a été acceptée, envoyer une notification
				if (dateAccepted) {
					await notificationService.sendSondageValidationNotification({
						event: eventData,
						dateProposal: dateAccepted,
						user: userDb.current!,
						options: { showUserFeedback: true }
					});
				}
			}
			closeModal();
		} catch (e) {
			console.error("Erreur lors de la sauvegarde du sondage :", e);
			showAlert("Erreur lors de la sauvegarde du sondage :", "error");
		}
	}
</script>

<Modal>
	<div class="min-h-124">
		<h1 class="mb-4 text-2xl">
			Sondage disponibilité - <span class="font-bold">{eventData?.event_title}</span>
		</h1>

		<div class="py-4">
			<DatePickerProposed
				{eventData}
				onUpdateDatesProposed={handleUpdateDatesProposed}
				onUpdateIsSondage={handleUpdateIsSondage}
				onValidateDate={handleValidateDate}
			/>
		</div>
	</div>

	<div class="mt-4 flex flex-wrap justify-end gap-x-4 gap-y-2">
		<button type="button" class="btn btn-ghost" onclick={closeModal}>Fermer sans enregistrer</button
		>

		<button class="btn btn-primary" type="button" onclick={handleSubmit}>
			{dateAccepted ? "Valider et notifier" : "Enregistrer"}
		</button>
	</div>
</Modal>
