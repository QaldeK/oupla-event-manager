<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import DatePickerProposed from '$lib/components/forModal/DatePickerProposed.svelte';
	import type { EventType } from '$lib/types/event';
	import { filterAndConvertOrganizers, formatDatePb, formatTimePb } from '$lib/utils';
	import { updateEvent } from '$lib/pocketbase.svelte';
	import type { DateProposedType } from '$lib/schemas/event.schema';
	import { eventState, modalState } from '$lib/shared/states.svelte';

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
	<div class="min-h-124">
		<h1 class="mb-4 text-2xl">
			Sondage disponibilité - <span class="font-bold">{eventData?.event_title}</span>
		</h1>

		<div class="py-4">
			<DatePickerProposed {eventData} />
		</div>
	</div>

	<div class="mt-4 flex flex-wrap justify-end gap-x-4 gap-y-2">
		<button type="button" class="btn btn-ghost" onclick={closeModal}>Fermer sans enregistrer</button
		>

		<button class="btn btn-primary" type="button" onclick={handleSubmit}>Enregistrer</button>
	</div>
</Modal>
