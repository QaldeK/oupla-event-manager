<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import DatePickerProposed from '$lib/components/forModal/DatePickerProposed.svelte';
	import type { EventType } from '$lib/types/event';
	import { filterAndConvertOrganizers, formatDatePb, formatTimePb } from '$lib/utils';
	import ButtonGroupSelect from '$lib/components/forModal/ButtonGroupSelect.svelte';
	import { updateEvent } from '$lib/pocketbase.svelte';
	import type { DateProposedType } from '$lib/schemas/event.schema';
	import { getSpace } from '$lib/shared/spaceOptions.svelte';
	import { eventState, modalState } from '$lib/shared/states.svelte';

	import { Moon } from 'lucide-svelte';

	let eventData = $state<EventType>({ ...eventState.is });

	let datesProposed = $derived(eventData.dates_proposed);
	let organizers = $derived(eventData.organizers || []);
	let open = $state(modalState.dateSondage);
	let dateAccepted: DateProposedType | null = $state(null);

	const closeModal = () => {
		modalState.dateSondage = false;
	};

	async function handleSubmit() {
		if (!eventData) return;
		try {
			if (!eventData.date_event) {
				if (dateAccepted) {
					const hasConfirmedOrganizers = dateAccepted.organizers.some(
						(org) => org.maybehere === 'oui'
					);

					if (!hasConfirmedOrganizers) {
						modalState.confirm = {
							isOpen: true,
							data: {
								title: 'Attention',
								message:
									"Aucun·e organisateur·ice n'a confirmé sa présence pour cette date. Voulez-vous vraiment la valider ?",
								variant: 'danger',
								onConfirm: async () => {
									const updatedEvent = {
										...eventData,
										date_event: formatDatePb(dateAccepted.dateStart),
										time_start: formatTimePb(dateAccepted.dateStart),
										time_end: formatTimePb(dateAccepted.dateEnd),
										organizers: filterAndConvertOrganizers(dateAccepted.organizers),
										dateStart: dateAccepted.dateStart,
										dateEnd: dateAccepted.dateEnd
									};
									await updateEvent(eventData.id, updatedEvent);
									closeModal();
								}
							}
						};
						return;
					}

					const updatedEvent = {
						...eventData,
						date_event: formatDatePb(dateAccepted.dateStart),
						time_start: formatTimePb(dateAccepted.dateStart),
						time_end: formatTimePb(dateAccepted.dateEnd),
						organizers: filterAndConvertOrganizers(dateAccepted.organizers),
						dateStart: dateAccepted.dateStart,
						dateEnd: dateAccepted.dateEnd
					};
					await updateEvent(eventData.id, updatedEvent);
				} else {
					const updatedEvent = {
						...eventData,
						dates_proposed: datesProposed
					};
					await updateEvent(eventData.id, updatedEvent);
				}
			} else {
				const updatedEvent = {
					...eventData,
					organizers: organizers
				};
				await updateEvent(eventData.id, updatedEvent);
			}
			closeModal();
		} catch (error) {
			console.error(error);
		}
	}
</script>

<Modal>
	<h1 class="mb-4 text-2xl">
		Sondage disponibilité - <span class="font-bold">{eventData?.event_title}</span>
	</h1>

	<div class="py-4">
		<DatePickerProposed bind:eventData />
	</div>

	<div class="mt-4 flex flex-wrap justify-end gap-x-4 gap-y-2">
		<button
			type="button"
			class="block w-full rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-700 md:w-fit"
			onclick={closeModal}>Fermer sans enregistrer</button
		>

		<button
			class="block w-full rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 md:w-fit"
			type="button"
			onclick={handleSubmit}>Enregistrer</button
		>
	</div>
</Modal>
