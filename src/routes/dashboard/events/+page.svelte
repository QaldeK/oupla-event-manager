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

	// Détermine le mode d'affichage optimal
	const displayMode = $derived.by(() => {
		const total = allFilteredEvents.length;
		
		if (activeFilters.viewMode === "lazy") return "lazy";
		if (activeFilters.viewMode === "pagination") return "pagination";
		if (activeFilters.viewMode === "all") return "all";
		
		// Mode automatique
		if (total > LARGE_DATASET_THRESHOLD * 2) return "lazy";
		if (total > LARGE_DATASET_THRESHOLD) return "pagination";
		return "all";
	});

	// Événements à afficher selon le mode
	const displayedEvents = $derived.by(() => {
		switch (displayMode) {
			case "lazy": {
				const itemsToShow = currentPage * ITEMS_PER_PAGE;
				return allFilteredEvents.slice(0, itemsToShow);
			}
			case "pagination": {
				const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
				const endIndex = startIndex + ITEMS_PER_PAGE;
				return allFilteredEvents.slice(startIndex, endIndex);
			}
			default:
				return allFilteredEvents;
		}
	});

	// Configuration de la pagination
	const paginationConfig = $derived.by(() => ({
		currentPage,
		totalPages: Math.ceil(allFilteredEvents.length / ITEMS_PER_PAGE),
		totalItems: allFilteredEvents.length,
		hasNext: currentPage < Math.ceil(allFilteredEvents.length / ITEMS_PER_PAGE),
		hasPrevious: currentPage > 1
	}));

	// Configuration du lazy loading
	const lazyConfig = $derived.by(() => ({
		hasMore: displayedEvents.length < allFilteredEvents.length,
		isLoading: isLoadingMore
	}));

	// Statistiques d'affichage
	const displayStats = $derived.by(() => ({
		showing: displayedEvents.length,
		total: allFilteredEvents.length,
		mode: displayMode
	}));

	// Réinitialiser la pagination quand les filtres changent
	$effect(() => {
		// Observer les changements de filtres
		void activeFilters.status;
		void activeFilters.organizer;
		currentPage = 1;
	});

	function handlePageChange(page: number) {
		currentPage = page;
		// Scroll vers le haut pour une meilleure UX
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function handleLoadMore() {
		if (isLoadingMore || !lazyConfig.hasMore) return;

		isLoadingMore = true;
		
		setTimeout(() => {
			currentPage++;
			isLoadingMore = false;
		}, 200);
	}

	function changeViewMode(mode: string) {
		const url = new URL(window.location.href);
		if (mode === "auto") {
			url.searchParams.delete("view");
		} else {
			url.searchParams.set("view", mode);
		}
		window.history.replaceState({}, "", url.toString());
		currentPage = 1;
	}
</script>

<div>
	<!-- En-tête avec titre et contrôles -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-semibold">{eventsPageTitle}</h1>
			<div class="mt-1 text-sm text-base-content/70">
				{#if displayStats.total === 0}
					Aucun événement trouvé
				{:else if displayMode === "all"}
					{displayStats.total} événement{displayStats.total > 1 ? "s" : ""}
				{:else if displayMode === "lazy"}
					{displayStats.showing} / {displayStats.total} événements
				{:else}
					Page {paginationConfig.currentPage} sur {paginationConfig.totalPages} • {displayStats.total} événements
				{/if}
			</div>
		</div>

		{#if allFilteredEvents.length > LARGE_DATASET_THRESHOLD}
			<div class="dropdown dropdown-end">
				<div tabindex="0" role="button" class="btn btn-sm btn-outline">
					<Settings2 size={16} />
					Mode d'affichage
				</div>
				<ul class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
					<li>
						<button
							onclick={() => changeViewMode("auto")}
							class:active={activeFilters.viewMode === "auto"}
						>
							Automatique ({displayMode})
						</button>
					</li>
					<li>
						<button
							onclick={() => changeViewMode("all")}
							class:active={activeFilters.viewMode === "all"}
						>
							Tout afficher
						</button>
					</li>
					<li>
						<button
							onclick={() => changeViewMode("pagination")}
							class:active={activeFilters.viewMode === "pagination"}
						>
							Pagination
						</button>
					</li>
					<li>
						<button
							onclick={() => changeViewMode("lazy")}
							class:active={activeFilters.viewMode === "lazy"}
						>
							Chargement progressif
						</button>
					</li>
				</ul>
			</div>
		{/if}
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

		<!-- Contrôles de navigation -->
		{#if displayMode === "pagination"}
			<div class="mt-8">
				<Pagination
					currentPage={paginationConfig.currentPage}
					totalPages={paginationConfig.totalPages}
					totalItems={paginationConfig.totalItems}
					onPageChange={handlePageChange}
				/>
			</div>
		{:else if displayMode === "lazy"}
			<LazyLoader
				hasMore={lazyConfig.hasMore}
				isLoading={lazyConfig.isLoading}
				onLoadMore={handleLoadMore}
				loadMoreText="Charger plus d'événements ({allFilteredEvents.length - displayedEvents.length} restants)"
				noMoreText="Tous les événements ont été chargés"
			/>
		{/if}
	{/if}
</div>