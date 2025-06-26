<script lang="ts">
	import UnassignedTasks from "$lib/components/UnassignedTasks.svelte";
	import type { EventType } from "$lib/types/event.types";
	import { requestTaskUpdate } from "$lib/shared/eventActionHandler.svelte";
	import { eventState, modalState } from "$lib/shared/states.svelte";
	import { userDb } from "$lib/shared/userDb.svelte";
	import type { UserType } from "$lib/types/types";
	import { lisibleDateShort } from "$lib/utils";
	import { ListTodo, Pencil, UserMinus } from "lucide-svelte";
	import OrgAndTasksCard from "./OrgAndTasksCard.svelte";

	let { event } = $props<{
		event: EventType;
	}>();

	let currentUser: UserType | null = userDb.current;

	const isCurrentUserSubscribed = $derived(() => {
		return event.organizers?.some(
			(org: { id: string; username: string }) => org.id === currentUser?.id
		);
	});

	const eventStatus = $derived.by(() => {
		if (event.isConfirmed && !event.cancelled) {
			return { label: "confirmé", labelColor: "text-success", bg: "bg-success/10" };
		} else if (event.cancelled) {
			return { label: "annulé", labelColor: "text-error", bg: "bg-error/10" };
		} else if (!event.isConfirmed) {
			return {
				label: "en attente de confirmation",
				labelColor: "text-warning",
				bg: "bg-warning/10"
			};
		}
		// 👉 Retourne un objet par défaut si aucune condition n'est remplie
		return { label: "", labelColor: "", bg: "" };
	});

	const manageTasks = () => {
		if (!currentUser) return;
		requestTaskUpdate({ event: event, user: currentUser });
	};

	// 👉 Helper pour lister les tâches de l'utilisateur actuel
	const currentUserTasks = $derived(
		event.organizers?.find(
			(org: { id: string; username: string; tasks?: string[] }) => org.id === currentUser?.id
		)?.tasks ?? []
	);
</script>

<div class="@container flex flex-col rounded-lg border shadow-lg">
	<!-- En-tête -->
	<div
		id="header-user-event-card"
		class="items-top flex gap-2 @max-lg:flex-col @lg:justify-between"
	>
		<div
			class="text-fluid-base flex flex-wrap items-center @max-lg:justify-between @max-lg:gap-x-4 @max-lg:px-4 @max-lg:py-2 @max-lg:align-middle @lg:order-2 @lg:max-w-56 @lg:gap-x-3 @lg:gap-y-1 @lg:text-right {eventStatus.bg} @max-lg:rounded-t-lg @lg:me-3 @lg:mt-3 @lg:justify-end @lg:self-start @lg:rounded-lg @lg:py-2 @lg:pr-4"
		>
			<div class="font-semibold text-nowrap">{lisibleDateShort(new Date(event.date_event))}</div>
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
		<!-- <div class="flex flex-wrap items-center gap-2">
			<div class="text-base-content/60 me-2">Vos taches:</div>
			{#each currentUserTasks as taskName (taskName)}
				<div class="badge badge-primary badge-soft font-semibold">
					{taskName}
				</div>
			{/each}
		</div> -->
		<div>
			<OrgAndTasksCard organizers={event.organizers} tasks={event.tasks} />
			{#if event.organizers.length < 2}
				<span class="text-fluid-sm text-base-content/60 p-2"
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
				class="btn btn-compact btn-outline {event.tasks.length > 1 ? 'btn-primary' : 'btn-error'}"
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
