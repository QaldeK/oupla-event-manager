<script lang="ts">
	import { modalState } from "$lib/shared/states.svelte";
	import type { TaskType } from "$lib/types/types";
	import ButtonGroupSelect from "./forModal/ButtonGroupSelect.svelte";

	let modalId = "task_dialog";

	let username = $derived(modalState.tasks.data.username);
	let tasksOptions = $derived(modalState.tasks.data.tasksAvailable);

	// let tasks: TaskType[] = $state.snapshot(modalState.tasks.data.tasks);
	let selectedTasks = $state<TaskType[]>([]);

	const handleSubmit = () => {
		if (modalState.tasks.data.onSubmit) {
			const selectedNames = selectedTasks.map((task) => task.name);
			// 👉 Appeler onSubmit avec le tableau de noms (string[])
			modalState.tasks.data.onSubmit(selectedNames);
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

		modalState.tasks.data.username = "";
		modalState.tasks.data.tasksAvailable = [];
		modalState.tasks.data.selectedTaskNames = [];
		modalState.tasks.data.onSubmit = null;
	};

	// 👉 Initialiser selectedTasks à partir des noms dans modalState
	$effect(() => {
		if (modalState.tasks.isOpen) {
			const initialSelectedNames = modalState.tasks.data.selectedTaskNames || [];
			// Trouver les objets TaskType correspondants dans les options disponibles
			selectedTasks = tasksOptions.filter((task) => initialSelectedNames.includes(task.name));
		} else {
			// Réinitialiser quand le modal se ferme (en plus de closeModal)
			selectedTasks = [];
		}
	});
</script>

<dialog id={modalId} class="modal" class:modal-open={modalState.tasks.isOpen}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">Définir les roles pour {username}</h3>
		<div class="my-4">
			<ButtonGroupSelect
				options={tasksOptions}
				bind:selectedItems={selectedTasks}
				optionsLabel="name"
			/>
		</div>
		<div class="modal-action">
			<button onclick={handleCancel} class="btn btn-ghost">Annuler</button>
			<button class="btn btn-primary" onclick={handleSubmit}>Enregistrer</button>
		</div>
	</div>
</dialog>
