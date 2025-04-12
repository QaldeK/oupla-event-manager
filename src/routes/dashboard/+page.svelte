<script lang="ts">
	import ConflictsEvents from '$lib/components/ConflictsEvents.svelte';
	import RecurrentEventsCard from '$lib/components/RecurrentEventsCard.svelte';
	import UserEventsCard from '$lib/components/UserEventsCard.svelte';
	import UserSondagesCard from '$lib/components/UserSondagesCard.svelte';
	import { eventsStore } from '$lib/shared/eventsStore.svelte';
	import type { EventsRecord, EventsResponse } from '$lib/types/pocketbase';
	import type { EventType, SyncEventRecord } from '$lib/types/event';
	import { pb } from '$lib/pocketbase.svelte';
	import { updateEvent } from '$lib/pocketbase.svelte';

	let isLoading = $state(true);
	let userEvents = $state<EventType[]>([]);
	let userSondageEvents = $state<EventType[]>([]);
	let recurrentEvents = $state<EventType[]>([]);

	$effect(() => {
		if (eventsStore.isInitialized && pb.authStore.isValid) {
			const userId = pb.authStore.model?.id;
			if (!userId) {
				isLoading = false;
				return; // Si pas d'ID utilisateur, on arrête
			}

			const allEvents = eventsStore.allEvents;
			const allMasterEvents = eventsStore.allMasterEvents;

			// Events où l'utilisateur est organisateur (non récurrents, avec date)
			userEvents = allEvents.filter(
				(event) =>
					!event.isRecurrent &&
					event.date_event && // Assure que date_event existe
					event.organizers?.some((org) => org.id === userId)
			);

			// Events (sondages) où l'utilisateur a répondu "oui" ou "peut-être"
			userSondageEvents = allEvents.filter((event) =>
				// Vérifie s'il y a des dates proposées
				event.dates_proposed?.some((date) =>
					// Vérifie si l'utilisateur a répondu oui ou peut-être pour cette date
					date.organizers?.some(
						(org) => org.id === userId && (org.maybehere === 'oui' || org.maybehere === 'peut-être')
					)
				)
			);

			// Events récurrents où l'utilisateur fait partie de l'équipe
			recurrentEvents = allMasterEvents.filter((event) =>
				event.recurrence?.recurrenceTeam?.some((member) => member?.id === userId)
			);

			isLoading = false;
		}
	});

	const confirmEvent = async (id: string) => {
		try {
			await updateEvent(id, { isConfirmed: true });
		} catch (error) {
			console.error("Erreur lors de la confirmation de l'événement:", error);
		}
	};
</script>

<div>
	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else}
		<div>
			<h1 class="mb-6 text-2xl font-semibold">Tableau de bord</h1>
			<div class="flex flex-col gap-8 xl:w-3/5">
				<ConflictsEvents />

				{#if userEvents.length > 0}
					<section>
						<h2 class="mb-4 text-xl font-medium">Vos prochains événements</h2>
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							{#each userEvents as event (event.id)}
								<UserEventsCard {event} />
							{/each}
						</div>
					</section>
				{/if}

				<!-- 👉 Remplacer la boucle par l'appel au nouveau composant -->
				{#if userSondageEvents.length > 0}
					<section>
						<!-- Le titre est maintenant DANS la carte, on peut le supprimer ici -->
						<!-- <h2 class="mb-4 text-xl font-medium">Sondages auxquels vous avez répondu</h2> -->
						<UserSondagesCard events={userSondageEvents} />
						<!-- L'ancienne boucle est supprimée -->
						<!-- <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								{#each userSondageEvents as event (event.id)}
									<UserSondageCard {event} />
								{/each}
							</div> -->
					</section>
				{/if}

				{#if recurrentEvents.length > 0}
					<section>
						<h2 class="mb-4 text-xl font-medium">Vos événements récurrents</h2>
						<div class="space-y-4">
							{#each recurrentEvents as master (master.id)}
								{@const occurrences = eventsStore.getEventsOccurences.filter(
									(event) => event.masterRecurrentId === master.id
								)}
								<!-- S'assurer que RecurrentEventsCard gère bien le cas où master.recurrence est null/undefined -->
								{#if master.recurrence}
									<RecurrentEventsCard
										master={master as import('$lib/components/RecurrentEventsCard.svelte').ValidMaster}
										occurrences={occurrences as import('$lib/components/RecurrentEventsCard.svelte').ValidOccurrence[]}
										onConfirm={confirmEvent}
									/>
								{/if}
							{/each}
						</div>
					</section>
				{/if}

				<!-- Message si aucun événement/sondage/récurrent -->
				{#if userEvents.length === 0 && userSondageEvents.length === 0 && recurrentEvents.length === 0}
					<div class="bg-base-200 rounded-md border p-6 text-center">
						<p class="text-lg">Aucune activité pour le moment.</p>
						<p class="text-base-content/70 text-sm">
							Vous n'organisez aucun événement, n'avez pas répondu à des sondages ou ne faites
							partie d'aucune équipe récurrente.
						</p>
						<!-- Optionnel: Ajouter un bouton pour créer un événement -->
						<!-- <button class="btn btn-primary btn-sm mt-4">Créer un événement</button> -->
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
