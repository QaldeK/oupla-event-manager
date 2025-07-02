<script lang="ts">
	import { publicStore } from "$lib/shared/publicStore.svelte";
	import PublicEventCard from "$lib/components/public/PublicEventCard.svelte";
	import { pb } from "$lib/pocketbase.svelte";
	import { Calendar } from "lucide-svelte";
	import type { PageData } from "./$types";
	import type { EventsResponse } from "$lib/types/pocketbase";

	// 👉 Utiliser PageData qui inclut LayoutData (et donc themeOptions si passé par le layout via @render)
	// SvelteKit fusionne automatiquement les données de LayoutData dans PageData.
	// Donc `data` ici contiendra `themeOptions` défini dans le load du layout (s'il y en avait un)
	// OU on le lira directement du store si on ne le passe pas via @render.
	// Ici, on suppose que le layout NE passe PAS explicitement themeOptions via @render,
	// donc on le lit directement depuis le store importé.
	let { data }: { data: PageData } = $props();

	let spaceInfo = $derived(publicStore.spaceInfo);
	let events = $derived(publicStore.spaceEvents);
	// 👉 Lire les options du thème directement depuis le store
	let themeOptions = $derived(publicStore.themeOptions);

	// 👉 Extraire les options spécifiques à la carte
	let eventCardOptions = $derived(themeOptions.eventCard);
	let spaceName = $derived(spaceInfo?.name ?? "");

	function getImageUrl(event): string | null {
		if (event.image && event.image.length > 0) {
			try {
				// Tentative avec un cast partiel (à risque si collectionId/Name manque)
				const recordStub = {
					id: event.id,
					collectionId: "events_collection_id", // METTRE LE VRAI ID DE COLLECTION EVENTS
					collectionName: "events" // METTRE LE VRAI NOM DE COLLECTION EVENTS
				};
				return pb.files.getURL(recordStub, event.image[0], { thumb: "100x100" }); // Ajouter thumb si désiré
				//return pb.getFileUrl(event as any, event.image[0]); // Moins sûr
			} catch (e) {
				console.error("Erreur getFileUrl:", e);
				return null; // Retourner null en cas d'erreur
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
