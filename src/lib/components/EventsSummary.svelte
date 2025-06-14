<script lang="ts">
	import { Search, X } from "lucide-svelte";
	import { goto } from "$app/navigation";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import { lisibleDateShort } from "$lib/utils";
	import { loadingState } from "$lib/shared/states.svelte";

	interface Props {
		displayedEvents: Array<any>;
		allFilteredEvents: Array<any>;
		visibleEventId?: string;
		onLoadUntilEvent?: (eventId: string) => Promise<void>;
	}

	let { displayedEvents, allFilteredEvents, visibleEventId, onLoadUntilEvent }: Props = $props();

	let searchTerm = $state("");
	let isSearchOpen = $state(false);
	let searchInput = $state<HTMLInputElement>();
	let searchTimeout: ReturnType<typeof setTimeout>;
	let eventsListContainer = $state<HTMLDivElement>();

	const summaryEvents = $derived.by(() => {
		const isSearchMode = searchTerm.trim().length > 0;

		if (isSearchMode) {
			// Mode recherche : chercher dans TOUS les événements
			const searchWords = searchTerm
				.toLowerCase()
				.split(" ")
				.filter((word) => word.length > 0);

			return eventsStore.allEvents.filter((event) => {
				const title = event.event_title?.toLowerCase() || "";
				return searchWords.every((word) => title.includes(word));
			});
		} else {
			// Mode liste : afficher seulement les événements du filtre actuel
			return allFilteredEvents;
		}
	});

	async function scrollToEvent(eventId: string) {
		// Déclencher le loading dès le clic

		const isInCurrentFilter = allFilteredEvents.some((event) => event.id === eventId);

		// Si l'événement n'est pas dans le filtre actuel, rediriger vers "tous les événements"
		if (!isInCurrentFilter) {
			loadingState.is = true;
			await goto("?status=all");
			// Attendre un peu que la page se mette à jour
			await new Promise((resolve) => setTimeout(resolve, 200));
		}

		const isEventDisplayed = displayedEvents.some((event) => event.id === eventId);

		if (!isEventDisplayed && onLoadUntilEvent) {
			loadingState.is = true;

			await onLoadUntilEvent(eventId);
		}

		// Attendre que l'élément soit dans le DOM
		await new Promise((resolve) => setTimeout(resolve, 100));

		const element = document.getElementById(eventId);
		if (element) {
			element.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});
			// Attendre que le scroll soit terminé avant d'arrêter le loading
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		// Arrêter le loading après le scroll
		loadingState.is = false;
	}

	function handleSearchInput(event: Event) {
		const target = event.target as HTMLInputElement;
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			searchTerm = target.value;
		}, 300);
	}

	function toggleSearch() {
		isSearchOpen = !isSearchOpen;
		if (isSearchOpen && searchInput) {
			setTimeout(() => searchInput?.focus(), 100);
		} else {
			searchTerm = "";
		}
	}

	function clearSearch() {
		searchTerm = "";
		if (searchInput) {
			searchInput.value = "";
			searchInput.focus();
		}
	}

	function formatEventDate(event: any): string {
		if (event.date_event) {
			return lisibleDateShort(event.date_event);
		}
		if (event.dates_proposed?.length > 0) {
			return `${event.dates_proposed.length} dates proposées`;
		}
		return "Date à définir";
	}

	// 👉 Auto-scroll pour centrer l'élément surligné
	$effect(() => {
		if (!visibleEventId || !eventsListContainer) return;

		const targetButton = eventsListContainer.querySelector(`[data-event-id="${visibleEventId}"]`);
		if (targetButton) {
			targetButton.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});
		}
	});
</script>

<!-- Version desktop (écrans larges) -->
<div class="hidden lg:block">
	<div class="fixed top-20 right-6 z-10 h-10/12 w-80">
		<div class="bg-base-100 border-base-300 flex h-full flex-col rounded-lg border shadow-sm">
			<!-- En-tête avec recherche -->
			<label class="input input-ghost">
				<Search class="opacity-70" />
				<input
					bind:this={searchInput}
					oninput={handleSearchInput}
					type="search"
					placeholder="Rechercher un événement..."
					class=""
				/>
				{#if searchTerm}
					<button
						onclick={clearSearch}
						class="hover:bg-base-200 absolute top-1/2 right-2 -translate-y-1/2 transform rounded p-1"
					>
						<X class="h-4 w-4" />
					</button>
				{/if}
			</label>

			<!-- Liste des événements -->
			<div bind:this={eventsListContainer} class="flex-1 overflow-y-auto p-1">
				{#if summaryEvents.length === 0}
					<div class="text-base-content/60 py-8 text-center">
						{#if searchTerm}
							Aucun événement trouvé
						{:else}
							Aucun événement
						{/if}
					</div>
				{:else}
					<div class="">
						{#each summaryEvents as event (event.id)}
							<div class="border-base-300/90 gap-2 border-b-1">
								<button
									data-event-id={event.id}
									onclick={() => scrollToEvent(event.id)}
									class="hover:bg-base-200 text-base-content/70 w-full px-2 py-2 text-left transition-colors hover:cursor-pointer {visibleEventId ===
									event.id
										? 'bg-base-200 '
										: ''} "
								>
									<div class="flex items-center justify-between">
										<div
											class="text-base-content/60 rounded-lg px-2 text-xs {event.isConfirmed &&
												!event.canceled &&
												'bg-success/10'} {!event.isConfirmed && !event.canceled && 'bg-warning/10'}
									 {event.canceled && 'bg-error/10'}"
										>
											{formatEventDate(event)}
										</div>
										<div
											class="line-clamp-2 flex max-h-9 max-w-3/5 flex-wrap text-end text-sm font-medium"
										>
											{event.event_title}
										</div>
									</div>
									<!-- {#if !displayedEvents.some((e) => e.id === event.id)}
								<div class="text-warning mt-1 text-xs">• Non chargé</div>
							{/if} -->
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Version mobile/tablette (écrans petits) -->
<div class="fixed right-4 bottom-4 z-10 lg:hidden">
	{#if isSearchOpen}
		<div
			class="bg-base-100 border-base-300 w-80 max-w-[calc(100vw-2rem)] rounded-lg border p-4 shadow-lg"
		>
			<div class="relative mb-3">
				<input
					bind:this={searchInput}
					oninput={handleSearchInput}
					type="text"
					placeholder="Rechercher un événement..."
					class="input input-bordered w-full pr-8 pl-10"
				/>
				<Search
					class="text-base-content/50 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform"
				/>
				<button
					onclick={toggleSearch}
					class="hover:bg-base-200 absolute top-1/2 right-2 -translate-y-1/2 transform rounded p-1"
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<div class="max-h-60 overflow-y-auto">
				{#if summaryEvents.length === 0}
					<div class="text-base-content/60 py-4 text-center">Aucun événement trouvé</div>
				{:else}
					<div class="space-y-1">
						{#each summaryEvents.slice(0, 10) as event (event.id)}
							<button
								data-event-id={event.id}
								onclick={async () => {
									await scrollToEvent(event.id);
									toggleSearch();
								}}
								class="hover:bg-base-200 w-full rounded p-2 text-left transition-colors"
							>
								<div class="mb-1 line-clamp-1 text-sm font-medium">
									{event.event_title}
								</div>
								<div class="text-base-content/60 text-xs">
									{formatEventDate(event)}
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<button onclick={toggleSearch} class="btn btn-primary btn-circle shadow-lg">
			<Search class="h-5 w-5" />
		</button>
	{/if}
</div>

<style>
	.line-clamp-1 {
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
