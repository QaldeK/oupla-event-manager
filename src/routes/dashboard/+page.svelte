<script lang="ts">
	import ConflictsEvents from "$lib/components/ConflictsEvents.svelte";
	import RecurrentEventsCard from "$lib/components/RecurrentEventsCard.svelte";
	import RecentlyCreatedEventsCard from "$lib/components/RecentlyCreatedEventsCard.svelte";
	import UserEventsCard from "$lib/components/UserEventsCard.svelte";
	import UserSondagesCard from "$lib/components/UserSondagesCard.svelte";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import { userDb } from "$lib/shared/userDb.svelte";
	import type { UserType, ValidMaster, ValidOccurrence } from "$lib/types/types";

	let userEvents = $derived(eventsStore.userEvents);
	let userRecurrentEvents = $derived(eventsStore.userRecurrentEvents);
	let userSondageEvents = $derived(eventsStore.userSondageEvents);
	let recentlyCreatedEvents = $derived(eventsStore.recentlyCreatedEvents);

	let currentUser = $derived<UserType | null>(userDb.current);
</script>

<div>
	<div>
		<h1 class="mb-6 text-2xl font-semibold">Votre tableau de bord</h1>
		<div class="flex flex-col gap-8">
			<ConflictsEvents />

			{#if recentlyCreatedEvents.length > 0}
				<section class="my-8">
					<RecentlyCreatedEventsCard events={recentlyCreatedEvents as any} />
				</section>
			{/if}

			{#if userEvents.length > 0}
				<section class="my-8">
					<h2 class="text-fluid-xl font-bold">Vos prochains événements</h2>
					<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
						{#each userEvents as event (event.id)}
							<div><UserEventsCard event={event as any} /></div>
						{/each}
					</div>
				</section>
			{/if}

			{#if userSondageEvents.length > 0}
				<section class="my-8">
					<h2 class=" text-fluid-xl font-bold">Sondages auxquels vous avez répondu</h2>
					<div class="space-y-4">
						<!-- FIXIT : manage oldDates exclusion -->
						{#each userSondageEvents as currentEvent (currentEvent.id)}
							<UserSondagesCard
								currentEvent={currentEvent as any}
								{currentUser}
								bg="bg-base-100"
								showHeader={true}
								dates={currentEvent.dates_proposed as any}
							/>
						{/each}
					</div>
				</section>
			{/if}

			{#if userRecurrentEvents.length > 0}
				<section class="@container my-8">
					<h2 class="text-fluid-xl font-bold">Vos événements récurrents</h2>
					<div class="grid grid-cols-1 gap-10 @4xl:grid-cols-2">
						{#each userRecurrentEvents as master (master.id)}
							{@const occurrences = eventsStore.getEventsOccurences.filter(
								(event) => event.masterRecurrentId === master.id
							)}
							<!-- S'assurer que RecurrentEventsCard gère bien le cas où master.recurrence est null/undefined -->
							{#if master.recurrence}
								<RecurrentEventsCard
									master={master as ValidMaster}
									occurrences={occurrences as ValidOccurrence[]}
								/>
							{/if}
						{/each}
					</div>
				</section>
			{/if}

			<!-- Message si aucun événement/sondage/récurrent -->
			{#if userEvents.length === 0 && userSondageEvents.length === 0 && userRecurrentEvents.length === 0}
				<div class="bg-base-200 rounded-md border p-6 text-center">
					<p class="text-lg">Aucune activité pour le moment.</p>
					<p class="text-base-content/70 text-sm">
						Vous n'organisez aucun événement, n'avez pas répondu à des sondages ou ne faites partie
						d'aucune équipe récurrente.
					</p>
					<!-- Optionnel: Ajouter un bouton pour créer un événement -->
					<!-- <button class="btn btn-primary btn-sm mt-4">Créer un événement</button> -->
				</div>
			{/if}
		</div>
	</div>
</div>
