<script lang="ts">
	import Modal from "$lib/components/Modal.svelte";
	import { getSpace } from "$lib/shared";
	import { showAlert } from "$lib/shared/states.svelte";
	import { slide } from "svelte/transition";

	let initialConfig = JSON.parse(JSON.stringify(getSpace.config));
	let spaceConfig = $state({ ...getSpace.config });

	let hasUnsavedChanges = $derived(JSON.stringify(spaceConfig) !== JSON.stringify(initialConfig));

	let showModalConfirm = $state(false);
	let defaultTaskIndex = $state(
		spaceConfig.tasks.findIndex((task) => task.type === "default") || 0
	);

	// 👉 Références aux conteneurs des listes pour gérer le focus
	let roomsContainer: HTMLDivElement | undefined = $state();
	let categoriesContainer: HTMLDivElement | undefined = $state();

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
				type: "default"
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
		// Définir la tâche comme "default" et réinitialiser l'ancienne
		if (
			defaultTaskIndex !== undefined &&
			defaultTaskIndex >= 0 &&
			defaultTaskIndex < spaceConfig.tasks.length
		) {
			spaceConfig.tasks[defaultTaskIndex].type = "none";
		}

		spaceConfig.tasks[index].type = "default";
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
		defaultTaskIndex = spaceConfig.tasks.findIndex((task) => task.type === "default") || 0;
	}
</script>

<!-- {$inspect('targetUrl', $state.snapshot(targetUrl))} -->
{$inspect("hasUnsavedChanges", $state.snapshot(hasUnsavedChanges))}
<!-- {$inspect('showModalConfirm', $state.snapshot(showModalConfirm))} -->
<!-- {$inspect('confirmResponse', $state.snapshot(confirmResponse))} -->
<!-- {$inspect('spaceConfig from config page', $state.snapshot(spaceConfig))} -->
{$inspect("spaceConfig ", $state.snapshot(spaceConfig))}

<div class="container mx-auto p-4">
	<h1 class="mb-6 text-2xl font-bold">Paramètres de l'espace {spaceConfig?.space?.name}</h1>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="space-y-8"
	>
		<!-- Salles -->
		<section class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-xl font-semibold">Salles</h2>
			<div class="space-y-3">
				{#each spaceConfig.rooms, i (i)}
					<div class="flex items-center gap-2">
						<input
							type="text"
							bind:value={spaceConfig.rooms[i]}
							class="w-full rounded border px-3 py-2"
							placeholder="Nom de la salle"
						/>
						<button
							type="button"
							onclick={() => {
								removeOption(spaceConfig.rooms, i);
							}}
							class="rounded p-2 text-red-600 hover:bg-red-50"
							aria-label="Supprimer la salle"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				{/each}
				<button
					type="button"
					onclick={() => addOption(spaceConfig.rooms)}
					class="btn btn-dash w-full"
				>
					Ajouter une salle
				</button>
			</div>
		</section>

		<!-- Catégories -->
		<section class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-xl font-semibold">Catégories</h2>
			<div class="space-y-3">
				{#each spaceConfig.categories, i (i)}
					<div class="flex items-center gap-2">
						<input
							type="text"
							bind:value={spaceConfig.categories[i]}
							class="w-full rounded border px-3 py-2"
							placeholder="Nom de la catégorie"
						/>
						<button
							type="button"
							onclick={() => removeOption(spaceConfig.categories, i)}
							class="rounded p-2 text-red-600 hover:bg-red-50"
							aria-label="Supprimer la catégorie"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				{/each}
				<button
					type="button"
					onclick={() => addOption(spaceConfig.categories)}
					class="btn btn-dash w-full"
				>
					Ajouter une catégorie
				</button>
			</div>
		</section>

		<!-- Rôles -->
		<section class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-xl font-semibold">Rôles organisationnels (mandats)</h2>

			<div class="space-y-4 divide-y-2 divide-dashed">
				{#each spaceConfig.tasks, i (i)}
					<div class="p-4">
						<div class="flex flex-wrap items-center gap-3">
							<!-- Nom de la tâche -->
							<div class="flex-grow">
								<label class="floating-label">
									<input
										type="text"
										bind:value={spaceConfig.tasks[i].name}
										class="input input-lg w-full"
										placeholder="Nom de la tache"
									/> <span>Nom de la tache</span>
								</label>
							</div>

							<!-- Type de tâche (beforeEvent/none) -->
							<div class="min-w-[120px]">
								<select
									bind:value={spaceConfig.tasks[i].type}
									disabled={i === defaultTaskIndex}
									class="select select-sm w-full {i === defaultTaskIndex ? 'hidden' : ''}"
								>
									<option value="beforeEvent">En amont de l'événement</option>
									<option value="onEvent">Pendant l'événement</option>
									<option value="afterEvent">Après l'événement</option>
									<option value="none">Aucun</option>
								</select>
							</div>
							<!-- Bouton "Par défaut" (radio) -->
							<button
								type="button"
								onclick={() => setDefaultTask(i)}
								class="btn btn-sm {i === defaultTaskIndex ? 'btn-success' : 'btn'}"
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
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						<!-- Description (en dessous) -->
						<div class="mt-4">
							<label class="floating-label">
								<textarea
									bind:value={spaceConfig.tasks[i].description}
									class="textarea w-full p-4"
									placeholder="Description de la tâche"
									rows="2"
								></textarea>
								<span>Description de la tâche</span>
							</label>
						</div>
					</div>
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
	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
	}
</style>
