<script lang="ts">
	import { eventState, modalState } from "$lib/shared/states.svelte";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import type { EventType, OrganizerType } from "$lib/schemas/event.schema";
	import type { UserType } from "$lib/types/types";
	import { lisibleDate } from "$lib/utils";
	import { userDb } from "$lib/shared/userDb.svelte";

	import { CalendarCheck, Pencil, PencilLine, UserCheck, UserPlus } from "lucide-svelte";

	type RecurrenceType = "WEEKLY" | "BIWEEKLY" | "MONTHLY_BY_DATE" | "MONTHLY_BY_DAY";

	interface ValidMaster extends EventType {
		id: string;
		recurrence: NonNullable<EventType["recurrence"]>;
	}

	interface ValidOccurrence extends EventType {
		id: string;
		date_event: string;
		masterRecurrentId: string;
	}

	let {
		master,
		occurrences = [],
		onConfirm
	} = $props<{
		master: ValidMaster;
		occurrences: ValidOccurrence[];
		onConfirm: (id: string) => Promise<void>;
	}>();

	let currentUser: UserType | null = $derived(userDb.current);

	const formatRecurrence = (recurrence: NonNullable<EventType["recurrence"]>): string => {
		const recurrenceTypes: Record<RecurrenceType, string> = {
			WEEKLY: "Hebdomadaire",
			BIWEEKLY: "Bi-hebdomadaire",
			MONTHLY_BY_DATE: "Mensuel (date fixe)",
			MONTHLY_BY_DAY: "Mensuel (jour spécifique)"
		};

		return (
			recurrenceTypes[recurrence.recurrenceType as RecurrenceType] || recurrence.recurrenceType
		);
	};

	// déterminer si l'utilisateur est inscrit à au moins une tâche
	const isUserSubscribed = (occurrence: ValidOccurrence): boolean => {
		if (!currentUser || !Array.isArray(occurrence.organizers)) return false;
		return occurrence.organizers.some((org) => org.id === currentUser?.id);
	};

	const handleSubscriptionClick = (occurrence: ValidOccurrence) => {
		if (!currentUser) return;
		eventsStore.requestTaskUpdate({ event: occurrence, user: currentUser });
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
</script>

<div class="bg-base-100 border-base-300 @container overflow-hidden rounded-lg border shadow-md">
	<div class="space-y-4 p-2 md:p-4">
		<!-- En-tête -->
		<div class=" pb-2">
			<h2 class=" text-fluid-xl font-bold">
				{master.event_title}
			</h2>
			<div class="bg-base-200 flex flex-wrap justify-between gap-4 rounded-lg p-1 @sm:p-2">
				<div class="text-fluid-base mt-1">
					{formatRecurrence(master.recurrence)}
					<span>
						• Programmés jusqu'au {lisibleDate(new Date(master.recurrence.lastDate))}
					</span>
				</div>
				<div class="space-y-2">
					<div class="flex flex-wrap gap-2">
						<span class="text-fluid-base">Tâches:</span>
						{#each master.tasks as task (master.id + task.name)}<span
								class="badge badge-primary badge-soft">{task.name}</span
							>{/each}
					</div>
					{#if master.recurrence.recurrenceTeam?.length}
						<div class="flex flex-wrap gap-2">
							<span class="text-fluid-base">Equipe:</span>

							{#each master.recurrence.recurrenceTeam as member (member.id)}
								{#if member && typeof member === "object" && "username" in member}
									<div class=" badge badge-accent badge-soft">
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
			<div class="grid grid-cols-1">
				{#each (occurrences || []).slice(0, 5) as occurrence (occurrence.id)}
					<div
						class="flex flex-col px-4 py-2 {occurrence.isConfirmed && !occurrence.canceled
							? ' border-l-success/30 border-l-3'
							: occurrence.canceled
								? 'border-l-error/30 border-l-3'
								: !occurrence.isConfirmed
									? 'border-l-warning/50 border-l-3'
									: ''}"
					>
						<div class="mb-4 flex flex-wrap items-start justify-between gap-y-2">
							<span class="text-fluid-lg font-medium">
								{lisibleDate(new Date(occurrence.date_event))}
							</span>
							<div class="flex flex-wrap items-center gap-4">
								{#if occurrence.canceled}
									<span class="text-fluid-sm text-error text-nowrap">✗ Annulé</span>
								{:else if occurrence.isConfirmed}
									<span class="text-fluid-sm text-success text-nowrap">✓ Confirmé</span>
								{:else}
									<!-- Bouton d'inscription/gestion -->
									<button
										onclick={() => handleSubscriptionClick(occurrence)}
										class=" btn btn-primary btn-compact btn-soft"
										disabled={occurrence.canceled}
									>
										{#if isUserSubscribed(occurrence)}
											<UserCheck />
										{:else}
											<UserPlus />
										{/if}
										<span> {getSubscriptionButtonText(occurrence)}</span>
									</button>
									<button
										onclick={() => onConfirm(occurrence.id)}
										class="btn btn-compact @max-md:btn-square"
										title="Confirmer que l'événement a lieu"
										disabled={!Array.isArray(occurrence.organizers) ||
											occurrence.organizers.length === 0}
									>
										<CalendarCheck />
										<span class="@max-md:hidden">Confirmer</span>
									</button>
								{/if}
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
							</div>
						</div>
						<!-- Affichage des organisateurs -->
						{#if Array.isArray(occurrence.organizers) && occurrence.organizers.length > 0}
							<div class="flex flex-wrap items-center gap-x-4 gap-y-2 @max-md:my-2">
								{#each occurrence.organizers as organizer (organizer.id)}
									<div
										class=" bg-accent/5 flex rounded-md px-2 py-1"
										title={organizer.tasks?.join(", ") || "aucune taches spécifiées"}
									>
										<span class="text-accent text-fluid-sm font-semibold">{organizer.username}</span
										>
										{#if occurrence.tasks?.length > 1}
											<div class="ms-2 flex flex-wrap gap-2">
												{#each organizer.tasks as task (organizer.id + task)}
													<span class="badge badge-accent badge-sm badge-outline font-medium"
														>{task}</span
													>
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						{#if Array.isArray(occurrence.tasks) && occurrence.tasks.length > 1}
							{@const assignedTasks =
								occurrence.organizers?.flatMap((org) => org.tasks || []) || []}
							{@const unassignedTasks = occurrence.tasks.filter(
								(task) => !assignedTasks.includes(task.name)
							)}
							{#if unassignedTasks.length > 0}
								<div class=" mt-4 flex flex-wrap gap-1 sm:ms-auto">
									<span class="text-fluid-sm text-base-content/60">Tâches non attribuées:</span>
									{#each unassignedTasks as task, i (i)}
										<span title={task.description} class="badge badge-soft badge-sm me-1 mb-1"
											>{task.name}</span
										>
									{/each}
								</div>
							{/if}
						{/if}
					</div>
					<div class="divider my-2"></div>
				{:else}
					<div class="text-fluid-sm">Aucune date programmée</div>
				{/each}
			</div>
		</div>
	</div>
	<div id="footer-card" class="bg-base-200 flex flex-wrap justify-end gap-x-4 px-2 py-1 text-right">
		<button
			onclick={() => {
				eventState.is = master;
				modalState.event = true;
			}}
			class="btn"
		>
			<PencilLine class="mr-2" />
			Modifier toutes les occurences
		</button>
	</div>
</div>
