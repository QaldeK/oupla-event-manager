<script lang="ts">
	import DropDownModEvent from "$lib/components/DropDownModEvent.svelte";
	import type { EventType } from "$lib/types/event.types";
	import { lisibleDate } from "$lib/utils";
	import { pb } from "$lib/pocketbase.svelte";
	import { showAlert, userDb } from "$lib/shared";
	import { eventState, messageSheet, modalState } from "$lib/shared";
	import { hasAuthorizations } from "$lib/utils/recurrence";
	import { confirmEventAction } from "$lib/services/eventActions";
	import Dropdown from "$lib/components/ui/Dropdown.svelte";

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

	let isMenuOpen = $state(false);

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
		await confirmEventAction(currentEvent, userDb.current, true);
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
		{#if !currentEvent.isConfirmed}
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
				modifier
			</button>
		{/if}
	{/if}

	{#if hasMenuItems}
		<Dropdown
			bind:isOpen={isMenuOpen}
			position="bottom"
			align="right"
			width="w-64"
			triggerClass="btn btn-ghost btn-square"
			contentClass="bg-base-200"
			showCloseButton={false}
		>
			{#snippet trigger()}
				<Menu class="h-5 w-5" />
			{/snippet}

			{#snippet content()}
				<div class="menu p-2">
					<ul>
						{#if !currentEvent.canceled && currentEvent.isConfirmed}
							{#if !currentEvent.isPublished}
								<li>
									<button
										onclick={() => {
											publishEvent();
											isMenuOpen = false;
										}}
										class="flex items-center gap-2"
									>
										<CalendarPlus class="h-4 w-4" />
										Publier l'événement
									</button>
								</li>
							{/if}
							<li>
								<button
									onclick={() => {
										cancelEvent();
										isMenuOpen = false;
									}}
									class="text-error flex items-center gap-2"
								>
									<CalendarX class="h-4 w-4" />
									Annuler l'événement
								</button>
							</li>
							{#if !currentEvent.reportedTo}
								<li>
									<button
										onclick={() => {
											handleReportEvent(currentEvent);
											isMenuOpen = false;
										}}
										class="flex items-center gap-2"
									>
										<CalendarPlus class="h-4 w-4" />
										Reporter
									</button>
								</li>
							{/if}
						{/if}
						{#if currentEvent.canceled && !currentEvent.reportedTo}
							<li>
								<button
									onclick={() => {
										redoEvent();
										isMenuOpen = false;
									}}
									class="flex items-center gap-2"
								>
									<CalendarCheck class="h-4 w-4" />
									Rétablir l'événement
								</button>
							</li>
						{/if}
					</ul>
				</div>
			{/snippet}
		</Dropdown>
	{/if}
</div>
