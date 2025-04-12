<script lang="ts">
	import type { SyncStore } from '$lib/shared/syncState.svelte';
	import type { StoreRecord } from '$lib/types/syncState.types';

	interface Props {
		store: SyncStore<StoreRecord>;
		threshold?: number;
		loadingMessage?: string;
		endMessage?: string;
	}

	let {
		store,
		threshold = 90, // Pourcentage de scroll avant chargement
		loadingMessage = 'Chargement...',
		endMessage = 'Fin des résultats'
	}: Props = $props();

	let container: HTMLElement;
	let isNearBottom = false;

	// Observer pour détecter quand on approche de la fin
	const createObserver = () => {
		const observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				isNearBottom = entry.isIntersecting;

				if (isNearBottom && !store.isLoading && store.hasMore) {
					store.loadMore();
				}
			},
			{
				root: null,
				rootMargin: `${threshold}px`,
				threshold: 0
			}
		);

		// Créer un élément sentinel
		const sentinel = document.createElement('div');
		sentinel.style.height = '1px';
		container.appendChild(sentinel);
		observer.observe(sentinel);

		return () => {
			observer.disconnect();
			sentinel.remove();
		};
	};

	$effect(() => {
		store.initInfiniteScroll({ threshold });
		return createObserver();
	});
</script>

<div class="infinite-scroll-container" bind:this={container}>
	{@render children?.()}

	{#if store.isLoading}
		<div class="h-32 w-32 animate-spin rounded-full border-t-2 border-b-2 border-blue-500">
			{loadingMessage}
		</div>
	{:else if !store.hasMore}
		<div class="end-message">{endMessage}</div>
	{/if}
</div>
```

<style>
	.infinite-scroll-container {
		position: relative;
		min-height: 100px;
	}

	.end-message {
		text-align: center;
		padding: 1rem;
		color: #666;
	}
</style>
