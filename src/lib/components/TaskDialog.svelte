<script lang="ts">
	import { modalState } from "$lib/shared/states.svelte";
	import type { TaskType } from "$lib/types/types";
	import { AlertTriangle } from "lucide-svelte";
	import ButtonGroupSelect from "./forModal/ButtonGroupSelect.svelte";

	let modalId = "task_dialog";

	let username = $derived(modalState.tasks.data.username);
	let tasksOptions = $derived(modalState.tasks.data.tasksAvailable);
	let eventIsConfirmed = $derived(modalState.tasks.data.eventIsConfirmed);
	let initialSelectedNames = $derived(modalState.tasks.data.selectedTaskNames || []);

	// let tasks: TaskType[] = $state.snapshot(modalState.tasks.data.tasks);
	let selectedTasks = $state<TaskType[]>([]);
	let removedTasks = $derived.by(() => {
		// Tâches qui étaient sélectionnées et qui ne le sont plus
		return initialSelectedNames.filter(
			(name) => !selectedTasks.map((task) => task.name).includes(name)
		);
	});

	// Pour l'option de notification
	let notifyOthers = $state(true);

	// Vérifier si au moins une tâche a été supprimée et l'événement est confirmé
	const hasRemovedTasksOnConfirmedEvent = $derived(removedTasks.length > 0 && eventIsConfirmed);
	const isCompleteUnsubscribe = $derived(
		initialSelectedNames.length > 0 && selectedTasks.length === 0 && eventIsConfirmed
	);
	const shouldShowNotificationOption = $derived(
		hasRemovedTasksOnConfirmedEvent || isCompleteUnsubscribe
	);

	const handleSubmit = () => {
		if (modalState.tasks.data.onSubmit) {
			const selectedNames = selectedTasks.map((task) => task.name);
			// 👉 Appeler onSubmit avec le tableau de noms (string[])
			// Ajouter l'information de notification si pertinent
			if (shouldShowNotificationOption) {
				modalState.tasks.data.onSubmit(selectedNames, notifyOthers);
			} else {
				modalState.tasks.data.onSubmit(selectedNames);
			}
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
		modalState.tasks.data.eventIsConfirmed = false;
	};

	// 👉 Initialiser selectedTasks à partir des noms dans modalState
	$effect(() => {
		if (modalState.tasks.isOpen) {
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

		{#if hasRemovedTasksOnConfirmedEvent}
			<div class="alert bg-warning/20 my-4 shadow-lg">
				<AlertTriangle size={20} class="not-sm:hidden" />
				<div class="flex flex-col items-start">
					<span class="font-semibold">Attention: Cet événement est confirmé</span>
					<span class="text-sm">
						Vous allez vous désinscrire de:
						{#each removedTasks as task, i (task + i)}
							<span class="font-medium">{task}</span>{i < removedTasks.length - 1 ? ", " : ""}
						{/each}
					</span>
					<span class="mt-1 text-xs">
						En cas de désinscription, il est recommandé de prévenir les autres organisateurs.
					</span>
					<div class="form-control mt-4">
						<label class="label cursor-pointer justify-start gap-2">
							<input
								type="checkbox"
								class="checkbox checkbox-sm checkbox-warning"
								bind:checked={notifyOthers}
							/>
							<span class="label-text text-wrap"
								>Prévenir automatiquement les autres organisateur·ices</span
							>
						</label>
					</div>
				</div>
			</div>
		{:else if eventIsConfirmed && selectedTasks.length === 0}
			<div class="alert alert-error my-4 shadow-lg">
				<AlertTriangle size={20} />
				<div class="flex flex-col items-start">
					<span class="font-semibold">Désinscription complète d'un événement confirmé</span>
					<span class="mt-1 text-sm">
						Vous vous désinscrivez de toutes les tâches. Si l'événement est proche, songez à
						l'annuler ou à en discuter avec les autres organisateurs.
					</span>
					<div class="form-control mt-2">
						<label class="label cursor-pointer justify-start gap-2">
							<input
								type="checkbox"
								class="checkbox checkbox-sm checkbox-warning"
								bind:checked={notifyOthers}
							/>
							<span class="label-text">Prévenir les autres organisateur·ices</span>
						</label>
					</div>
				</div>
			</div>
		{/if}

		<div class="modal-action">
			<button onclick={handleCancel} class="btn btn-ghost">Annuler</button>
			<button
				class="btn {hasRemovedTasksOnConfirmedEvent ||
				(eventIsConfirmed && selectedTasks.length === 0)
					? 'btn-warning'
					: 'btn-primary'}"
				onclick={handleSubmit}
			>
				Enregistrer
			</button>
		</div>
	</div>
</dialog>
