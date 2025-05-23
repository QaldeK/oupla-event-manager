<script lang="ts">
	import type { OrganizerType, TaskType } from "$lib/types/types";

	interface Props {
		organizers: OrganizerType[];
		tasks: TaskType[];
	}
	let { organizers, tasks }: Props = $props();
</script>

<div class=" flex flex-wrap items-center gap-x-3 gap-y-2 @max-md:my-2">
	{#each organizers as organizer (organizer.id)}
		<div
			class=" bg-accent/5 text-accent flex rounded-lg px-3 py-1"
			title={organizer.tasks?.join(", ") || "aucune taches spécifiées"}
		>
			<span class="text-fluid-sm my-auto me-1 font-semibold">{organizer.username}</span>

			{#if tasks?.length > 1 && organizer.tasks}
				<div class="border-accent/20 ms-1 flex flex-wrap gap-2 border-l ps-2">
					{#each organizer.tasks as task (organizer.id + task)}
						<span class="font-base self-center text-sm italic">{task}</span>
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>
