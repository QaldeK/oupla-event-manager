<script lang="ts">
	import UnassignedTasks from "$lib/components/UnassignedTasks.svelte";
	import type { EventType } from "$lib/schemas/event.schema";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import { eventState, modalState } from "$lib/shared/states.svelte";
	import { userDb } from "$lib/shared/userDb.svelte";
	import type { UserType } from "$lib/types/types";
	import { lisibleDate } from "$lib/utils";
	import { ListTodo, Pencil, UserMinus } from "lucide-svelte";

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

<div class="@container flex flex-col rounded-lg border shadow-lg">
	<!-- En-tête -->
	<div
		id="header-user-event-card"
		class="items-top flex gap-2 @max-md:flex-col @md:justify-between"
	>
		<div
			class="text-fluid-base @max-dm:px-2 flex flex-wrap items-center @max-md:justify-between @max-md:gap-x-4 @max-md:px-4 @max-md:py-2 @max-md:align-middle @md:order-2 @md:max-w-56 @md:gap-x-3 @md:gap-y-1 @md:text-right {eventStatus.bg} @max-md:rounded-t-lg @md:justify-end @md:self-start @md:rounded-tr-lg @md:rounded-bl-lg @md:py-2 @md:pr-4 @md:pl-8"
		>
			<div class="font-semibold text-nowrap">{lisibleDate(new Date(event.date_event))}</div>
			<div class="text-base-content text-fluid-sm font-medium text-nowrap">
				{event.time_start} - {event.time_end}
			</div>
			<div class="text-fluid-xs text-end font-medium text-nowrap italic {eventStatus.labelColor}">
				{eventStatus.label}
			</div>
		</div>
		<div class="grid px-4 @md:my-4">
			<div class="text-fluid-lg font-bold">{event.event_title}</div>
			<div class="text-fluid-sm mt-1 mb-2">
				{#each event.categories as category, index (category)}
					<span class="font-medium uppercase">
						{category}{index < event.categories.length - 1 ? ", " : ""}
					</span>
				{/each}
			</div>
		</div>
	</div>

	<div class="flex flex-1 flex-col gap-3 px-4 py-2">
		<!-- Organisateurs et tâches -->
		<div class="flex flex-wrap items-center gap-2">
			<div class="text-base-content/60 me-2">Vos taches:</div>
			{#each currentUserTasks as taskName (taskName)}
				<div class="badge badge-primary badge-soft font-semibold">
					{taskName}
				</div>
			{/each}
		</div>
		<div>
			{#if event.organizers.length > 1}
				<span class="text-base-content/60 me-2">Avec</span>
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
		</div>
		{#if Array.isArray(event.tasks) && event.tasks.length > 1}
			<!-- <div class="divider my-1"></div> -->
			<div class=""><UnassignedTasks {event} class="ml-auto" /></div>
		{/if}
	</div>

	<div class="bg-base-200 mt-2 flex justify-end gap-x-2 border-t px-3 py-1.5">
		{#if isCurrentUserSubscribed()}
			<button
				onclick={manageTasks}
				class="btn btn-compact btn-outline {event.tasks.length > 1 ? 'btn-accent' : 'btn-error'}"
			>
				{#if event.tasks.length > 1}
					<ListTodo size={18} />
					vos tâches
				{:else}
					<UserMinus size={18} />
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
