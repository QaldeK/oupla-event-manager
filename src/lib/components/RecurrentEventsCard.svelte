<script lang="ts">
	import { eventState, modalState } from "$lib/shared/states.svelte";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import type { EventType, OrganizerType } from "$lib/schemas/event.schema";
	import type { UserType } from "$lib/types/types";
	import { lisibleDate, tooltip } from "$lib/utils";
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
		eventsStore.manageTaskSubscription(occurrence, currentUser);
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

<div class="bg-base-100 border-base-300 overflow-hidden rounded-lg border shadow-md">
	<div class="space-y-4 p-2 md:p-4">
		<!-- En-tête -->
		<div class="border-b pb-2">
			<h2 class=" text-fluid-xl font-bold">
				{master.event_title}
			</h2>
			<div class="flex flex-wrap justify-between gap-4">
				<div class="text-fluid-base mt-1">
					{formatRecurrence(master.recurrence)}
					<span class="text-fluid-base block">
						Programmés jusqu'au {lisibleDate(new Date(master.recurrence.lastDate))}
					</span>
				</div>
				<div>
					<span class="text-fluid-base">Tâches:</span>
					{#each master.tasks as task (master.id + task.name)}<span
							class="badge badge-accent badge-soft">{task.name}</span
						>{/each}
				</div>
			</div>
		</div>

		<!-- Prochaines occurrences -->
		<div>
			<div class="text-fluid-lg mb-2 font-semibold">
				Prochaines dates (5/{occurrences.length || 0})
			</div>
			<div class="grid grid-cols-1 divide-y">
				{#each (occurrences || []).slice(0, 5) as occurrence (occurrence.id)}
					<div
						class="flex flex-col px-1 py-2 md:px-2 {occurrence.isConfirmed && !occurrence.canceled
							? ' border-l-success/30 border-l-3'
							: occurrence.canceled
								? 'border-l-error/30 border-l-3'
								: ''}"
					>
						<div class="flex flex-wrap items-center justify-between gap-y-2">
							<span class="font-medium">
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
										class=" btn btn-primary btn-sm btn-soft"
										disabled={occurrence.canceled}
									>
										{#if isUserSubscribed(occurrence)}
											<UserCheck class="mr-1 h-4 w-4" />
										{:else}
											<UserPlus class="mr-1 h-4 w-4" />
										{/if}
										<span class="not-sm:hidden"> {getSubscriptionButtonText(occurrence)}</span>
									</button>
									<button
										onclick={() => onConfirm(occurrence.id)}
										class="btn btn-sm"
										title="Confirmer que l'événement a lieu"
										disabled={!Array.isArray(occurrence.organizers) ||
											occurrence.organizers.length === 0}
									>
										<CalendarCheck />
										<span class="not-sm:hidden">Confirmer</span>
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
							<div class="flex flex-wrap items-center gap-4">
								{#each occurrence.organizers as organizer (organizer.id)}
									<div
										class="badge badge-accent badge-soft font-semibold"
										title={organizer.tasks?.join(", ") || "aucune taches spécifiées"}
									>
										{organizer.username}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<div class="text-fluid-sm">Aucune date programmée</div>
				{/each}
			</div>
		</div>

		<!-- Équipe récurrente -->
		<div class="bg-base-200 rounded-xl border-t p-4">
			<div class="mb-2 flex items-baseline justify-between">
				<h3 class="text-fluid-sm font-medium">Équipe organisatrice</h3>
				<button
					onclick={() => {
						isOrganizersModal.event = master;
						isOrganizersModal.open = true;
					}}
					class="btn btn-soft btn-compact"
				>
					+ Gérer
				</button>
			</div>

			{#if master.recurrence.recurrenceTeam?.length}
				<div class="flex flex-wrap gap-2">
					{#each master.recurrence.recurrenceTeam as member (member.id)}
						{#if member && typeof member === "object" && "username" in member}
							<div class=" badge">
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
	<div id="footer-card" class="flex flex-wrap justify-end gap-x-4 border-t px-2 py-1 text-right">
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
