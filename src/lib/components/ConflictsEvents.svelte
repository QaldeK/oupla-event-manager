<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { type EventConflict, eventsStore } from '$lib/shared/eventsStore.svelte';
	import { lisibleDate } from '$lib/utils';
	import Info from './Info.svelte';

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

	// Fonction pour organiser les conflits par date

	// Fonction pour déterminer la couleur du badge en fonction du type de conflit
	function getBadgeVariant(
		conflictType: string
	): 'warning' | 'destructive' | 'outline' | 'secondary' {
		switch (conflictType) {
			case 'confirmed':
				return 'destructive';
			case 'unconfirmed':
				return 'warning';
			default:
				return 'secondary';
		}
	}

	$inspect(overlappingGroups);
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
						<div class="p-2">
							<div class="ps-1 pb-1 text-lg font-semibold capitalize">{lisibleDate(date)}</div>
							<div class="space-y-2">
								{#each conflicts as conflict, index (index)}
									<div class="bg-muted/30 rounded-md border p-2">
										<div class="flex items-center justify-between gap-2">
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
											<Badge variant={getBadgeVariant(conflict.conflictType)} class="shrink-0">
												{conflict.conflictType}
											</Badge>
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
					{#if index < conflictGroups.length - 1}
						<div class="divider"></div>
					{/if}
				{/each}
			</div>
		{/each}
	</fieldset>
{/if}

<style>
</style>
