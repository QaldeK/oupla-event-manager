<script lang="ts">
	import { eventState, modalState } from "$lib/shared/states.svelte";
	import type { EventType } from "$lib/schemas/event.schema";
	import { lisibleDate, lisibleTime } from "$lib/utils";
	import UnassignedTasks from "$lib/components/UnassignedTasks.svelte";
	import { userDb } from "$lib/shared/userDb.svelte";
	import { Pencil, UserMinus } from "lucide-svelte";
	import type { UserType } from "$lib/types/types";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";

	let { event } = $props<{
		event: EventType;
	}>();

	let currentUser: UserType | null = userDb.current;

	const isCurrentUserSubscribed = $derived(() => {
		return event.organizers?.some((org) => org.id === currentUser?.id);
	});

	const eventStatus = $derived.by(() => {
		if (event.isConfirmed && !event.cancelled) {
			return { label: "confirmé", labelColor: "text-success", bg: "bg-success/20" };
		} else if (event.cancelled) {
			return { label: "annulé", labelColor: "text-error", bg: "bg-error/20" };
		} else if (!event.isConfirmed) {
			return {
				label: "en attente de confirmation",
				labelColor: "text-warning",
				bg: "bg-warning/20"
			};
		}
		// 👉 Retourne un objet par défaut si aucune condition n'est remplie
		return { label: "", labelColor: "", bg: "" };
	});

	const manageTasks = () => {
		if (!currentUser) return;
		eventsStore.requestTaskUpdate({ event: event, user: currentUser });
	};

	// 👉 Helper pour lister les tâches de l'utilisateur actuel
	const currentUserTasks = $derived(
		event.organizers?.find((org) => org.id === currentUser?.id)?.tasks ?? []
	);
</script>

<div class="@container flex flex-col rounded-lg border bg-white shadow-md">
	<!-- En-tête -->
	<div class="items-top flex gap-4 @max-md:flex-col @md:justify-between">
		<div
			class="text-fluid-base @max-md:flex @max-md:flex-wrap @max-md:gap-x-4 @max-md:px-4 @max-md:py-1 @max-md:align-middle @md:order-2 @md:text-right {eventStatus.bg} @max-md:rounded-t-lg @md:self-start @md:rounded-tr-lg @md:rounded-bl-lg @md:py-2 @md:pr-4 @md:pl-8"
		>
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
			<div class="text-fluid-xs font-medium italic {eventStatus.labelColor}">
				{eventStatus.label}
			</div>
		</div>
		<div class="grid px-4 pb-2 @md:my-4">
			<div class="text-fluid-lg font-bold">{event.event_title}</div>
			<div class="text-fluid-base mt-1 mb-2">
				{#each event.categories as category, index (category)}
					<span class="font-medium uppercase">
						{category}{index < event.categories.length - 1 ? ", " : ""}
					</span>
				{/each}
			</div>
		</div>
	</div>

	<div class="flex flex-1 flex-col gap-2 p-4">
		<!-- Organisateurs et tâches -->
		<div class="my-2 flex flex-wrap items-center gap-2">
			{#if currentUserTasks.length > 0}
				<div class="text-fluid-sm">Vos taches:</div>
				{#each currentUserTasks as taskName (taskName)}
					<div class="badge badge-primary badge-soft font-semibold">
						{taskName}
					</div>
				{/each}
			{:else if isCurrentUserSubscribed()}
				<div class="badge badge-warning badge-soft font-semibold">Aucune tâche assignée</div>
			{/if}
		</div>
		<div>
			{#if event.organizers.length > 1}
				<span>Avec:</span>
				{#each event.organizers as organizer (organizer.id)}
					<div
						class="badge badge-soft badge-accent me-2 font-semibold {organizer.username ===
							currentUser?.username && 'hidden'}"
					>
						{organizer.username}
					</div>
				{/each}
			{:else}
				<span class="text-fluid-sm text-base-content/60"
					>Il n'y a pas d'autre organisateur·ice pour le moment</span
				>
			{/if}
			{#if Array.isArray(event.tasks) && event.tasks.length > 1}
				<UnassignedTasks {event} class="mt-2 ml-auto" />
			{/if}
		</div>
	</div>

	<div class="mt-auto flex justify-end gap-x-2 border-t px-3 py-1.5">
		{#if isCurrentUserSubscribed()}
			<button
				onclick={manageTasks}
				class="btn btn-outline btn-compact {event.tasks.length > 1 ? 'btn-accent' : 'btn-error'}"
			>
				<UserMinus class="mr-1 h-4 w-4" />
				{#if event.tasks.length > 1}
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
			class="btn btn-compact btn-square btn-soft"
		>
			<Pencil size={20} />
		</button>
	</div>
</div>
