<script lang="ts">
	import { publicStore } from '$lib/shared/publicStore.svelte';
	import PublicEventCard from '$lib/components/public/PublicEventCard.svelte';
	import { Calendar } from 'lucide-svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Synchroniser les données du serveur avec le store
	$effect(() => {
		if (data.spaceInfo && data.events) {
			// Mettre à jour le store avec les données pré-chargées du serveur
			publicStore.spaceInfo = data.spaceInfo;
			publicStore.spaceEvents = data.events;
		}
	});
</script>

<div class="container mx-auto p-4">
	<h1 class="mb-6 text-2xl font-bold">Événements à venir</h1>

	{#if publicStore.spaceEvents.length === 0}
		<p class="py-8 text-center">Aucun événement à venir pour le moment.</p>
	{:else}
		<div class="flex gap-6">
			{#each publicStore.spaceEvents as event (event.id)}
				<PublicEventCard {event} spaceName={publicStore.spaceInfo?.name || ''} />
			{/each}
		</div>
	{/if}
</div>
