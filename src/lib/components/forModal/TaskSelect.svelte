<script lang="ts">
	import type { TaskConfig } from '$lib/types/spaceOptions';
	import { Plus } from 'lucide-svelte';
	import { slide } from 'svelte/transition';

	let {
		taskOptions = [],
		selectedTasks = $bindable([]),
		hasAddInput = false,
		onadd = undefined
	} = $props<{
		taskOptions: TaskConfig[];
		selectedTasks: TaskConfig[];
		hasAddInput?: boolean;
		onadd?: (newTask: string) => void;
	}>();

	let newTaskName = $state('');

	const isSelected = (task: TaskConfig) => {
		return selectedTasks.some((t) => t.name === task.name);
	};

	const toggleTask = (task: TaskConfig) => {
		if (isSelected(task)) {
			selectedTasks = selectedTasks.filter((t) => t.name !== task.name);
		} else {
			selectedTasks = [...selectedTasks, task];
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
				class:btn-accent={isSelected(task)}
				class:btn-dash={!isSelected(task)}
				onclick={() => toggleTask(task)}
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
