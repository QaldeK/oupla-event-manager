<script lang="ts">
	import ConflictsEvents from '$lib/components/ConflictsEvents.svelte';
	import EventsCard from '$lib/components/eventscard/EventsCard.svelte';
	import { eventsStore } from '$lib/shared/eventsStore.svelte';
	import type { EventsRecord, EventsResponse } from '$lib/types/pocketbase';

	// import { type EventType } from '$lib/shared/thisEvent.svelte';

	let eventsList = eventsStore.allEvents;
	let isLoading = false;
</script>

<div>
	<!-- FIXME :  la gestion des pages doit etre dans le layout ?  -->
	{#if isLoading}
		<p>Chargement en cours...</p>
	{:else}
		<div>
			<h1 class="mb-4 text-2xl">Tous les événéments</h1>
			<div class="flex flex-col gap-6 xl:w-3/5">
				<ConflictsEvents />
			</div>
		</div>
	{/if}
</div>
