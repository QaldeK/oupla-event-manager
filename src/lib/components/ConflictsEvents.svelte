<script lang="ts">
	import type { EventsResponse, EventType, EventConflict } from '$lib/types/types';
	import { lisibleDate } from '$lib/utils';
	import { Pencil } from 'lucide-svelte';
	import Info from './Info.svelte';
	import { modalState, eventState, eventsStore } from '$lib/shared';

	// Propriétés optionnelles
	let { showEmptyMessage = 'false' } = $props();

	// État local
	let overlappingGroups = $state<Map<string, EventConflict[][]>>(new Map());
	let hasConflicts = $state<boolean>(false);

	$effect(() => {
		if (eventsStore.isInitialized) {
			overlappingGroups = eventsStore.getOverlappingEventGroups;
			hasConflicts = overlappingGroups.size > 0;
		}
	});

	function editEvent(id: string) {
		const event: EventType = eventsStore.getEventById(id);
		eventState.is = event;
		modalState.event = true;
	}

	// Fonction pour déterminer la couleur du badge en fonction du type de conflit
	function getBadgeVariant(
		conflictType: EventConflict['conflictType']
	): 'badge-warning' | 'badge-error' | 'badge-outline' {
		switch (conflictType) {
			case 'confirmed':
				return 'badge-error';
			case 'close-confirmed':
			case 'unconfirmed':
				return 'badge-warning';
			case 'sondage':
			case 'close-unconfirmed': // Conflit proche d'un non-confirmé -> Avertissement
				return 'badge-outline';

			default:
				return 'badge-warning'; // Par défaut, avertissement
		}
	}

	// Fonction pour obtenir le label lisible du type de conflit
	function getConflictLabel(conflictType: EventConflict['conflictType']): string {
		switch (conflictType) {
			case 'confirmed':
				return 'événement confirmé';
			case 'unconfirmed':
				return 'événement non confirmé';
			case 'sondage':
				return 'sondage';
			case 'close-confirmed':
				return 'confirmé (proche)'; // Label pour les conflits proches
			case 'close-unconfirmed':
				return 'non confirmé (proche)'; // Label pour les conflits proches
			default:
				// Au cas où un nouveau type apparaîtrait
				console.warn(`Type de conflit inconnu pour le label : ${conflictType}`);
				return conflictType;
		}
	}
</script>

{#if hasConflicts}
	<fieldset class="fieldset border-error mb-8 rounded-lg border px-4 py-8 shadow-md">
		<legend class="fieldset-legend text-fluid-lg px-2">Evénements en conflits</legend>
		<Info variant="warning">
			<span class="text-fluid-xs"
				>Plusieurs événements se déroulent ou sont prévue en même temps à la même date.</span
			>
		</Info>
		{#each [...overlappingGroups.entries()] as [date, conflictGroups], index (index)}
			<div class="mb-2">
				{#each conflictGroups as conflicts, index (index)}
					<div class="card">
						<div class="sm:p-2">
							<div class="ps-1 pb-1 text-lg font-semibold capitalize">{lisibleDate(date)}</div>
							<div class="space-y-2">
								{#each conflicts as conflict, index (index)}
									<div class="bg-muted/30 rounded-md border p-2">
										<div class="flex flex-wrap items-center justify-between gap-2">
											<div class="flex flex-wrap items-baseline gap-2 align-bottom">
												<span class="text-fluid-sm font-semibold">{conflict.event_title} • </span>
												<span class="text-fluid-sm font-medium whitespace-nowrap">
													{conflict.time_start} - {conflict.time_end} •
												</span>
												{#if conflict.rooms.length}
													<div class="flex flex-wrap gap-2">
														{#each conflict.rooms as room, index (index)}
															<span
																class="text-fluid-sm {conflicts.some(
																	(c) => c !== conflict && c.rooms.includes(room)
																)
																	? 'text-destructive'
																	: 'text-muted-foreground'}"
															>
																{room}
															</span>
														{/each}
													</div>
												{:else}
													none
												{/if}
											</div>

											<div class="flex items-center gap-2">
												<div class="badge {getBadgeVariant(conflict.conflictType)}">
													{getConflictLabel(conflict.conflictType)}
												</div>
												<button
													class="btn btn-square btn-soft btn-sm"
													onclick={() => editEvent(conflict.id)}
													aria-label="Modifier cet événement"
												>
													<Pencil size={16} />
												</button>
											</div>
										</div>
										{#if conflict.organizers.length > 0}
											<div class="text-muted-foreground text-fluid-sm mt-1">
												Organisateurs: {conflict.organizers.map((org) => org.username).join(', ')}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/each}
	</fieldset>
{/if}

<style>
</style>
