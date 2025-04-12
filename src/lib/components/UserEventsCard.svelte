<script lang="ts">
	import { eventState, modalState } from '$lib/shared/states.svelte';
	import type { EventType } from '$lib/types/event';
	import { handleTaskSubscription, lisibleDate, lisibleTime } from '$lib/utils';
	import { getContext } from 'svelte';
	import { PencilLine } from 'lucide-svelte';
	import type { UserType } from '$lib/types/types';

	let {
		event
	} = $props<{
		event: EventType;
	}>();

	let currentUser: UserType = getContext('currentUser');

	const isUserSubscribedToTask = (task: string) => {
		return event.organizers.some(
			(org) => org.id === currentUser.id && org.tasks.includes(task)
		);
	};

	const unsubscribeFromEvent = (taskName: string) => {
		handleTaskSubscription({
			task: taskName,
			currentUser,
			event,
			onShowConfirmModal: (options) => {
				modalState.confirm = {
					isOpen: true,
					data: {
						title: options.title,
						message: options.message,
						onConfirm: options.onConfirm,
						variant: 'warning'
					}
				};
			}
		});
	};
</script>

<div class="bg-base-100 overflow-hidden rounded-lg border shadow-md mb-4">
	<div class="p-3">
		<!-- En-tête -->
		<div class="flex justify-between items-center">
			<h3 class="font-bold">{event.event_title}</h3>
			<div class="text-right text-fluid-sm">
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

		<!-- Catégories de l'événement -->
		{#if event.categories?.length}
			<div class="text-fluid-xs mt-1 mb-2">
				{#each event.categories as category, index}
					<span class="font-medium uppercase">
						{category}{index < event.categories.length - 1 ? ', ' : ''}
					</span>
				{/each}
			</div>
		{/if}

		<!-- Organisateurs et tâches -->
		<div class="mt-2 flex flex-wrap items-center gap-2">
			{#if event.tasks?.length === 1}
				<!-- Cas simple: une seule tâche -->
				<div class="badge badge-accent badge-soft font-semibold">
					{event.tasks[0].name}
				</div>
			{:else if event.tasks?.length > 1}
				<!-- Cas multiples tâches, afficher celles de l'utilisateur -->
				{#each event.tasks as task}
					{#if isUserSubscribedToTask(task.name)}
						<div class="badge badge-accent badge-soft font-semibold">
							{task.name}
						</div>
					{/if}
				{/each}
			{/if}
		</div>
	</div>

	<div class="border-t flex justify-end gap-x-2 px-3 py-1.5">
		{#if event.tasks?.length === 1}
			<button 
				onclick={() => unsubscribeFromEvent(event.tasks[0].name)}
				class="btn btn-compact btn-ghost"
			>
				Se désinscrire
			</button>
		{/if}
		<button
			onclick={() => {
				eventState.is = event;
				modalState.event = true;
			}}
			class="btn btn-compact btn-soft"
		>
			<PencilLine class="h-4 w-4 mr-1" />
			Détails
		</button>
	</div>
</div>