<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { eventsStore } from '$lib/shared/eventsStore.svelte';
	import { eventState, modalState } from '$lib/shared/states.svelte';
	import { showAlert } from '$lib/shared/states.svelte';

	import { ChevronDown, PencilIcon } from 'lucide-svelte';

	let { currentEvent } = $props();

	const modifyMasterEvent = () => {
		// Attendre le prochain tick pour laisser le dropdown finir sa fermeture
		setTimeout(() => {
			const masterEvent = eventsStore.getEventById(currentEvent.masterRecurrentId);
			if (masterEvent) {
				eventState.is = masterEvent;
				modalState.event = true;
			} else {
				console.error('Master recurrent event not found in store:', currentEvent.masterRecurrentId);
				showAlert('Événement récurrent principal introuvable.', 'error');
			}
		}, 200);
	};

	const modifyThisOccurrence = () => {
		setTimeout(() => {
			eventState.is = currentEvent;
			modalState.event = true;
		}, 200);
	};
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		<Button variant="slate"><PencilIcon /> Modifier <ChevronDown /></Button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="w-48 origin-top-right border-slate-300 " align="end">
		<DropdownMenu.Group class="gap-1 ">
			<DropdownMenu.Item class="cursor-pointer rounded " onclick={modifyThisOccurrence}
				>Cette occurrence</DropdownMenu.Item
			>
			<DropdownMenu.Separator class="mx-1 my-1 h-px bg-slate-300 shadow-xs" />
			<DropdownMenu.Item class="cursor-pointer rounded" onclick={modifyMasterEvent}
				>Toutes les occurrences</DropdownMenu.Item
			>
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>
