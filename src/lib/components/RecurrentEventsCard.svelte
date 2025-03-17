<script lang="ts">
	import { eventState, modalState } from '$lib/shared/states.svelte';
	import type { EventType } from '$lib/types/event';
	import { handleTaskSubscription, lisibleDate } from '$lib/utils';
	import { tooltip } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
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
	class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800"
>
	<div class="space-y-4 p-4">
		<!-- En-tête -->
		<div class="border-b pb-2">
			<h2 class=" text-xl font-bold text-gray-800 dark:text-gray-100">
				{master.event_title}
			</h2>
			<div class="text-fluid-sm mt-1 text-gray-600 dark:text-gray-400">
				{formatRecurrence(master.recurrence)}
				<span class="text-fluid-sm block text-gray-500">
					Programmés jusqu'au {lisibleDate(new Date(master.recurrence.lastDate))}
				</span>
			</div>
		</div>

		<!-- Prochaines occurrences -->
		<div>
			<h3 class="mb-2 font-medium text-gray-700 dark:text-gray-300">
				Prochaines dates ({occurrences.length || 0})
			</h3>
			{#each (occurrences || []).slice(0, 5) as occurrence}
				{@const isUserSubscribedToTask = (task: string) => {
					return occurrence.organizers.some(
						(org) => org.id === currentUser.id && org.tasks.includes(task)
					);
				}}
				<div
					class="hover:bg-accent flex flex-col border-b border-gray-300 p-2 dark:border-gray-700"
				>
					<div class="flex items-baseline justify-between">
						<span class="text-gray-600 dark:text-gray-400">
							{lisibleDate(new Date(occurrence.date_event))}
						</span>
						<div class="flex items-center gap-4">
							{#if !occurrence.isConfirmed}
								<div use:tooltip={{ content: "Confirmer que l'évenément à lieu" }}>
									<Button
										variant="outline"
										size="badge"
										onclick={() => onConfirm(occurrence.id)}
										class={occurrence.organizers.length > 0
											? 'border border-green-200 text-green-600 hover:bg-green-200 hover:text-green-900 dark:border-green-600 dark:bg-green-600 dark:text-green-400 dark:hover:bg-green-600 dark:hover:text-white'
											: 'border border-gray-200 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white'}
									>
										+ Confirmez
									</Button>
								</div>
							{:else if occurrence.isConfirmed && !occurrence.canceled}
								<span class="text-fluid-sm text-nowrap text-green-600">✓ Confirmé</span>
							{:else}
								<span class="text-fluid-sm text-nowrap text-red-600">✗ Annulé</span>
							{/if}
							<div use:tooltip={{ content: 'modifier cette occurrence' }} class="">
								<Button
									variant="outline"
									size="icon_md"
									onclick={() => {
										eventState.is = occurrence;
										modalState.event = true;
									}}
								>
									<PencilLine class="w-full text-gray-700" />
								</Button>
							</div>
						</div>
					</div>
					<div class="flex flex-wrap items-center">
						{#each occurrence.organizers as organizer}
							<div
								class="text-fluid-sm rounded-full bg-gray-100 px-3 py-1 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
							>
								{organizer.username}
							</div>
						{/each}

						<button
							onclick={() => subscribeUserToOccurence(occurrence)}
							class="text-fluid-sm ms-2 px-2 py-1 text-blue-600 hover:underline"
							>{isUserSubscribedToTask(occurrence.tasks[0])
								? 'Se désinscrire'
								: "S'inscrire"}</button
						>
					</div>
				</div>
			{:else}
				<div class="text-fluid-sm text-gray-500">Aucune date programmée</div>
			{/each}
		</div>

		<!-- Équipe récurrente -->
		<div class="border-t border-gray-100 pt-4 dark:border-gray-700">
			<div class="mb-2 flex items-center justify-between">
				<h3 class="text-fluid-sm font-medium text-gray-700 dark:text-gray-300">
					Équipe organisatrice
				</h3>
				<button
					onclick={() => {
						if (isOrganizersModal) {
							isOrganizersModal.event = master;
							isOrganizersModal.open = true;
						}
					}}
					class="text-fluid-sm text-blue-600 hover:underline dark:text-blue-400"
				>
					+ Gérer
				</button>
			</div>

			{#if master.recurrenceTeam?.length}
				<div class="flex flex-wrap gap-2">
					{#each master.recurrenceTeam as member}
						{#if member && typeof member === 'object' && 'username' in member}
							<div
								class="text-fluid-sm rounded-full bg-gray-100 px-3 py-1 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
							>
								{member.username}
							</div>
						{/if}
					{/each}
				</div>
			{:else}
				<div class="text-fluid-sm text-red-500 dark:text-red-400">Aucun organisateur assigné</div>
			{/if}
		</div>
	</div>
	<div
		id="footer-card"
		class="flex flex-wrap justify-end gap-x-4 border-t border-gray-200 bg-gray-100 px-2 py-1 text-right dark:border-gray-700"
	>
		<Button
			onclick={() => {
				if (modalState.event) {
					eventState.is = master;
					modalState.event = true;
				}
			}}
			class=""
			variant="slate"
			size="xs"
		>
			Modifier toutes les occurences
		</Button>
	</div>
</div>
