<script lang="ts">
	import UnassignedTasks from "$lib/components/UnassignedTasks.svelte";
	import {
		createEventActionPlan,
		handleEventAction,
		requestTaskUpdate
	} from "$lib/shared/eventActionHandler.svelte";
	import { restoreCanceledEvent } from "$lib/services/eventActions";
	import { eventState, modalState } from "$lib/shared/states.svelte";
	import type { EventType, ValidMaster, ValidOccurrence } from "$lib/types/event.types";
	import type { UserType } from "$lib/types/types";
	import { lisibleDate } from "$lib/utils";

	import { userDb } from "$lib/shared/userDb.svelte";

	import { formatRecurrence, getRecurrenceLabel } from "$lib/utils/recurrence";
	import { CalendarArrowUp, CalendarCheck, Pencil, UserCheck, UserPlus } from "lucide-svelte";
	import OrgAndTasksCard from "./OrgAndTasksCard.svelte";

	let { master, occurrences = [] } = $props<{
		master: ValidMaster;
		occurrences: ValidOccurrence[];
	}>();

	let currentUser: UserType | null = $derived(userDb.current);

	// déterminer si l'utilisateur est inscrit à au moins une tâche
	const isUserSubscribed = (occurrence: ValidOccurrence): boolean => {
		if (!currentUser || !Array.isArray(occurrence.organizers)) return false;
		return occurrence.organizers.some((org) => org.id === currentUser?.id);
	};

	const handleSubscriptionClick = (occurrence: ValidOccurrence) => {
		if (!currentUser) return;
		requestTaskUpdate({
			event: occurrence as unknown as EventType,
			user: currentUser
		});
	};

	const handleConfirmClick = async (occurrence: ValidOccurrence) => {
		if (!currentUser) return;
		const plan = await createEventActionPlan(occurrence, {
			context: "external_action",
			wantsToConfirmEvent: true,
			checkConflicts: true,
			currentUser,
			notify: true
		});
		await handleEventAction(plan);
	};

	const getSubscriptionButtonText = (occurrence: ValidOccurrence): string => {
		if (!Array.isArray(occurrence.tasks)) return "Erreur Tâches"; // Cas d'erreur

		const subscribed = isUserSubscribed(occurrence);

		if (occurrence.tasks.length <= 1) {
			return subscribed ? "Se désinscrire" : "S'inscrire";
		} else {
			return subscribed ? "Gérer mes tâches" : "S'inscrire";
		}
	};

	function restoreEvent(eventData: EventType) {
		restoreCanceledEvent(eventData);
	}
</script>

<div class="bg-base-200 @container flex h-full flex-col overflow-hidden rounded-lg shadow-lg">
	<div class="space-y-4 p-2 md:p-4">
		<!-- En-tête -->
		<div class=" pb-2">
			<h2 class=" text-fluid-xl font-bold">
				{master.event_title}
			</h2>
			<div
				class="bg-primary/10 flex flex-wrap justify-between gap-4 rounded-lg px-2 py-1.5 @sm:px-4 @sm:py-2"
			>
				<div class="text-fluid-base">
					{formatRecurrence(master.recurrence)}
					<span>• {getRecurrenceLabel(master.recurrence)}</span>
					<span>
						• Programmés jusqu'au {lisibleDate(new Date(master.recurrence.lastDate))}
					</span>
				</div>
				<div class="flex flex-wrap space-y-2 gap-x-8">
					<div class="flex flex-wrap items-baseline gap-2">
						<span class="text-fluid-sm text-base-content/60 font-medium">Tâches:</span>
						{#each master.tasks as task (master.id + task.name)}<span
								class="badge badge-primary badge-sm badge-outline">{task.name}</span
							>{/each}
					</div>
					{#if master.recurrence.recurrenceTeam?.length}
						<div class="flex flex-wrap items-baseline gap-2">
							<span class="text-fluid-sm text-base-content/60 font-medium">Equipe:</span>

							{#each master.recurrence.recurrenceTeam as member (member.id)}
								{#if member && typeof member === "object" && "username" in member}
									<div class=" badge badge-sm badge-accent badge-outline">
										{member.username}
									</div>
								{/if}
							{/each}
						</div>
					{:else}
						<div class="text-fluid-sm text-error">Aucun organisateur assigné</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Prochaines occurrences -->
		<div>
			<div class="text-fluid-lg mb-4 font-semibold">
				Prochaines dates (5/{occurrences.length || 0})
			</div>
			<div class="grid grid-cols-1 space-y-4">
				{#each (occurrences || []).slice(0, 5) as occurrence (occurrence.id)}
					<div
						class="bg-base-100 flex flex-col rounded-lg px-4 py-2 shadow-sm {occurrence.isConfirmed &&
						!occurrence.canceled
							? ' border-l-success/30 border-l-3'
							: occurrence.canceled
								? 'border-l-error/30 bg-neutral/2 border-l-3 '
								: !occurrence.isConfirmed
									? 'border-l-warning/50 border-l-3'
									: ''}"
					>
						<div class="mb-4 flex flex-wrap items-start justify-between gap-2">
							<div class="grid-cols grid">
								<span class="text-fluid-lg font-medium">
									{lisibleDate(new Date(occurrence.date_event))}
								</span>
								<span class="text-fluid-base">{occurrence.time_start} - {occurrence.time_end}</span>
							</div>
							<div class="flex flex-wrap items-center gap-4">
								{#if occurrence.canceled}
									<span class="text-fluid-sm text-error text-nowrap">✗ Annulé</span>
								{:else if occurrence.isConfirmed}
									<span class="text-fluid-sm text-success text-nowrap">✓ Confirmé</span>
								{:else}
									<button
										onclick={() => handleConfirmClick(occurrence)}
										class="btn btn-compact @max-md:btn-square"
										title="Confirmer que l'événement a lieu"
									>
										<CalendarCheck />
										<span class="@max-md:hidden">Confirmer</span>
									</button>
								{/if}
								{#if !occurrence.canceled}
									<button
										onclick={() => {
											eventState.is = occurrence;
											modalState.event = true;
										}}
										class="btn btn-square btn-sm"
										title="modifier cette occurrence"
									>
										<Pencil />
									</button>
								{/if}
							</div>
						</div>
						<!-- Affichage des organisateurs -->
						{#if !occurrence.canceled}
							{#if Array.isArray(occurrence.organizers) && occurrence.organizers.length > 0}
								<OrgAndTasksCard organizers={occurrence.organizers} tasks={occurrence.tasks} />
							{:else}
								<div
									class="text-fluid-sm {occurrence.isConfirmed
										? 'text-error'
										: 'text-base-content/60'}"
								>
									Aucun·e organisateur·ice inscrit·e
								</div>
							{/if}
						{/if}

						<div class="mt-4 flex flex-wrap items-center justify-between gap-4">
							<!-- Bouton d'inscription/gestion -->
							{#if !occurrence.canceled}
								<div>
									{#if Array.isArray(occurrence.tasks) && occurrence.tasks.length > 1}
										<UnassignedTasks event={occurrence} class="" />
									{/if}
								</div>
								<button
									onclick={() => handleSubscriptionClick(occurrence)}
									class=" btn btn-primary btn-compact btn-outline ms-auto"
									disabled={occurrence.canceled}
								>
									{#if isUserSubscribed(occurrence)}
										<UserCheck />
									{:else}
										<UserPlus />
									{/if}
									<span> {getSubscriptionButtonText(occurrence)}</span>
								</button>
							{:else}
								<button
									onclick={() => {
										restoreEvent(occurrence);
									}}
									class="btn btn-compact btn-outline ms-auto"
									title="Rétablir occurrence"
								>
									<CalendarArrowUp /><span> Rétablir</span>
								</button>
							{/if}
						</div>
					</div>
				{:else}
					<div class="text-fluid-sm">Aucune date programmée</div>
				{/each}
			</div>
		</div>
	</div>
	<div id="footer-card" class="bg-base-200 mt-auto flex flex-wrap justify-end gap-x-4 px-2 py-1">
		<button
			onclick={() => {
				eventState.is = master;
				modalState.event = true;
			}}
			class="btn"
		>
			<Pencil class="mr-2" />
			Modifier toutes les occurences
		</button>
	</div>
</div>
