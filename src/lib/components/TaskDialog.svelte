<script lang="ts">
	import { modalState } from '$lib/shared/states.svelte';
	import type { TaskConfig } from '$lib/types/spaceOptions';

	let modalId = "task_dialog";

	// pseudo props
	let username: string = $state(modalState.tasks.data.username);
	let tasks: TaskConfig[] = $state.snapshot(modalState.tasks.data.tasks);
	let selectedTasks = $state<string[]>(modalState.tasks.data.selectedTasks);

	const isSelected = (taskName: string) => {
		if (!selectedTasks) return false;
		return selectedTasks.some((item) => item === taskName);
	};

	function toggleItem(taskName: string) {
		if (isSelected(taskName)) {
			selectedTasks = selectedTasks.filter((item) => item !== taskName);
		} else {
			selectedTasks = [...selectedTasks, taskName];
		}
	}

	const handleSubmit = () => {
		if (modalState.tasks.data.onSubmit) {
			modalState.tasks.data.onSubmit(selectedTasks);
		}
		const modal = document.getElementById(modalId) as HTMLDialogElement;
		modal?.close();
		modalState.tasks.isOpen = false;
	};

	$effect(() => { 
		if (modalState.tasks.isOpen) {
			const modal = document.getElementById(modalId) as HTMLDialogElement;
			modal?.showModal(); 
		}
	});
</script>

<dialog id={modalId} class="modal">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Définir les roles pour {username}</h3>
		<div class="my-4">
			<div class="flex w-full flex-wrap items-center gap-2">
				{#each tasks as task (task.name)}
					<button
						class="btn btn-outline btn-xs {isSelected(task.name) &&
							'border-4 border-green-500 font-bold'}"
						onclick={() => toggleItem(task.name)}
						title={task.description}
					>
						<span>{task.name}</span>
					</button>
				{/each}
			</div>
		</div>
		<div class="modal-action">
			<form method="dialog">
				<button class="btn btn-ghost">Annuler</button>
				<button class="btn btn-primary" onclick={handleSubmit}>Enregistrer</button>
			</form>
		</div>
	</div>
</dialog>
