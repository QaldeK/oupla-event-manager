<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import { getSpace, spaceOptionsDB } from '$lib/shared/spaceOptions.svelte';
	import { showAlert } from '$lib/shared/states.svelte';
	import { pb } from '$lib/pocketbase.svelte';
	import type { SpaceConfig } from '$lib/types/spaceOptions';

	import { slide } from 'svelte/transition';

	let initialConfig = JSON.parse(JSON.stringify(getSpace.config));
	let spaceConfig = $state({ ...getSpace.config });

	let hasUnsavedChanges = $derived(JSON.stringify(spaceConfig) !== JSON.stringify(initialConfig));

	let confirmResponse = $state('');

	// $effect(() => {
	// 	hasUnsavedChanges = JSON.stringify(spaceConfig) !== JSON.stringify(spaceConfig);
	// });

	let showModalConfirm = $state(false);

	const handleModalResponse = (response) => {
		// Fermer la modal
		showModalConfirm = false;

		// Réinitialiser la réponse de confirmation
		confirmResponse = response;

		switch (response) {
			case 'leave':
				// Restaurer la configuration originale
				spaceConfig = spaceConfig;
				break;

			case 'save':
				// Enregistrer les modifications
				handleSubmit();
				break;
		}

		// Réinitialiser l'URL cible
		showModalConfirm = false;
	};

	function addOption(array: string[]) {
		array.push('');
	}

	function removeOption(array: string[], index: number) {
		array.splice(index, 1);
	}

	async function handleSubmit() {
		try {
			await getSpace.updateConfig($state.snapshot(spaceConfig));

			// Mettre à jour la référence initiale après succès
			initialConfig = JSON.parse(JSON.stringify(spaceConfig));

			showAlert('Configuration mise à jour', 'success');
		} catch (error) {
			console.error('Erreur lors de la mise à jour :', error);
			showAlert('Erreur lors de la mise à jour', 'error');
		}
	}

	function resetChanges() {
		spaceConfig = JSON.parse(JSON.stringify(initialConfig));
	}
</script>

<!-- {$inspect('targetUrl', $state.snapshot(targetUrl))} -->
{$inspect('hasUnsavedChanges', $state.snapshot(hasUnsavedChanges))}
<!-- {$inspect('showModalConfirm', $state.snapshot(showModalConfirm))} -->
<!-- {$inspect('confirmResponse', $state.snapshot(confirmResponse))} -->
<!-- {$inspect('spaceConfig from config page', $state.snapshot(spaceConfig))} -->
{$inspect('spaceConfig ', $state.snapshot(spaceConfig))}

<div class="container mx-auto p-4">
	<h1 class="mb-6 text-2xl font-bold">Paramètres de l'espace {spaceConfig.space.name}</h1>

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
				{#each spaceConfig.rooms as room, i}
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
					class="w-full rounded-lg border-2 border-dashed border-gray-300 py-2 text-gray-600 hover:border-gray-400 hover:text-gray-700"
				>
					Ajouter une salle
				</button>
			</div>
		</section>

		<!-- Catégories -->
		<section class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-xl font-semibold">Catégories</h2>
			<div class="space-y-3">
				{#each spaceConfig.categories as category, i}
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
					class="w-full rounded-lg border-2 border-dashed border-gray-300 py-2 text-gray-600 hover:border-gray-400 hover:text-gray-700"
				>
					Ajouter une catégorie
				</button>
			</div>
		</section>

		<!-- Rôles -->
		<section class="rounded-lg bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-xl font-semibold">Rôles organisationnels (mandats)</h2>
			<div class="mb-4">
				<label for="defaultRole" class="text-fluid-sm mb-2 block font-medium text-gray-700"
					>Rôle séléctionné par défaut
				</label>
				<select
					id="defaultRole"
					bind:value={spaceConfig.tasks.defaultTask}
					class="w-fit rounded-md border border-gray-300 bg-gray-100 px-3 py-2 shadow-xs hover:cursor-pointer hover:border-gray-400"
				>
					{#each spaceConfig.tasks.list as task}
						<option value={task} class="">{task}</option>
					{/each}
				</select>
			</div>
			<div class="space-y-3">
				{#each spaceConfig.tasks.list, i}
					<div class="flex items-center gap-2">
						<input
							type="text"
							bind:value={spaceConfig.tasks.list[i]}
							class="w-full rounded border px-3 py-2"
							placeholder="Nom du rôle"
						/>
						<button
							type="button"
							onclick={() => removeOption(spaceConfig.tasks.list, i)}
							class="rounded p-2 text-red-600 hover:bg-red-50"
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
				{/each}
				<button
					type="button"
					onclick={() => addOption(spaceConfig.tasks.list)}
					class="w-full rounded-lg border-2 border-dashed border-gray-300 py-2 text-gray-600 hover:border-gray-400 hover:text-gray-700"
				>
					Ajouter un rôle
				</button>
			</div>
		</section>

		<!-- Boutons d'action -->
		{#if hasUnsavedChanges}
			<div
				transition:slide={{ duration: 300, axis: 'y' }}
				class="bg-opacity-50 fixed bottom-0 left-0 flex w-full justify-end gap-4 bg-gray-300 px-4 py-2 shadow-lg"
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
			<button onclick={() => handleModalResponse('leave')}>Quitter sans enregistrer</button>
			<button onclick={() => handleModalResponse('save')}>Enregistrer</button>
		</div>
	</Modal>
{/if}

<style>
	.form-group {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
	}

	input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.375rem;
	}
</style>
