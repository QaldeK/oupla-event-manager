<script lang="ts">
	import type { EventType } from "$lib/types/types";
	import { getUnassignedTasks } from "$lib/services/eventActions";

	let { event, class: className = "" } = $props<{
		event: EventType;
		class?: string;
	}>();

	let unassignedTasks = $derived(getUnassignedTasks(event));
</script>

{#if unassignedTasks.length > 0}
	<div class="flex flex-wrap gap-1 {className}">
		<span class="text-fluid-sm text-base-content/60">Tâches non attribuées:</span>
		{#each unassignedTasks as task, index (task.name + event.id + index)}
			<span title={task.description} class="badge badge-soft badge-sm me-1 mb-1 font-medium"
				>{task.name}</span
			>
		{/each}
	</div>
{:else}
	<div class="text-fluid-sm text-base-content/60 flex flex-wrap gap-1 {className}">
		Toutes les tâches sont attribuées
	</div>
{/if}
