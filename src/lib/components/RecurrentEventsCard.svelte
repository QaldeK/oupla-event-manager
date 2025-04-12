<script lang="ts">
	import { eventState, modalState } from '$lib/shared/states.svelte';
	import type { EventType } from '$lib/types/event';
	import type { UserType } from '$lib/types/types';
	import { handleTaskSubscription, lisibleDate, tooltip } from '$lib/utils';
	import { userDb } from '$lib/shared/userDb.svelte';

	import { CalendarCheck, PencilLine } from 'lucide-svelte';

	type RecurrenceType = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY_BY_DATE' | 'MONTHLY_BY_DAY';

	interface ValidMaster extends EventType {
		id: string;
		recurrence: NonNullable<EventType['recurrence']>;
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

	const formatRecurrence = (recurrence: NonNullable<EventType['recurrence']>): string => {
		const recurrenceTypes: Record<RecurrenceType, string> = {
			WEEKLY: 'Hebdomadaire',
			BIWEEKLY: 'Bi-hebdomadaire',
			MONTHLY_BY_DATE: 'Mensuel (date fixe)',
			MONTHLY_BY_DAY: 'Mensuel (jour spécifique)'
		};

		return (
			recurrenceTypes[recurrence.recurrenceType as RecurrenceType] || recurrence.recurrenceType
		);
	};

	const subscribeUserToOccurence = (occurrence: ValidOccurrence) => {
		if (!currentUser) return;
		handleTaskSubscription({
			task: master.tasks[0],
			currentUser,
			event: occurrence,
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

<div class="bg-base-100 border-base-300 overflow-hidden rounded-lg border shadow-md">
	<div class="space-y-4 p-2 md:p-4">
		<!-- En-tête -->
		<div class="border-b pb-2">
			<h2 class=" text-fluid-xl font-bold">
				{master.event_title}
			</h2>
			<div class="text-fluid-sm mt-1">
				{formatRecurrence(master.recurrence)}
				<span class="text-fluid-sm block">
					Programmés jusqu'au {lisibleDate(new Date(master.recurrence.lastDate))}
				</span>
			</div>
		</div>

		<!-- Prochaines occurrences -->
		<div>
			<div class="text-fluid-lg mb-2 font-semibold">
				Prochaines dates (5/{occurrences.length || 0})
			</div>
			<div class="grid grid-cols-1 divide-y">
				{#each (occurrences || []).slice(0, 5) as occurrence (occurrence.id)}
					{@const isUserSubscribedToTask = (task: string) => {
						return occurrence.organizers.some((org) => org.id === currentUser?.id);
					}}
					<div
						class="flex flex-col px-1 py-2 md:px-2 {occurrence.isConfirmed
							? ' border-l-success/30  border-l-3'
							: ''}"
					>
						<div class="flex flex-wrap items-baseline justify-between gap-y-2">
							<span class="font-medium">
								{lisibleDate(new Date(occurrence.date_event))}
							</span>
							<div class="flex items-center gap-4">
								{#if !occurrence.isConfirmed}
									<div use:tooltip={{ content: "Confirmer que l'évenément à lieu" }}>
										<button
											onclick={() => onConfirm(occurrence.id)}
											class="  btn btn-square btn-sm {occurrence.organizers.length > 0
												? 'btn-success btn-soft'
												: 'btn-ghost'}"
										>
											<CalendarCheck />
										</button>
									</div>
								{:else if occurrence.isConfirmed && !occurrence.canceled}
									<span class="text-fluid-xs text-nowrap text-green-600">✓ Confirmé</span>
								{:else}
									<span class="text-fluid-xs text-nowrap text-red-600">✗ Annulé</span>
								{/if}
								<div use:tooltip={{ content: 'modifier cette occurrence' }} class="">
									<button
										onclick={() => {
											eventState.is = occurrence;
											modalState.event = true;
										}}
										class="btn btn-square btn-soft btn-sm"
									>
										<PencilLine />
									</button>
								</div>
							</div>
						</div>
						<div class="flex flex-wrap items-center gap-4">
							{#if occurrence.organizers.length > 0}
								<div class="flex flex-wrap gap-2">
									{#each occurrence.organizers as organizer (organizer.id)}
										<div class="badge badge-accent badge-soft font-semibold">
											{organizer.username}
										</div>
									{/each}
								</div>
							{/if}

							<button
								onclick={() => subscribeUserToOccurence(occurrence)}
								class=" btn btn-accent btn-sm btn-compact btn-soft"
							>
								{isUserSubscribedToTask(occurrence.tasks[0]) ? 'Se désinscrire' : "S'inscrire"}
							</button>
						</div>
					</div>
				{:else}
					<div class="text-fluid-sm">Aucune date programmée</div>
				{/each}
			</div>
		</div>

		<!-- Équipe récurrente -->
		<div class="bg-base-300 border-t pt-4">
			<div class="mb-2 flex items-center justify-between">
				<h3 class="text-fluid-sm font-medium">Équipe organisatrice</h3>
				<button
					onclick={() => {
						if (isOrganizersModal) {
							isOrganizersModal.event = master;
							isOrganizersModal.open = true;
						}
					}}
					class="btn btn-soft btn-compact"
				>
					+ Gérer
				</button>
			</div>

			{#if master.recurrenceTeam?.length}
				<div class="flex flex-wrap gap-2">
					{#each master.recurrenceTeam as member (member.id)}
						{#if member && typeof member === 'object' && 'username' in member}
							<div class="text-fluid-sm bg-base-300 rounded-full px-3 py-1">
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
				if (modalState.event) {
					eventState.is = master;
					modalState.event = true;
				}
			}}
			class="btn"
		>
			<PencilLine class="mr-2" />
			Modifier toutes les occurences
		</button>
	</div>
</div>
