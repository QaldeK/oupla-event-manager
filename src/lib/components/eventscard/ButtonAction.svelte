<script lang="ts">
	import DropDownModEvent from "$lib/components/DropDownModEvent.svelte";
	import { type EventType } from "$lib/types/event";
	import { lisibleDate } from "$lib/utils";
	import { pb } from "$lib/pocketbase.svelte";
	import { showAlert } from "$lib/shared/states.svelte";
	import { eventState, messageSheet, modalState } from "$lib/shared/states.svelte";
	import { hasAuthorizations } from "$lib/shared/states.svelte";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

	import {
		CalendarPlus,
		MessageCircle,
		PencilIcon,
		Menu,
		CalendarX,
		CalendarCheck
	} from "lucide-svelte";

	// ::: props and reactive states

	const { thisEvent: currentEvent } = $props();

	const hasAuth = $derived(
		hasAuthorizations({
			isRecurrent: currentEvent.isRecurrent,
			recurrenceTeam: currentEvent.recurrenceTeam,
			createdBy: currentEvent.created_by
		})
	);

	let hasMenuItems = $derived.by(() => {
		if (!currentEvent) return false;

		const hasConfirmedActions = !currentEvent.canceled && currentEvent.isConfirmed;
		const hasReportAction = hasConfirmedActions && !currentEvent.reportedTo;
		const hasRedoAction = currentEvent.canceled && !currentEvent.reportedTo;
		const hasPublishAction = hasConfirmedActions && !currentEvent.isPublished;

		return hasConfirmedActions || hasReportAction || hasRedoAction || hasPublishAction;
	});

	// ::: functions

	function modifyEvent(event: EventType) {
		eventState.is = event;
		modalState.event = true;
	}

	function handleModifyClick(event: EventType) {
		if (!hasAuth) {
			showAlert("Vous n'êtes pas autorisé à modifier cet événement.", "error");
			return;
		}
		modifyEvent(event);
	}

	function handleReportEvent(event: EventType) {
		eventState.is = event;
		modalState.report = true;
	}

	async function confirmEvent() {
		try {
			await pb.collection("events").update(currentEvent.id, { isConfirmed: true });
			showAlert(
				"L'événement a bien été confirmé. Il est maintenant visible sur le site publique, et vous pouvez l'ajouter à la newsletter.",
				"info"
			);
		} catch (error) {
			console.error("Error updating event:", error);
		}
	}

	async function cancelEvent() {
		modalState.confirm = {
			isOpen: true,
			data: {
				variant: "danger",
				title: "Annuler l'événement",
				message:
					"Êtes-vous sûr de vouloir annuler cet événement ? Les organisateur·ices en seront notifiées par email, et l'événement sera annoncé comme annulé sur le site.",
				onConfirm: async () => {
					try {
						await pb.collection("events").update(currentEvent.id, { canceled: true });
						showAlert("L'événement a bien été annulé", "info");
					} catch (error) {
						console.error("Error updating event:", error);
						showAlert("Une erreur est survenue lors de l'annulation", "error");
					}
				}
			}
		};
	}

	async function redoEvent() {
		try {
			await pb.collection("events").update(currentEvent.id, { canceled: false });
			showAlert("L'événement a bien été rétablit", "info");
		} catch (error) {
			console.error("Error updating event:", error);
		}
	}

	async function publishEvent() {
		try {
			await pb.collection("events").update(currentEvent.id, { isPublished: true });
			showAlert(
				"L'événement a été publié avec succès et est maintenant visible par le public.",
				"success"
			);
		} catch (error) {
			console.error("Error publishing event:", error);
			showAlert("Une erreur est survenue lors de la publication de l'événement", "error");
		}
	}
</script>

<div
	class="bg-base-100 @container flex flex-wrap justify-end gap-x-4 gap-y-1 rounded-b-lg border-t p-2 text-right"
>
	<div class="mr-auto">
		<button onclick={() => messageSheet.openMessages(currentEvent.id)} class="btn relative">
			<MessageCircle />
			<span class="@max-md:hidden">Discussion</span>
		</button>
	</div>

	{#if currentEvent.canceled && currentEvent.reportedTo}
		<div class="px-2 font-semibold text-red-700">
			L'événement à été reporté au {lisibleDate(currentEvent.reportedTo)}
		</div>
	{/if}

	{#if !currentEvent.canceled}
		{#if !currentEvent.isConfirmed && currentEvent.date_event && currentEvent.organizers?.length > 0 && currentEvent.time_start && currentEvent.time_end && hasAuth}
			<button class="btn" onclick={() => confirmEvent()}> confirmer </button>
		{/if}
		{#if currentEvent.isRecurrent}
			<div class={!hasAuth ? "cursor-default opacity-50" : ""}>
				<DropDownModEvent {currentEvent} {hasAuth} />
			</div>
		{:else}
			<button
				onclick={() => handleModifyClick(currentEvent)}
				class="btn {!hasAuth ? 'cursor-default opacity-50' : ''}"
			>
				<PencilIcon />
				modifier
			</button>
		{/if}
	{/if}

	{#if hasMenuItems}
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				<button class="btn btn-ghost btn-square">
					<Menu class="h-5 w-5" />
				</button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="bg-base-200">
				{#if !currentEvent.canceled && currentEvent.isConfirmed}
					{#if !currentEvent.isPublished}
						<DropdownMenu.Item onclick={publishEvent}>
							<CalendarPlus class="mr-2 h-4 w-4" />
							Publier l'événement
						</DropdownMenu.Item>
					{/if}
					<DropdownMenu.Item onclick={cancelEvent} class="text-error">
						<CalendarX class="mr-2 h-4 w-4" />
						Annuler l'événement
					</DropdownMenu.Item>
					{#if !currentEvent.reportedTo}
						<DropdownMenu.Item onclick={() => handleReportEvent(currentEvent)}>
							<CalendarPlus class="mr-2 h-4 w-4" />
							Reporter
						</DropdownMenu.Item>
					{/if}
				{/if}
				{#if currentEvent.canceled && !currentEvent.reportedTo}
					<DropdownMenu.Item onclick={redoEvent}>
						<CalendarCheck class="mr-2 h-4 w-4" />
						Rétablir l'événement
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{/if}
</div>
