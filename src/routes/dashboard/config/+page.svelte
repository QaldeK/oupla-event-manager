<script lang="ts">
	import Modal from "$lib/components/Modal.svelte";
	import { getSpace } from "$lib/shared";
	import { showAlert } from "$lib/shared/states.svelte";
	import { slide } from "svelte/transition";

	import { X } from "lucide-svelte";
	import type { TaskType } from "$lib/types/event.types";

	let initialConfig = JSON.parse(JSON.stringify(getSpace.config));
	let spaceConfig = $state({ ...initialConfig });

	let hasUnsavedChanges = $derived(JSON.stringify(spaceConfig) !== JSON.stringify(initialConfig));

	let showModalConfirm = $state(false);
	let getDefaultTaskIndex = initialConfig.tasks.findIndex((task: TaskType) => task.isDefault) || 0;

	let defaultTaskIndex = $state(getDefaultTaskIndex);

	const handleModalResponse = (response: "leave" | "save") => {
		// Fermer la modal
		showModalConfirm = false;

		switch (response) {
			case "leave":
				// Restaurer la configuration originale
				spaceConfig = spaceConfig;
				break;

			case "save":
				// Enregistrer les modifications
				handleSubmit();
				break;
		}

		// Réinitialiser l'URL cible
		showModalConfirm = false;
	};

	function addOption(array: string[]) {
		array.push("");
	}

	function removeOption(array: string[], index: number) {
		array.splice(index, 1);
	}

	function addNewTask() {
		spaceConfig.tasks = [
			...spaceConfig.tasks,
			{
				name: "",
				description: "",
				type: "onEvent"
			}
		];
	}

	function removeTask(index: number) {
		// Si on supprime la tâche par défaut, il faut en définir une autre
		const isRemovingDefault = index === defaultTaskIndex;

		spaceConfig.tasks = spaceConfig.tasks.filter((_, i) => i !== index);

		// Ajuster l'index par défaut après suppression
		if (isRemovingDefault && spaceConfig.tasks.length > 0) {
			setDefaultTask(0);
		} else if (index < defaultTaskIndex) {
			defaultTaskIndex = defaultTaskIndex - 1;
		}
	}

	function setDefaultTask(index: number) {
		// Retirer le flag 'isDefault' de l'ancienne tâche par défaut (si elle existe)
		if (index === defaultTaskIndex) {
			return;
		}
		const oldDefaultIndex = spaceConfig.tasks.findIndex((task: TaskType) => task.isDefault);
		if (oldDefaultIndex !== -1) {
			spaceConfig.tasks[oldDefaultIndex].isDefault = false;
		}

		// Mettre le flag 'isDefault' sur la nouvelle tâche
		spaceConfig.tasks[index].isDefault = true;

		// Mettre à jour l'index par défaut
		defaultTaskIndex = index;
	}

	async function handleSubmit() {
		try {
			console.log("Submitting config:", $state.snapshot(spaceConfig));
			await getSpace.updateConfig($state.snapshot(spaceConfig));

			// Mettre à jour la référence initiale après succès
			initialConfig = JSON.parse(JSON.stringify(spaceConfig));

			showAlert("Configuration mise à jour", "success");
		} catch (error) {
			console.error("Erreur lors de la mise à jour :", error);
			showAlert("Erreur lors de la mise à jour", "error");
		}
	}

	function resetChanges() {
		spaceConfig = JSON.parse(JSON.stringify(initialConfig));
		defaultTaskIndex = spaceConfig.tasks.findIndex((task: TaskType) => task.isDefault) || 0;
	}
</script>

<!-- {$inspect('targetUrl', $state.snapshot(targetUrl))} -->
<!-- {$inspect("hasUnsavedChanges", $state.snapshot(hasUnsavedChanges))} -->
<!-- {$inspect('showModalConfirm', $state.snapshot(showModalConfirm))} -->
<!-- {$inspect('confirmResponse', $state.snapshot(confirmResponse))} -->
<!-- {$inspect('spaceConfig from config page', $state.snapshot(spaceConfig))} -->
<!-- {$inspect("spaceConfig ", $state.snapshot(spaceConfig))} -->

<div class=" container mx-auto p-4">
	<h1 class="text-fluid-2xl mb-6 font-bold">Paramètres de l'espace {spaceConfig?.space?.name}</h1>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="space-y-8"
	>
		<div class="flex flex-wrap justify-evenly gap-8">
			<!-- Salles -->
			<section
				class="bg-base-100 border-base-300 flex flex-col items-center rounded-lg border p-2 shadow-sm sm:p-6"
			>
				<h2 class="text-fluid-xl mb-4 font-semibold">Salles</h2>
				<div class=" mb-4 space-y-3">
					{#each spaceConfig.rooms, i (i)}
						<div class="flex items-center gap-2">
							<input
								type="text"
								bind:value={spaceConfig.rooms[i]}
								class="input w-full sm:min-w-60"
								placeholder="Nom de la salle"
							/>
							<button
								type="button"
								onclick={() => {
									removeOption(spaceConfig.rooms, i);
								}}
								class="btn btn-soft btn-square btn-error"
								aria-label="Supprimer la salle"
							>
								<X />
							</button>
						</div>
					{/each}
				</div>
				<button
					type="button"
					onclick={() => addOption(spaceConfig.rooms)}
					class="btn btn-dash mt-auto w-full"
				>
					Ajouter une salle
				</button>
			</section>

			<!-- Catégories -->
			<section
				class="bg-base-100 border-base-300 flex flex-col items-center rounded-lg border p-2 shadow-sm sm:p-6"
			>
				<h2 class="text-fluid-xl mb-4 font-semibold">Catégories</h2>
				<div class=" mb-4 space-y-3">
					{#each spaceConfig.categories, i (i)}
						<div class="flex items-center gap-2">
							<input
								type="text"
								bind:value={spaceConfig.categories[i]}
								class="input w-full sm:min-w-60"
								placeholder="Nom de la catégorie"
							/>
							<button
								type="button"
								onclick={() => removeOption(spaceConfig.categories, i)}
								class="btn btn-soft btn-square btn-error"
								aria-label="Supprimer la catégorie"
							>
								<X />
							</button>
						</div>
					{/each}
				</div>
				<button
					type="button"
					onclick={() => addOption(spaceConfig.categories)}
					class="btn btn-dash mt-auto w-full justify-self-end"
				>
					Ajouter une catégorie
				</button>
			</section>
		</div>
		<!-- Rôles -->
		<section class="border-base-300 rounded-lg border p-2 shadow-sm sm:p-6">
			<h2 class="text-fluid-xl mb-4 font-semibold">Rôles organisationnels (mandats)</h2>

			<div class=" space-y-4">
				{#each spaceConfig.tasks, i (i)}
					<div class="sm:p-4" out:slide>
						<div class="flex flex-wrap gap-4 not-sm:flex-col">
							<!-- Nom de la tâche -->
							<fieldset class="fieldset flex-grow">
								<legend class="fieldset-legend"> Nom de la tache </legend>
								<input
									type="text"
									id={`task-name-${i}`}
									bind:value={spaceConfig.tasks[i].name}
									class="input w-full"
									placeholder="Nom de la tache"
								/>
							</fieldset>

							<!-- Type de tâche (beforeEvent/none) -->
							<fieldset class="fieldset min-w-[120px]">
								<legend class="fieldset-legend"> Doit être réalisé: </legend>
								<select bind:value={spaceConfig.tasks[i].type} class="select w-full">
									<option value="beforeEvent">En amont de l'événement</option>
									<option selected value="onEvent">Pendant l'événement</option>
									<option value="afterEvent">Après l'événement</option>
									<!-- <option value="none">Aucun</option> -->
								</select>
							</fieldset>
						</div>

						<!-- Description (en dessous) -->
						<fieldset class="fieldset mt-4">
							<legend class="input-label fieldset-legend"> Description de la tâche </legend>
							<textarea
								bind:value={spaceConfig.tasks[i].description}
								id={`task-description-${i}`}
								class="textarea w-full p-4"
								placeholder="Description de la tâche"
								rows="2"
							></textarea>
						</fieldset>
						<!-- Bouton "Par défaut" (radio) -->
						<div class="my-4 flex flex-wrap gap-4">
							<button
								type="button"
								onclick={() => setDefaultTask(i)}
								class="btn btn-sm {i === defaultTaskIndex ? 'btn-success' : 'btn-outline'}"
								aria-label="Définir comme tâche par défaut"
							>
								{i === defaultTaskIndex ? "Par défaut ✓" : "Définir par défaut"}
							</button>

							<!-- Bouton de suppression -->
							<button
								type="button"
								onclick={() => removeTask(i)}
								class="btn btn-sm btn-error btn-outline"
								aria-label="Supprimer le rôle"
							>
								<X />
								Supprimer
							</button>
						</div>
					</div>
					<div class="divider"></div>
				{/each}

				<button type="button" onclick={addNewTask} class="btn btn-dash w-full">
					Ajouter une tâche
				</button>
			</div>
		</section>

		<!-- Boutons d'action -->
		{#if hasUnsavedChanges}
			<div
				transition:slide={{ duration: 300, axis: "y" }}
				class="bg-base-300/70 shadow-t-lg fixed bottom-0 left-0 flex w-full justify-end gap-4 px-4 py-2"
			>
				<button
					type="button"
					onclick={resetChanges}
					class="rounded bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
				>
					Annuler
				</button>
				<button type="submit" class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
					Enregistrer
				</button>
			</div>
		{/if}
	</form>
</div>

{#if showModalConfirm}
	<Modal>
		<h2>Modifications non enregistrées</h2>
		<p>Vous avez des modifications non enregistrées. Que souhaitez-vous faire ?</p>
		<div class="mx-1 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
			<button onclick={() => handleModalResponse("leave")}>Quitter sans enregistrer</button>
			<button onclick={() => handleModalResponse("save")}>Enregistrer</button>
		</div>
	</Modal>
{/if}

<style>
	/* label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
	} */
</style>
