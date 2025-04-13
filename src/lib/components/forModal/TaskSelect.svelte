<script lang="ts">
	import type { TaskType } from '$lib/types/spaceOptions';
	import { Plus } from 'lucide-svelte';
	import { slide } from 'svelte/transition';

	let {
		taskOptions = [],
		selectedTaskNames = $bindable([]),
		hasAddInput = false,
		onadd = undefined
	} = $props<{
		taskOptions: TaskType[];
		selectedTaskNames: string[];
		hasAddInput?: boolean;
		onadd?: (newTask: string) => void;
	}>();

	let newTaskName = $state('');

	const isSelected = (taskName: string) => {
		if (!selectedTaskNames) selectedTaskNames = [];
		return selectedTaskNames.includes(taskName);
	};

	const toggleTask = (taskName: string) => {
		// S'assurer que le tableau est initialisé
		if (!selectedTaskNames) selectedTaskNames = [];
		if (isSelected(taskName)) {
			selectedTaskNames = selectedTaskNames.filter((name) => name !== taskName);
		} else {
			selectedTaskNames = [...selectedTaskNames, taskName];
		}
	};

	const handleAddTask = () => {
		if (newTaskName.trim() && onadd) {
			onadd(newTaskName.trim());
			newTaskName = '';
		}
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleAddTask();
		}
	};
</script>

<div class="mb-4 flex flex-wrap gap-2">
	{#each taskOptions as task, i (i)}
		<div class="tooltip" data-tip={task.description}>
			<button
				type="button"
				class="btn btn-compact"
				class:btn-accent={isSelected(task.name)}
				class:btn-dash={!isSelected(task.name)}
				onclick={() => toggleTask(task.name)}
			>
				{task.name}
			</button>
		</div>
	{/each}

	{#if hasAddInput}
		<div transition:slide class="flex items-center gap-2">
			<input
				type="text"
				class="input input-sm input-bordered"
				placeholder="Ajouter une tâche"
				bind:value={newTaskName}
				onkeydown={handleKeyDown}
			/>
			<button
				type="button"
				class="btn btn-sm btn-square"
				onclick={handleAddTask}
				disabled={!newTaskName.trim()}
			>
				<Plus size={16} />
			</button>
		</div>
	{/if}
</div>
