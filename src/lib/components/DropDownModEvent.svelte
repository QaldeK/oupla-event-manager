<script lang="ts">
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import { eventState, modalState } from "$lib/shared/states.svelte";
	import { showAlert } from "$lib/shared/states.svelte";
	import { ChevronDown, PencilIcon } from "lucide-svelte";

	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

	let { currentEvent, hasAuth } = $props();

	const modifyMasterEvent = () => {
		const masterEvent = eventsStore.getEventById(currentEvent.masterRecurrentId);
		if (masterEvent) {
			eventState.is = masterEvent;
			modalState.event = true;
		} else {
			console.error("Master recurrent event not found in store:", currentEvent.masterRecurrentId);
			showAlert("Événement récurrent principal introuvable.", "error");
		}
	};

	const modifyThisOccurrence = () => {
		eventState.is = currentEvent;
		modalState.event = true;
	};
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		<button class="btn">
			<PencilIcon /> Modifier <ChevronDown />
		</button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="bg-base-200 ">
		{#if hasAuth}
			<DropdownMenu.Item onclick={modifyThisOccurrence}>Cette occurrence</DropdownMenu.Item>
			<DropdownMenu.Item onclick={modifyMasterEvent}>Toutes les occurrences</DropdownMenu.Item>
		{:else}
			Vous n'êtes pas autorisé à modifier cet événement.
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
