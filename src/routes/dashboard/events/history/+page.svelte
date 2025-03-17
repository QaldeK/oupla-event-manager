<script lang="ts">
	import { pastEventsStore } from '$lib/shared/eventsStore.svelte';
	import { getSpace } from '$lib/shared/spaceOptions.svelte';
	import type { EventsRecord } from '$lib/types/pocketbase';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';

	let isLoading = $state(true);

	// Initialiser le store
	$effect(() => {
		async function initStore() {
			try {
				isLoading = true;
				await pastEventsStore.init({
					spaceId: getSpace.id,
					mode: 'dashboard'
				});
			} catch (error) {
				console.error('Erreur lors du chargement des événements passés:', error);
			} finally {
				isLoading = false;
			}
		}
		initStore();
	});

	// Grouper les événements par mois
	const months = $derived(() => {
		const months = new Map<string, EventsRecord[]>();

		// Utiliser allRecords du store
		const events = pastEventsStore.allRecords;

		for (const event of events) {
			if (!event.date_event) continue;
			const monthKey = event.date_event.substring(0, 7); // YYYY-MM
			if (!months.has(monthKey)) {
				months.set(monthKey, []);
			}
			months.get(monthKey)?.push(event);
		}

		// Trier les mois par ordre décroissant
		return new Map([...months.entries()].sort((a, b) => b[0].localeCompare(a[0])));
	});

	function formatMonth(monthKey: string) {
		const date = new Date(monthKey + '-01');
		return format(date, 'MMMM yyyy', { locale: fr });
	}

	function formatEventDate(date: string) {
		return format(new Date(date), 'dd MMMM yyyy', { locale: fr });
	}
</script>

<div class="container mx-auto p-4">
	<h1 class="mb-6 text-2xl font-bold">Historique des événements</h1>

	{#if isLoading}
		<div class="flex justify-center">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
		</div>
	{:else if months.size === 0}
		<div class="rounded-lg bg-gray-50 p-4 text-center">
			<p class="text-gray-600">Aucun événement passé trouvé</p>
		</div>
	{:else}
		{#each Array.from(months.entries()) as [monthKey, events]}
			<div class="mb-8">
				<h2 class="mb-4 text-xl font-semibold">{formatMonth(monthKey)}</h2>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each events as event}
						<div class="rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-md">
							<h3 class="font-medium text-gray-900">{event.event_title}</h3>
							<p class="text-fluid-sm mt-1 text-gray-600">
								{formatEventDate(event.date_event)}
							</p>
							<div class="text-fluid-sm mt-2 text-gray-500">
								<p>
									{event.time_start} - {event.time_end}
								</p>
								{#if event.rooms?.length}
									<p class="mt-1">
										Salles : {event.rooms.join(', ')}
									</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>
