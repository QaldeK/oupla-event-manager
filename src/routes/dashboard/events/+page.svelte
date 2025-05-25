<script lang="ts">
	import EventCard from "$lib/components/eventscard/EventsCard.svelte";
	import { Pagination, LazyLoader } from "$lib/components/ui/pagination";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import { page } from "$app/state";
	import { Settings2 } from "lucide-svelte";

	// Configuration du lazy loading
	const ITEMS_PER_PAGE = 20;
	const LARGE_DATASET_THRESHOLD = 50;

	let currentPage = $state(1);
	let isLoadingMore = $state(false);

	// Filtres basés sur l'URL
	const activeFilters = $derived({
		status: page.url.searchParams.get("status") || "all",
		organizer: page.url.searchParams.get("organizer") || "all",
		viewMode: page.url.searchParams.get("view") || "lazy"
	});

	// Événements filtrés selon le statut sélectionné
	const allFilteredEvents = $derived.by(() => {
		let events;

		switch (activeFilters.status) {
			case "confirmed":
				events = eventsStore.confirmedEvents;
				break;
			case "pending":
			case "unconfirmed":
				events = eventsStore.unconfirmedEvents;
				break;
			case "eventsWithoutDate":
				events = eventsStore.eventsWithoutDate;
				break;
			case "eventsWithSondage":
				events = eventsStore.eventsWithSondage;
				break;
			case "eventsWithoutDateProposition":
				events = eventsStore.eventsWithoutDateProposition;
				break;
			case "eventsWithoutOrganizers":
				events = eventsStore.eventsWithoutOrganizers;
				break;
			default:
				events = eventsStore.allEvents;
		}

		return events;
	});

	// Titre de la page selon le filtre actif
	const eventsPageTitle = $derived.by(() => {
		switch (activeFilters.status) {
			case "confirmed":
				return "Événements Confirmés";
			case "pending":
				return "Événements en Attente de Confirmation";
			case "unconfirmed":
				return "Événements Non Confirmés";
			case "eventsWithoutDate":
				return "Événements Sans Date";
			case "eventsWithSondage":
				return "Événements avec Sondage";
			case "eventsWithoutDateProposition":
				return "Événements Sans Proposition de Date";
			case "eventsWithoutOrganizers":
				return "Événements Sans Organisateurs";
			default:
				return "Tous les Événements";
		}
	});

	// Événements à afficher selon le mode
	const displayedEvents = $derived.by(() => {
		const itemsToShow = currentPage * ITEMS_PER_PAGE;
		return allFilteredEvents.slice(0, itemsToShow);
	});

	// Configuration du lazy loading
	const lazyConfig = $derived.by(() => ({
		hasMore: displayedEvents.length < allFilteredEvents.length,
		isLoading: isLoadingMore
	}));

	// Statistiques d'affichage
	const displayStats = $derived.by(() => ({
		showing: displayedEvents.length,
		total: allFilteredEvents.length
	}));

	function handleLoadMore() {
		if (isLoadingMore || !lazyConfig.hasMore) return;

		isLoadingMore = true;

		setTimeout(() => {
			currentPage++;
			isLoadingMore = false;
		}, 200);
	}
</script>

<div>
	<!-- En-tête avec titre et contrôles -->
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-semibold">{eventsPageTitle}</h1>
		<div class="text-base-content/70 mt-1 text-sm">
			{#if displayStats.total === 0}
				Aucun événement trouvé
			{:else}
				{displayStats.showing} / {displayStats.total} événements
			{/if}
		</div>
	</div>

	{#if displayedEvents.length === 0}
		<div class="py-12 text-center">
			<div class="text-base-content/60 text-lg">
				{#if allFilteredEvents.length === 0}
					Aucun événement trouvé pour ce filtre
				{:else}
					Chargement des événements...
				{/if}
			</div>
		</div>
	{:else}
		<!-- Liste des événements -->
		<div class="flex flex-col gap-6">
			{#each displayedEvents as currentEvent (currentEvent.id)}
				<EventCard {currentEvent} />
			{/each}
		</div>

		<LazyLoader
			hasMore={lazyConfig.hasMore}
			isLoading={lazyConfig.isLoading}
			onLoadMore={handleLoadMore}
			loadMoreText="Charger plus d'événements ({allFilteredEvents.length -
				displayedEvents.length} restants)"
			noMoreText="Tous les événements ont été chargés"
		/>
	{/if}
</div>
