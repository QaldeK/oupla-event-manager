<script lang="ts">
	import { modalState } from '$lib/shared/states.svelte';
	import type { TaskType } from '$lib/types/spaceOptions';

	let modalId = 'task_dialog';

	let username = $derived(modalState.tasks.data.username);
	let tasksOptions = $derived(modalState.tasks.data.tasks);

	// let tasks: TaskType[] = $state.snapshot(modalState.tasks.data.tasks);
	let selectedTaskNames = $state<string[]>(modalState.tasks.data.selectedTasks);

	const isSelected = (taskName: string) => {
		if (!selectedTaskNames) selectedTaskNames = [];
		return selectedTaskNames.includes(taskName);
	};

	function toggleItem(taskName: string) {
		// S'assurer que selectedTaskNames est initialisé
		if (!selectedTaskNames) selectedTaskNames = [];
		if (isSelected(taskName)) {
			selectedTaskNames = selectedTaskNames.filter((name) => name !== taskName);
		} else {
			selectedTaskNames = [...selectedTaskNames, taskName];
		}
	}

	const handleSubmit = () => {
		if (modalState.tasks.data.onSubmit) {
			modalState.tasks.data.onSubmit(selectedTaskNames || []); // Renvoyer tableau vide si null/undefined
		}
		closeModal();
	};

	const handleCancel = () => {
		closeModal();
	};

	const closeModal = () => {
		const modal = document.getElementById(modalId) as HTMLDialogElement;
		modal?.close();
		// Réinitialiser l'état du modal
		modalState.tasks.isOpen = false;
		// Optionnel: réinitialiser les données pour éviter les fuites d'état
		modalState.tasks.data.username = '';
		modalState.tasks.data.tasks = [];
		modalState.tasks.data.selectedTasks = [];
		modalState.tasks.data.onSubmit = null;
	};

	$effect(() => {
		const modal = document.getElementById(modalId) as HTMLDialogElement;
		if (modalState.tasks.isOpen) {
			selectedTaskNames = modalState.tasks.data.selectedTasks;
			modal?.showModal();
		}
	});
</script>

<dialog id={modalId} class="modal">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Définir les roles pour {username}</h3>
		<div class="my-4">
			<div class="flex w-full flex-wrap items-center gap-2">
				{#each tasksOptions as task (task.name)}
					<button
						class="btn btn-outline btn-sm {isSelected(task.name) &&
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
			<button onclick={handleCancel} class="btn btn-ghost">Annuler</button>
			<button class="btn btn-primary" onclick={handleSubmit}>Enregistrer</button>
		</div>
	</div>
</dialog>
