<script lang="ts">
	import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-svelte";

	interface Props {
		currentPage: number;
		totalPages: number;
		totalItems?: number;
		onPageChange: (page: number) => void;
		showInfo?: boolean;
		maxVisiblePages?: number;
	}

	let {
		currentPage,
		totalPages,
		totalItems,
		onPageChange,
		showInfo = true,
		maxVisiblePages = 7
	}: Props = $props();

	// Calculer les pages visibles autour de la page courante
	const visiblePages = $derived(() => {
		if (totalPages <= maxVisiblePages) {
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		}

		const half = Math.floor(maxVisiblePages / 2);
		let start = Math.max(1, currentPage - half);
		let end = Math.min(totalPages, start + maxVisiblePages - 1);

		// Ajuster le début si on est près de la fin
		if (end - start + 1 < maxVisiblePages) {
			start = Math.max(1, end - maxVisiblePages + 1);
		}

		const pages = [];

		// Ajouter la première page si nécessaire
		if (start > 1) {
			pages.push(1);
			if (start > 2) pages.push("...");
		}

		// Ajouter les pages du milieu
		for (let i = start; i <= end; i++) {
			pages.push(i);
		}

		// Ajouter la dernière page si nécessaire
		if (end < totalPages) {
			if (end < totalPages - 1) pages.push("...");
			pages.push(totalPages);
		}

		return pages;
	});

	const hasPrevious = $derived(currentPage > 1);
	const hasNext = $derived(currentPage < totalPages);

	function handlePageClick(page: number | string) {
		if (typeof page === "number" && page !== currentPage) {
			onPageChange(page);
		}
	}

	function handlePrevious() {
		if (hasPrevious) {
			onPageChange(currentPage - 1);
		}
	}

	function handleNext() {
		if (hasNext) {
			onPageChange(currentPage + 1);
		}
	}
</script>

{#if totalPages > 1}
	<div class="flex items-center justify-between">
		{#if showInfo && totalItems}
			<div class="text-base-content/70 text-sm">
				Page {currentPage} sur {totalPages} • {totalItems} éléments au total
			</div>
		{:else}
			<div></div>
		{/if}

		<div class="join">
			<!-- Bouton Précédent -->
			<button
				class="join-item btn btn-sm"
				disabled={!hasPrevious}
				onclick={handlePrevious}
				aria-label="Page précédente"
			>
				<ChevronLeft size={16} />
			</button>

			<!-- Pages -->
			{#each visiblePages as page (page)}
				{#if page === "..."}
					<div class="join-item btn btn-sm btn-disabled">
						<MoreHorizontal size={16} />
					</div>
				{:else}
					<button
						class="join-item btn btn-sm"
						class:btn-active={page === currentPage}
						onclick={() => handlePageClick(page)}
						aria-label="Page {page}"
						aria-current={page === currentPage ? "page" : undefined}
					>
						{page}
					</button>
				{/if}
			{/each}

			<!-- Bouton Suivant -->
			<button
				class="join-item btn btn-sm"
				disabled={!hasNext}
				onclick={handleNext}
				aria-label="Page suivante"
			>
				<ChevronRight size={16} />
			</button>
		</div>
	</div>
{/if}
