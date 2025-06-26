<script lang="ts">
	import { modalState } from "$lib/shared/states.svelte";
	import { analyzeUnsubscriptionImpact } from "$lib/shared/eventActionHandler.svelte";
	import { userDb } from "$lib/shared/userDb.svelte";
	import type { TaskType } from "$lib/types/types";
	import { AlertTriangle } from "lucide-svelte";
	import ButtonGroupSelect from "./forModal/ButtonGroupSelect.svelte";

	let modalId = "task_dialog";

	let username = $derived(modalState.tasks.data.username);
	let tasksOptions = $derived(modalState.tasks.data.tasksAvailable);
	let eventIsConfirmed = $derived(modalState.tasks.data.eventIsConfirmed);
	let initialSelectedNames = $derived(modalState.tasks.data.selectedTaskNames || []);
	let organizers = $derived(modalState.tasks.data.organizers || []);

	// let tasks: TaskType[] = $state.snapshot(modalState.tasks.data.tasks);
	let selectedTasks = $state<TaskType[]>([]);

	let removedTasksOnConfirmed = $derived.by(() => {
		if (!eventIsConfirmed) return [];
		// Tâches qui étaient sélectionnées et qui ne le sont plus
		return initialSelectedNames.filter(
			(name) => !selectedTasks.map((task) => task.name).includes(name)
		);
	});

	// Pour l'option de notification
	let notifyOthers = $state(true);

	// Nouvelle logique d'analyse d'impact
	const unsubscriptionImpact = $derived.by(() => {
		if (!eventIsConfirmed || !userDb.current?.id) return null;

		const selectedNames = selectedTasks.map((task) => task.name);
		return analyzeUnsubscriptionImpact(
			organizers,
			userDb.current.id,
			initialSelectedNames,
			selectedNames
		);
	});

	// Nouvelles conditions dérivées
	const hasOrphanTasks = $derived((unsubscriptionImpact?.tasksBecomingOrphan.length ?? 0) > 0);
	const hasOrphanEvent = $derived(unsubscriptionImpact?.eventBecomingOrphan === true);

	const simpleUnsubscriptionOnConfirmed = $derived(removedTasksOnConfirmed.length > 0);

	const shouldShowNotificationOption = $derived(
		hasOrphanTasks || hasOrphanEvent || simpleUnsubscriptionOnConfirmed
	);

	const handleSubmit = () => {
		if (modalState.tasks.data.onSubmit) {
			const selectedNames = selectedTasks.map((task) => task.name);
			// 👉 Appeler onSubmit avec le tableau de noms (string[])
			// Ajouter l'information de notification si pertinent
			if (shouldShowNotificationOption) {
				modalState.tasks.data.onSubmit?.(selectedNames, notifyOthers);
			} else {
				modalState.tasks.data.onSubmit?.(selectedNames);
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
		modalState.tasks.data.organizers = [];
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
	<div class="modal-box min-w-3/5">
		<h3 class="text-lg font-bold">Définir les roles pour {username}</h3>
		<div class="my-4">
			<ButtonGroupSelect
				options={tasksOptions}
				bind:selectedItems={selectedTasks}
				optionsLabel="name"
			/>
		</div>

		{#if hasOrphanEvent}
			<div class="alert alert-error my-4 shadow-lg">
				<div class="flex flex-col items-start">
					<span class="font-semibold"
						><AlertTriangle size={20} class="me-2 inline" />Attention : L'événement n'aura plus
						d'organisateur·ices</span
					>
					<p class="mt-1 text-sm">
						Votre désinscription laissera cet événement confirmé sans organisateur·ices. Considérez
						annuler l'événement ou transférer les responsabilités.
					</p>
					<div class="form-control mt-2">
						<label class="label cursor-pointer justify-start gap-2">
							<input type="checkbox" class="checkbox checkbox-sm" bind:checked={notifyOthers} />
							<span class="label-text text-wrap">Prévenir les autres organisateur·ices</span>
						</label>
					</div>
				</div>
			</div>
		{:else if hasOrphanTasks}
			<div class="alert alert-warning my-4 shadow-lg">
				<div class="flex flex-col items-start">
					<span class="font-semibold"
						><AlertTriangle size={20} class="me-2 inline" />Evenement confirmé</span
					>
					<p class="mt-1 text-sm">
						Vous allez vous désinscrire de certaines tâches qui n'ont pas d'autres
						organisateur·ices:
						{unsubscriptionImpact?.tasksBecomingOrphan.join(", ")}
					</p>
					<div class="form-control mt-2">
						<label class="label cursor-pointer justify-start gap-2">
							<input type="checkbox" class="checkbox checkbox-sm" bind:checked={notifyOthers} />
							<span class="label-text text-wrap"
								>Prévenir les autres organisateur·ices de l'événement</span
							>
						</label>
					</div>
				</div>
			</div>
		{:else if simpleUnsubscriptionOnConfirmed}
			<div class="alert my-4 shadow-lg">
				<div class="flex flex-col items-start">
					<p class="mt-1 text-sm">
						Vous allez vous désinscrire de certaines tâches alors que l'événement est confirmé. Il
						est conseillé de prévenir les autres organisateur·ices.
					</p>
					<div class="form-control mt-2">
						<label class="label cursor-pointer justify-start gap-2">
							<input type="checkbox" class="checkbox checkbox-sm" bind:checked={notifyOthers} />
							<span class="label-text text-wrap">Prévenir les autres organisateur·ices</span>
						</label>
					</div>
				</div>
			</div>
		{/if}

		<div class="modal-action">
			<button onclick={handleCancel} class="btn btn-ghost">Annuler</button>
			<button
				class="btn {hasOrphanEvent || hasOrphanTasks ? 'btn-warning' : 'btn-primary'}"
				onclick={handleSubmit}
			>
				Enregistrer
			</button>
		</div>
	</div>
</dialog>
