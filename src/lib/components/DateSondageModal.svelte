<script lang="ts">
	import Modal from "$lib/components/Modal.svelte";
	import DatePickerProposed from "$lib/components/forModal/DatePickerProposed.svelte";
	import { updateEvent } from "$lib/pocketbase.svelte";
	import { createEventActionPlan, handleEventAction } from "$lib/shared/eventActionHandler.svelte";
	import { eventState, modalState, showAlert } from "$lib/shared/states.svelte";
	import { userDb } from "$lib/shared/userDb.svelte";
	import type { DateProposedType, EventType } from "$lib/types/types";

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
			const plan = await createEventActionPlan(eventData, {
				context: "external_action",
				isValidatingSondage: true,
				wantsToConfirmEvent: false,
				checkConflicts: true,
				currentUser: userDb.current,
				notify: true,
				dateSondageToValidate: dateProposal
			});
			await handleEventAction(plan);
			// Si validation réussie, fermer le modal
			// closeModal();
		} catch (error) {
			console.error("Erreur lors de la validation de la date :", error);
			showAlert("Erreur lors de la validation de la date", "error");
		}
	}

	async function handleSubmit() {
		if (!eventData?.id || !userDb.current) return;

		try {
			// Cas 1: Une date a été sélectionnée pour validation
			if (dateAccepted) {
				const plan = await createEventActionPlan(eventData, {
					context: "external_action",
					isValidatingSondage: false,
					wantsToConfirmEvent: false,
					checkConflicts: true,
					currentUser: userDb.current,
					notify: true
				});
				await handleEventAction(plan);
			}
			// Cas 2: Pas de date validée, on sauvegarde juste les dates proposées actuelles
			else {
				const dataToUpdate: Partial<EventType> = {
					dates_proposed: eventData.dates_proposed,
					isSondage: eventData.isSondage
				};

				if (Object.keys(dataToUpdate).length > 0) {
					await updateEvent(eventData.id, dataToUpdate);
				}
			}
			closeModal();
		} catch (e) {
			console.error("Erreur lors de la sauvegarde du sondage :", e);
			showAlert("Erreur lors de la sauvegarde du sondage", "error");
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
