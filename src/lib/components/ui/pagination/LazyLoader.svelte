<script lang="ts">
	import { onMount } from "svelte";
	import { Loader2 } from "lucide-svelte";

	interface Props {
		hasMore: boolean;
		isLoading: boolean;
		onLoadMore: () => void;
		threshold?: number;
		loadMoreText?: string;
		loadingText?: string;
		noMoreText?: string;
		showButton?: boolean;
		autoLoad?: boolean;
	}

	let {
		hasMore,
		isLoading,
		onLoadMore,
		threshold = 200,
		loadMoreText = "Charger plus",
		loadingText = "Chargement...",
		noMoreText = "Tous les éléments ont été chargés",
		showButton = true,
		autoLoad = false
	}: Props = $props();

	let container: HTMLElement;
	let observer: IntersectionObserver;

	// Fonction pour charger plus d'éléments
	function handleLoadMore() {
		if (!isLoading && hasMore) {
			onLoadMore();
		}
	}

	// Configuration de l'intersection observer pour le scroll infini
	onMount(() => {
		if (autoLoad && container) {
			observer = new IntersectionObserver(
				(entries) => {
					const entry = entries[0];
					if (entry.isIntersecting && hasMore && !isLoading) {
						handleLoadMore();
					}
				},
				{
					rootMargin: `${threshold}px`
				}
			);

			observer.observe(container);
		}

		return () => {
			if (observer) {
				observer.disconnect();
			}
		};
	});
</script>

{#if hasMore || !hasMore}
	<div bind:this={container} class="mt-8 text-center">
		{#if hasMore}
			{#if showButton}
				<button
					class="btn btn-outline btn-wide"
					class:loading={isLoading}
					onclick={handleLoadMore}
					disabled={isLoading}
				>
					{#if isLoading}
						<Loader2 size={16} class="animate-spin mr-2" />
						{loadingText}
					{:else}
						{loadMoreText}
					{/if}
				</button>
			{:else if autoLoad && isLoading}
				<div class="flex items-center justify-center gap-2 text-base-content/70">
					<Loader2 size={16} class="animate-spin" />
					<span>{loadingText}</span>
				</div>
			{/if}
		{:else}
			<div class="text-base-content/50 text-sm">
				{noMoreText}
			</div>
		{/if}
	</div>
{/if}