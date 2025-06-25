<script lang="ts">
	import DropDownModEvent from "$lib/components/DropDownModEvent.svelte";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import { pb } from "$lib/pocketbase.svelte";
	import { eventState, messageSheet, modalState, showAlert, userDb } from "$lib/shared";
	import { createEventActionPlan, handleEventAction } from "$lib/shared/eventActionHandler.svelte";
	import type { EventType } from "$lib/types/event.types";
	import { lisibleDate } from "$lib/utils";
	import { hasAuthorizations } from "$lib/utils/recurrence";

	import {
		CalendarCheck,
		CalendarPlus,
		CalendarX,
		Menu,
		MessageCircle,
		PencilIcon
	} from "lucide-svelte";

	// ::: props and reactive states

	const { thisEvent: currentEvent } = $props();

	const hasAuth = $derived(
		hasAuthorizations({
			isRecurrent: currentEvent.isRecurrent,
			recurrenceTeam: currentEvent.recurrence?.recurrenceTeam,
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

	async function handleConfirmEvent() {
		if (!userDb.current) return;
		const plan = await createEventActionPlan(currentEvent, {
			context: "external_action",
			wantsToConfirmEvent: true,
			checkConflicts: true,
			currentUser: userDb.current,
			notify: true
		});
		await handleEventAction(plan);
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
</script>

<div
	class="bg-base-100 @container flex flex-wrap justify-end gap-x-4 gap-y-1 rounded-b-lg border-t p-2 text-right"
>
	<div class="mr-auto">
		<button
			onclick={() => messageSheet.openMessages(currentEvent.id, currentEvent.event_title)}
			class="btn relative"
		>
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
		{#if !currentEvent.isConfirmed && !currentEvent.isSondage}
			<button class="btn" onclick={handleConfirmEvent}>
				<CalendarCheck />
				Confirmer
			</button>
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
				Modifier
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
