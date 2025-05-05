<script lang="ts">
	import RecurrentEventsCard from "$lib/components/RecurrentEventsCard.svelte";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import type { EventType } from "$lib/types/event";
	import { updateEvent } from "$lib/pocketbase.svelte";

	const masters = $derived(eventsStore.allMasterEvents);
	const occurrencesMap = $derived(eventsStore.getEventsOccurences);

	// Créer un Map des occurrences groupées par masterRecurrentId
	const occurrencesByMaster = $derived.by(() => {
		const map = new Map<string, EventType[]>();
		occurrencesMap.forEach((occurrence) => {
			if (occurrence.masterRecurrentId) {
				if (!map.has(occurrence.masterRecurrentId)) {
					map.set(occurrence.masterRecurrentId, []);
				}
				map.get(occurrence.masterRecurrentId)?.push(occurrence);
			}
		});
		return map;
	});

	const handleConfirm = async (id: string) => {
		await updateEvent(id, { isConfirmed: true });
	};
</script>

<div class="@container">
	<div class="grid grid-cols-1 gap-x-12 gap-y-12 @md:p-4 @4xl:grid-cols-2">
		{#each masters as master (master.id)}
			<div class="grow">
				<RecurrentEventsCard
					{master}
					occurrences={occurrencesByMaster.get(master.id) || []}
					onConfirm={(id) => handleConfirm(id)}
				/>
			</div>
		{/each}
	</div>
</div>
