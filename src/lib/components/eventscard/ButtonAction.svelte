<script lang="ts">
	import DropDownModEvent from '$lib/components/DropDownModEvent.svelte';
	import { Button } from '$lib/components/ui/button';
	import { type EventType } from '$lib/types/event';
	import { lisibleDate } from '$lib/utils';
	import { pb } from '$lib/pocketbase.svelte';
	import { showAlert } from '$lib/shared/states.svelte';
	import { eventState, messageSheet, modalState } from '$lib/shared/states.svelte';

	import { CalendarPlus, MessageCircle, PencilIcon } from 'lucide-svelte';

	const { thisEvent: currentEvent } = $props();

	const modifyEvent = (event: EventType) => {
		eventState.is = event;
		modalState.event = true;
	};

	const handleReportEvent = (event: EventType) => {
		eventState.is = event;
		modalState.report = true;
	};

	async function confirmEvent() {
		try {
			const record = await pb.collection('events').update(currentEvent.id, { isConfirmed: true });
			showAlert(
				"L'événement a bien été confirmé. Il est maintenant visible sur le site publique, et vous pouvez l'ajouter à la newsletter.",
				'info'
			);
		} catch (error) {
			console.error('Error updating event:', error);
		}
	}
	async function cancelEvent() {
		try {
			const record = await pb.collection('events').update(currentEvent.id, { canceled: true });
			showAlert("L'événement a bien été annulé", 'info');
		} catch (error) {
			console.error('Error updating event:', error);
		}
	}
	async function redoEvent() {
		try {
			const record = await pb.collection('events').update(currentEvent.id, { canceled: false });
			showAlert("L'événement a bien été rétablit", 'info');
		} catch (error) {
			console.error('Error updating event:', error);
		}
	}
</script>

<div
	class=" flex flex-wrap justify-end gap-x-4 gap-y-1 rounded-b-lg bg-gray-100 px-2 py-1 text-right"
>
	<div class=" mr-auto">
		<Button
			variant="outline"
			size="default"
			onclick={() => messageSheet.openMessages(currentEvent.id)}
			class="relative "
		>
			<MessageCircle class="mr-1 h-4 w-4" />
			Discussion
		</Button>
	</div>

	{#if !currentEvent.canceled && currentEvent.isConfirmed}
		<Button onclick={() => cancelEvent()} size="default" variant="slate">Annuler l'événement</Button
		>
	{:else if currentEvent.canceled && !currentEvent.reportedTo}
		<Button onclick={() => redoEvent()} size="default" variant="slate">Rétablir l'événement</Button>
	{/if}
	{#if !currentEvent.reportedTo && currentEvent.isConfirmed}
		<Button onclick={() => handleReportEvent(currentEvent)} size="default" variant="slate">
			<CalendarPlus />
			Reporter
		</Button>
	{/if}
	{#if currentEvent.canceled && currentEvent.reportedTo}
		<div class="px-2 font-semibold text-red-700">
			L'événement à été reporté au {lisibleDate(currentEvent.reportedTo)}
		</div>
	{/if}
	{#if !currentEvent.canceled}
		{#if !currentEvent.isConfirmed && currentEvent.date_event && currentEvent.organizers?.length > 0 && currentEvent.time_start && currentEvent.time_end}
			<button
				class="text-fluid-sm rounded px-2 font-semibold hover:bg-slate-300"
				onclick={() => confirmEvent()}
			>
				confirmer
			</button>
		{/if}
		{#if currentEvent.isRecurrent}
			<DropDownModEvent {currentEvent} />
		{:else}
			<Button onclick={() => modifyEvent(currentEvent)} size="default" variant="slate">
				<PencilIcon />
				modifier
			</Button>
		{/if}
	{/if}
</div>
