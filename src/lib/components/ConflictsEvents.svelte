<script lang="ts">
	import type { ConflictType, EventConflictInfo } from "$lib/services/eventConflicts";
	import type { OrganizerType } from "$lib/types/event.types";
	import { lisibleDate } from "$lib/utils";
	import { Pencil } from "lucide-svelte";
	import Info from "./Info.svelte";
	import { modalState, eventState, eventsStore } from "$lib/shared";

	// Propriétés optionnelles

	// État local
	let overlappingGroups = $state<Map<string, EventConflictInfo[][]>>(new Map());
	let hasConflicts = $state<boolean>(false);

	$effect(() => {
		if (eventsStore.isInitialized) {
			overlappingGroups = eventsStore.getOverlappingEventGroups;
			hasConflicts = overlappingGroups.size > 0;
		}
	});

	function editEvent(id: string) {
		const event = eventsStore.getEventById(id);
		eventState.is = event as unknown as typeof eventState.is;
		modalState.event = true;
	}

	// Fonction pour déterminer la couleur du badge en fonction du type de conflit
	function getBadgeVariant(
		conflictType: ConflictType
	): "badge-warning" | "badge-error" | "badge-outline" {
		switch (conflictType) {
			case "confirmed":
				return "badge-error";
			case "close-confirmed":
			case "unconfirmed":
				return "badge-warning";
			case "sondage":
			case "close-unconfirmed": // Conflit proche d'un non-confirmé -> Avertissement
				return "badge-outline";

			default:
				return "badge-warning"; // Par défaut, avertissement
		}
	}

	// Fonction pour obtenir le label lisible du type de conflit
	function getConflictLabel(conflictType: ConflictType): string {
		switch (conflictType) {
			case "confirmed":
				return "événement confirmé";
			case "unconfirmed":
				return "événement non confirmé";
			case "sondage":
				return "sondage";
			case "close-confirmed":
				return "confirmé (proche)"; // Label pour les conflits proches
			case "close-unconfirmed":
				return "non confirmé (proche)"; // Label pour les conflits proches
			default:
				// Au cas où un nouveau type apparaîtrait
				console.warn(`Type de conflit inconnu pour le label : ${conflictType}`);
				return conflictType;
		}
	}
</script>

{#if hasConflicts}
	<fieldset class="fieldset @container mb-8 rounded-lg px-2 py-8 @md:px-4">
		<legend class="fieldset-legend text-fluid-xl px-2">Evénements en conflits</legend>
		<Info variant="warning">
			<span class="text-fluid-xs"
				>Plusieurs événements se déroulent ou sont prévue en même temps à la même date.</span
			>
		</Info>
		<div class="grid gap-4 @sm:grid-cols-1 @xl:grid-cols-2 @5xl:grid-cols-3">
			{#each [...overlappingGroups.entries()] as [date, conflictGroups], index (index)}
				{#each conflictGroups as conflicts, index (index)}
					<div class="bg-base-200 card mb-4 shadow-lg">
						<div class="card-body px-2 py-4 @md:px-4">
							<h3 class="card-title mb-4 px-2 text-lg font-semibold capitalize">
								{lisibleDate(date)}
							</h3>
							<div class="space-y-4">
								{#each conflicts as conflict, index (index)}
									<div class="bg-base-100 rounded-lg p-4">
										<div class="flex flex-col justify-between gap-4">
											<div class="flex flex-wrap items-center justify-between gap-2">
												<div class="flex flex-col">
													<span class="text-fluid-sm font-semibold">{conflict.event_title}</span>
													<span class="text-fluid-sm text-muted-foreground font-medium">
														{conflict.time_start} - {conflict.time_end}
													</span>
												</div>
												<div>
													<button
														class="btn btn-square btn-sm self-end"
														onclick={() => editEvent(conflict.id)}
														aria-label="Modifier cet événement"
													>
														<Pencil size={20} />
													</button>
												</div>
											</div>
											<div class="flex flex-wrap gap-x-6 gap-y-2">
												<div class="badge badge-soft {getBadgeVariant(conflict.conflictType)}">
													{getConflictLabel(conflict.conflictType)}
												</div>
												{#if conflict.rooms.length}
													<div class="flex flex-wrap gap-2">
														<span class="text-base-content/60 text-fluid-sm">salle·s :</span>
														{#each conflict.rooms as room, index (index)}
															<span
																class="text-fluid-sm {conflicts.some(
																	(c) => c !== conflict && c.rooms.includes(room)
																)
																	? 'text-error'
																	: ''}"
															>
																{room}
															</span>
														{/each}
													</div>
												{:else}
													<span class="text-base-content/60 text-sm">Aucune salle précisée</span>
												{/if}
											</div>

											{#if conflict.organizers.length > 0}
												<div class="text-base-content/60 text-sm font-medium">
													Organisateur·ices: {conflict.organizers
														.map((org: OrganizerType) => org.username)
														.join(", ")}
												</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/each}
			{/each}
		</div>
	</fieldset>
{/if}

<style>
</style>
