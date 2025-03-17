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

	// Propriétés optionnelles
	let { showEmptyMessage } = $props();

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

<div class="conflicts-container">
	<h2 class="mb-4 text-xl font-semibold">Evénements en conflits</h2>

	{#if hasConflicts}
		{#each [...overlappingGroups.entries()] as [date, conflictGroups]}
			<div class="mb-2">
				{#each conflictGroups as conflicts}
					<Card class="mb-4">
						<CardContent class="p-4 pt-2">
							<div class="ps-1 pb-1 text-lg font-semibold capitalize">{lisibleDate(date)}</div>
							<div class="space-y-2">
								{#each conflicts as conflict}
									<div class="bg-muted/30 rounded-md border p-2">
										<div class="flex items-center justify-between gap-2">
											<div class="flex flex-wrap items-baseline gap-2 align-bottom">
												<span class="font-semibold">{conflict.event_title} • </span>
												<span class="text-fluid-sm font-medium whitespace-nowrap">
													{conflict.time_start} - {conflict.time_end} •
												</span>
												{#if conflict.rooms.length}
													<div class="flex flex-wrap gap-2">
														{#each conflict.rooms as room}
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
						</CardContent>
					</Card>
				{/each}
			</div>
		{/each}
	{:else if showEmptyMessage}
		<div class="text-muted-foreground py-8 text-center">
			<p>Aucun conflit d'événements détecté.</p>
		</div>
	{/if}
</div>

<style>
	.conflicts-container {
		width: 100%;
	}
</style>
