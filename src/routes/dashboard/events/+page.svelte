<script lang="ts">
	// FIXIT : clean/filter passed events !
	import EventCard from "$lib/components/eventscard/EventsCard.svelte";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import type { EventType } from "$lib/types/event";
	import type { EventsRecord } from "$lib/types/pocketbase";

	import { page } from "$app/state";

	// Filtres basés sur l'URL
	const activeFilters = $derived.by(() => ({
		status: page.url.searchParams.get("status") || "all",
		organizer: page.url.searchParams.get("organizer") || "all"
	}));

	// Filtrage réactif avec $effect en utilisant eventsStore
	let filteredEvents: EventType[] = $state<EventType[]>([]);
	let eventsPageTitle = $state("");

	$effect(() => {
		let events;
		let pageTitle;

		// Filtrage par statut via eventsStore
		switch (activeFilters.status) {
			case "confirmed":
				events = eventsStore.confirmedEvents;
				pageTitle = "Événements Confirmés";
				break;
			case "pending":
				events = eventsStore.unconfirmedEvents;
				pageTitle = "Événements en Attente de Confirmation";
				break;
			case "eventsWithoutDate":
				events = eventsStore.eventsWithoutDate;
				pageTitle = "Événements Sans Date";
				break;
			case `unconfirmed`:
				events = eventsStore.unconfirmedEvents;
				pageTitle = "Événements Non Confirmés";
				break;
			case `eventsWithSondage`:
				events = eventsStore.eventsWithSondage;
				pageTitle = "Événements avec Sondage";
				break;

			case `eventsWithoutDateProposition`:
				events = eventsStore.eventsWithoutDateProposition;
				pageTitle = "Événements Sans Proposition de Date";
				break;
			case `eventsWithoutOrganizers`:
				events = eventsStore.eventsWithoutOrganizers;
				pageTitle = "Événements Sans Organisateurs";
				break;

			default:
				events = eventsStore.allEvents;
				pageTitle = "Tous les Événements";
		}

		filteredEvents = events;
		eventsPageTitle = pageTitle;
	});
</script>

<div>
	<h1 class="mb-4 text-2xl">{eventsPageTitle}</h1>
	<div class="flex flex-col gap-6">
		{#each filteredEvents as currentEvent (currentEvent.id)}
			<EventCard {currentEvent} />
		{/each}
	</div>
</div>
