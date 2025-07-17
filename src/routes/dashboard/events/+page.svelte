<script lang="ts">
	import EventCard from "$lib/components/eventscard/EventsCard.svelte";
	import EventsSummary from "$lib/components/EventsSummary.svelte";
	import { LazyLoader } from "$lib/components/ui/pagination";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import { loadingState } from "$lib/shared/states.svelte";
	import { page } from "$app/state";
	import { SvelteMap } from "svelte/reactivity";

	// Configuration du lazy loading
	const ITEMS_PER_PAGE = 15;

	let currentPage = $state(1);

	let visibleEventId = $state<string | undefined>(undefined);
	let intersectionObserver: IntersectionObserver | undefined;
	let currentVisibilityState = new SvelteMap<string, number>(); // 👉 État des intersections de chaque élément

	// Fonction pour charger des événements jusqu'à trouver un événement spécifique
	async function loadUntilEvent(targetEventId: string): Promise<void> {
		const maxAttempts = 20;
		let attempts = 0;

		while (attempts < maxAttempts) {
			if (displayedEvents.some((event) => event.id === targetEventId)) {
				break;
			}

			if (!lazyConfig.hasMore) {
				break;
			}

			currentPage++;
			attempts++;

			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	// Filtres basés sur l'URL
	const activeFilters = $derived({
		status: page.url.searchParams.get("status") || "all",
		organizer: page.url.searchParams.get("organizer") || "all"
	});

	// Événements filtrés selon le statut sélectionné / pages
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
		isLoading: loadingState.is
	}));

	// Statistiques d'affichage
	const displayStats = $derived.by(() => ({
		showing: displayedEvents.length,
		total: allFilteredEvents.length
	}));

	// 👉 Reset de la pagination quand le filtre change
	$effect(() => {
		// Observer le changement de filtre de statut
		activeFilters.status;
		// Remettre à la première page
		currentPage = 1;
	});

	function handleLoadMore() {
		if (loadingState.is || !lazyConfig.hasMore) return; // XXX Pourquoi loadingState ici ?

		loadingState.is = true;

		setTimeout(() => {
			currentPage++;
			loadingState.is = false;
		}, 200);
	}

	// Initialisation unique de l'IntersectionObserver
	$effect(() => {
		if (typeof window === "undefined") return;

		// 👉 Créer l'observer une seule fois avec hysteresis
		intersectionObserver = new IntersectionObserver(
			(entries) => {
				// 👉 Mettre à jour l'état de visibilité de chaque élément
				entries.forEach((entry) => {
					currentVisibilityState.set(entry.target.id, entry.intersectionRatio);
				});

				// 👉 Logique d'hysteresis
				const currentElementVisibility = visibleEventId
					? currentVisibilityState.get(visibleEventId) || 0
					: 0;

				// 👉 L'élément actuel reste actif tant qu'il est visible à plus de 20%
				const shouldKeepCurrent = visibleEventId && currentElementVisibility > 0.7;

				// 👉 Chercher un nouvel élément candidat seulement si nécessaire
				if (!shouldKeepCurrent) {
					let bestCandidate: string | undefined;
					let bestVisibility = 0.5; // 👉 Seuil d'entrée : 50% minimum

					for (const [elementId, visibility] of currentVisibilityState) {
						if (visibility > bestVisibility) {
							bestVisibility = visibility;
							bestCandidate = elementId;
						}
					}

					if (bestCandidate && bestCandidate !== visibleEventId) {
						visibleEventId = bestCandidate;
					}
				}
			},
			{
				threshold: [0, 0.2, 0.5, 0.8, 1], // 👉 Seuils pour hysteresis
				rootMargin: "-20% 0px -20% 0px"
			}
		);

		return () => {
			currentVisibilityState.clear();
			intersectionObserver?.disconnect();
			intersectionObserver = undefined;
		};
	});

	// Observer les événements affichés quand la liste change
	$effect(() => {
		if (!intersectionObserver || typeof window === "undefined") return;

		// 👉 Déconnecter tous les éléments observés avant de recommencer
		intersectionObserver.disconnect();

		// 👉 Observer tous les éléments actuellement affichés
		displayedEvents.forEach((event) => {
			const element = document.getElementById(event.id);
			if (element) {
				intersectionObserver!.observe(element);
				// 👉 Initialiser l'état si pas encore présent
				if (!currentVisibilityState.has(event.id)) {
					currentVisibilityState.set(event.id, 0);
				}
			}
		});

		// 👉 Nettoyer les états des éléments qui ne sont plus affichés
		const displayedIds = new Set(displayedEvents.map((e) => e.id));
		for (const [elementId] of currentVisibilityState) {
			if (!displayedIds.has(elementId)) {
				currentVisibilityState.delete(elementId);
			}
		}
	});
</script>

<div class="flex min-h-screen gap-y-6">
	<!-- Contenu principal -->
	<div class="flex-1 lg:pr-80">
		<!-- En-tête avec titre et contrôles -->
		<div class="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
			<div class="text-2xl font-semibold">{eventsPageTitle}</div>
			<div class="text-base-content/70">
				{#if displayStats.total === 0}
					Aucun événement trouvé
				{:else}
					• {displayStats.total} événements •
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
			<!-- Liste des événements avec overlay de loading -->
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

	<!-- Sommaire des événements (fixe à droite) -->
	<div class="ms-4">
		<EventsSummary
			{displayedEvents}
			{allFilteredEvents}
			{visibleEventId}
			onLoadUntilEvent={loadUntilEvent}
		/>
	</div>
</div>
