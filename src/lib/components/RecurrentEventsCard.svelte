<script lang="ts">
	import { eventState, modalState } from '$lib/shared/states.svelte';
	import type { EventType } from '$lib/types/event';
	import { handleTaskSubscription, lisibleDate } from '$lib/utils';
	import { tooltip } from '$lib/utils';
	import type { UserType } from '$lib/types/types';

	import { getContext } from 'svelte';

	import { Pen, PencilLine, SquarePen } from 'lucide-svelte';

	import Modal from './Modal.svelte';

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

	let currentUser: UserType = getContext('currentUser');

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

	const subscribeUserToOccurence = (occurrence) => {
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
						onConfirm: options.onConfirm
					}
				};
			}
		});
	};
</script>

<div
	class="overflow-hidden rounded-lg border bg-base-100 shadow-md"
>
	<div class="space-y-4 p-4">
		<!-- En-tête -->
		<div class="border-b pb-2">
			<h2 class=" text-fluid-xl font-bold ">
				{master.event_title}
			</h2>
			<div class="text-fluid-sm mt-1  ">
				{formatRecurrence(master.recurrence)}
				<span class="text-fluid-sm block ">
					Programmés jusqu'au {lisibleDate(new Date(master.recurrence.lastDate))}
				</span>
			</div>
		</div>

		<!-- Prochaines occurrences -->
		<div>
			<h3 class="mb-2 font-medium  ">
				Prochaines dates ({occurrences.length || 0})
			</h3>
			{#each (occurrences || []).slice(0, 5) as occurrence}
				{@const isUserSubscribedToTask = (task: string) => {
					return occurrence.organizers.some(
						(org) => org.id === currentUser.id && org.tasks.includes(task)
					);
				}}
				<div
					class="flex flex-col border-b p-2 "
				>
					<div class="flex items-baseline justify-between">
						<span class="font-medium">
							{lisibleDate(new Date(occurrence.date_event))}
						</span>
						<div class="flex items-center gap-4">
							{#if !occurrence.isConfirmed}
								<div use:tooltip={{ content: "Confirmer que l'évenément à lieu" }}>
									<button
										onclick={() => onConfirm(occurrence.id)}
										class="  btn btn-compact {occurrence.organizers.length > 0 
											? 'btn-success btn-outline' 
											: 'btn-ghost'}"
									>
										+ Confirmez
									</button>
								</div>
							{:else if occurrence.isConfirmed && !occurrence.canceled}
								<span class="text-fluid-sm text-nowrap text-green-600">✓ Confirmé</span>
							{:else}
								<span class="text-fluid-sm text-nowrap text-red-600">✗ Annulé</span>
							{/if}
							<div use:tooltip={{ content: 'modifier cette occurrence' }} class="">
								<button
									onclick={() => {
										eventState.is = occurrence;
										modalState.event = true;
									}}
									class="btn btn-soft btn-square btn-sm"
								>
									<PencilLine class="h-4 w-4" />
								</button>
							</div>
						</div>
					</div>
					<div class="flex flex-wrap items-center gap-x-2">
						{#each occurrence.organizers as organizer}
							<div
								class="font-semibold badge badge-accent badge-soft "
							>
								{organizer.username}
							</div>
						{/each}

						<button
							onclick={() => subscribeUserToOccurence(occurrence)}
							class="btn btn-link "
						>
							{isUserSubscribedToTask(occurrence.tasks[0])
								? 'Se désinscrire'
								: "S'inscrire"}
						</button>
					</div>
				</div>
			{:else}
				<div class="text-fluid-sm ">Aucune date programmée</div>
			{/each}
		</div>

		<!-- Équipe récurrente -->
		<div class="border-t border-gray-100 pt-4 border-gray-700">
			<div class="mb-2 flex items-center justify-between">
				<h3 class="text-fluid-sm font-medium  ">
					Équipe organisatrice
				</h3>
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
					{#each master.recurrenceTeam as member}
						{#if member && typeof member === 'object' && 'username' in member}
							<div
								class="text-fluid-sm rounded-full bg-gray-100 px-3 py-1  bg-gray-700 "
							>
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
	<div
		id="footer-card"
		class="flex flex-wrap justify-end gap-x-4 border-t  px-2 py-1 text-right "
	>
		<button
			onclick={() => {
				if (modalState.event) {
					eventState.is = master;
					modalState.event = true;
				}
			}}
			class="btn btn-secondary btn-compact"
		>
			Modifier toutes les occurences
		</button>
	</div>
</div>
