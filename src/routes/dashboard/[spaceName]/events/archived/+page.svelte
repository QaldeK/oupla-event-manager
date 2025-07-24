<script lang="ts">
	import ArchivedEventCard from "$lib/components/eventscard/ArchivedEventCard.svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	console.log(data.archivedEvents);
</script>

<h1 class="mb-4 text-2xl font-bold">Événements Archivés</h1>

{#if data.error}
	<div class="alert alert-error">{data.error}</div>
{:else if data.archivedEvents.length === 0}
	<p>Il n'y a pas d'événements dans les archives pour le moment.</p>
{:else}
	<div class="space-y-4">
		{#each data.archivedEvents as event (event.id)}
			<ArchivedEventCard currentEvent={event} />
		{/each}
	</div>

	<!-- Contrôles de pagination -->
	<div class="join mt-8">
		<a
			href="?page={data.pagination.page - 1}"
			class="join-item btn"
			disabled={data.pagination.page <= 1}
		>
			« Précédent
		</a>
		<button class="join-item btn">
			Page {data.pagination.page} / {data.pagination.totalPages}
		</button>
		<a
			href="?page={data.pagination.page + 1}"
			class="join-item btn"
			disabled={data.pagination.page >= data.pagination.totalPages}
		>
			Suivant »
		</a>
	</div>
{/if}
