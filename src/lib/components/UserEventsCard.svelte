<script lang="ts">
	import { eventState, modalState } from '$lib/shared/states.svelte';
	import type { EventType } from '$lib/schemas/event.schema';
	import { lisibleDate, lisibleTime } from '$lib/utils';
	import { getContext } from 'svelte';
	import { Pencil, UserMinus } from 'lucide-svelte';
	import type { UserType } from '$lib/types/types';
	import { eventsStore } from '$lib/shared/eventsStore.svelte';

	let { event } = $props<{
		event: EventType;
	}>();

	// FIXIT: don't use getContext('currentUser') ?
	let currentUser: UserType = getContext('currentUser');

	const isCurrentUserSubscribed = $derived(() => {
		return event.organizers?.some((org) => org.id === currentUser.id);
	});

	const unsubscribeFromEvent = () => {
		if (!currentUser) return;
		// manageTaskSubscription gère la désinscription quand l'utilisateur est déjà inscrit
		eventsStore.manageTaskSubscription(event, currentUser);
	};

	// 👉 Helper pour lister les tâches de l'utilisateur actuel
	const currentUserTasks = $derived(
		event.organizers?.find((org) => org.id === currentUser.id)?.tasks ?? []
	);
</script>

<div class=" bg-base-100 mb-4 overflow-hidden rounded-lg border shadow-md">
	<div class="flex h-full flex-col">
		<div class="p-3">
			<!-- En-tête -->
			<div class="flex items-center justify-between gap-4">
				<div class="grid">
					<div class="text-fluid-lg font-bold">{event.event_title}</div>
					<div class="text-fluid-xs mt-1 mb-2">
						{#each event.categories as category, index (category)}
							<span class="font-medium uppercase">
								{category}{index < event.categories.length - 1 ? ', ' : ''}
							</span>
						{/each}
					</div>
				</div>
				<div class="text-fluid-sm text-right">
					{#if event.date_event}
						<div class="font-medium">{lisibleDate(new Date(event.date_event))}</div>
						{#if event.time_start && event.time_end}
							<div class="text-base-content/80">{event.time_start} - {event.time_end}</div>
						{/if}
					{:else if event.dates_proposed?.length}
						<div class="text-warning">Sondage en cours</div>
					{:else}
						<div class="text-base-content/70 italic">Date à définir</div>
					{/if}
				</div>
			</div>

			<!-- Organisateurs et tâches -->
			<div class="mt-2 flex flex-wrap items-center gap-2">
				{#if currentUserTasks.length > 0}
					<div class="text-fluid-sm">Vos taches:</div>
					{#each currentUserTasks as taskName (taskName)}
						<div class="badge badge-accent badge-soft font-semibold">
							{taskName}
						</div>
					{/each}
				{:else if isCurrentUserSubscribed()}
					<div class="badge badge-warning badge-soft font-semibold">Aucune tâche assignée</div>
				{/if}
			</div>
		</div>

		<div class="mt-auto flex justify-end gap-x-2 border-t px-3 py-1.5">
			{#if isCurrentUserSubscribed()}
				<button
					onclick={unsubscribeFromEvent}
					class="btn btn-outline btn-compact {currentUserTasks.length > 1
						? 'btn-accent'
						: 'btn-error'}"
				>
					<UserMinus class="mr-1 h-4 w-4" />
					{#if currentUserTasks.length > 1}
						vos tâches
					{:else}
						se désinscrire
					{/if}
				</button>
			{/if}
			<button
				onclick={() => {
					eventState.is = event;
					modalState.event = true;
				}}
				class="btn btn-compact btn-soft"
			>
				<Pencil class="mr-1 h-4 w-4" />
			</button>
		</div>
	</div>
</div>
