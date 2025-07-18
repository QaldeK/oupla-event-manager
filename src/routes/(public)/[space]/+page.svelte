<script lang="ts">
	import { publicStore } from "$lib/shared/publicStore.svelte";
	import PublicEventCard from "$lib/components/public/PublicEventCard.svelte";
	import { pb } from "$lib/pocketbase.svelte";
	import type { PageData } from "./$types";

	// Récupérer les données préchargées depuis le layout
	const { data } = $props<{ data: PageData }>();

	// Utiliser les données du layout pour le thème et l'espace
	let themeOptions = data.themeOptions;

	// Les événements restent gérés par le store (chargement dynamique)
	let events = $derived(publicStore.spaceEvents);

	// Extraire les options spécifiques à la carte
	let eventCardOptions = themeOptions.eventCard;

	function getImageUrl(event): string | null {
		if (event.image && event.image.length > 0) {
			try {
				const recordStub = {
					id: event.id,
					collectionId: "events_collection_id", // METTRE LE VRAI ID DE COLLECTION EVENTS
					collectionName: "events" // METTRE LE VRAI NOM DE COLLECTION EVENTS
				};
				return pb.files.getURL(recordStub, event.image[0], { thumb: "100x100" });
			} catch (e) {
				console.error("Erreur getFileUrl:", e);
				return null;
			}
		}
		return null;
	}
</script>

<div class="@container mx-auto md:p-12">
	<h1 class="mb-6 text-2xl font-bold">Événements à venir</h1>

	{#if publicStore.spaceEvents.length === 0}
		<p class="py-8 text-center">Aucun événement à venir pour le moment.</p>
	{:else}
		<div class="flex flex-wrap justify-center gap-12">
			{#each events as event (event.id)}
				{@const imageUrl = getImageUrl(event)}

				<PublicEventCard {event} cardOptions={eventCardOptions} eventImageUrl={imageUrl} />
			{/each}
		</div>
	{/if}
</div>
