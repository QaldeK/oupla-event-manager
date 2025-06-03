<script lang="ts">
	import type { TaskType, TaskTypeType } from "$lib/types/event.types"; // Assurez-vous que TaskType et TaskExecutionTime sont correctement exportés

	interface Props {
		onAddTask: (task: TaskType) => void; // Callback pour ajouter la tâche
		onCancel: () => void; // Callback pour annuler
	}

	let { onAddTask, onCancel }: Props = $props();

	// États locaux pour les champs du formulaire
	let taskName = $state("");
	let taskDescription = $state("");
	// 👉 Initialise le type à 'onEvent' par défaut
	let taskType = $state<TaskTypeType>("onEvent");
	let nameError = $state<string | null>(null);

	function handleSubmit() {
		nameError = null; // Reset error
		const trimmedName = taskName.trim();

		if (!trimmedName) {
			nameError = "Le nom de la tâche est requis.";
			return;
		}

		// 👉 Crée l'objet TaskType complet
		const newTask: TaskType = {
			name: trimmedName,
			description: taskDescription.trim(),
			type: taskType
		};

		onAddTask(newTask); // Appelle le callback parent
		resetForm(); // Optionnel: Réinitialise le formulaire après ajout
	}

	function handleCancel() {
		onCancel(); // Appelle le callback parent
		resetForm(); // Réinitialise aussi en cas d'annulation
	}

	function resetForm() {
		taskName = "";
		taskDescription = "";
		taskType = "onEvent";
		nameError = null;
	}

	// Labels pour les boutons radio
	const typeLabels = {
		beforeEvent: "À réaliser en amont de l'événement",
		onEvent: "Pendant l'événement",
		afterEvent: "À réaliser après l'événement",
		none: "Non défini" // Ajoutez 'none' si c'est une valeur possible
	};
</script>

<div class="bg-base-200 mt-4 space-y-3 rounded-md border p-4">
	<div class="text-fluid-base font-semibold">Ajouter une nouvelle tâche personnalisée</div>

	<!-- Champ Nom -->
	<div class="form-control">
		<label for="task-name" class="label">
			<span class="label-text">Nom de la tâche*</span>
		</label>
		<input
			type="text"
			id="task-name"
			bind:value={taskName}
			placeholder="Nom unique de la tâche"
			class="input input-bordered w-full {nameError ? 'input-error' : ''}"
		/>
		{#if nameError}
			<label class="label" for="task-name">
				<span class="label-text-alt text-error">{nameError}</span>
			</label>
		{/if}
	</div>

	<!-- Champ Description -->
	<div class="form-control">
		<label for="task-description" class="label">
			<span class="label-text">Description (optionnel)</span>
		</label>
		<textarea
			id="task-description"
			bind:value={taskDescription}
			placeholder="Décrivez brièvement la tâche"
			class="textarea textarea-bordered w-full"
			rows={2}
		></textarea>
	</div>

	<!-- Champ Type (Radio buttons) -->
	<div class="form-control">
		<span class="label-text mb-1">Quand réaliser la tâche ?</span>
		<div class="flex flex-wrap gap-x-4 gap-y-2">
			{#each Object.entries(typeLabels) as [value, label] (value)}
				{#if value !== "none"}
					<label class="label-text flex cursor-pointer items-center gap-2">
						<input
							type="radio"
							name="task-type"
							bind:group={taskType}
							{value}
							class="radio checked:radio-primary mt-2"
						/>
						<span class="label-text">{label}</span>
					</label>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Boutons d'action -->
	<div class="flex justify-end gap-2 pt-2">
		<button class="btn btn-ghost btn-sm" onclick={handleCancel}> Annuler </button>
		<button class="btn btn-primary btn-sm" onclick={handleSubmit}> Confirmer l'ajout </button>
	</div>
</div>
