<script lang="ts">
	import { loadPads, createPad } from '$lib/shared/padStore.svelte';
	import type { PadResponse } from '$lib/types/pad/pad.types';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import { goto } from '$app/navigation';

	let pads = $state<PadResponse[]>([]);
	let isLoading = $state(true);
	let newPadTitle = $state('');
	let isCreating = $state(false);
	let error = $state<string | null>(null);

	async function loadAllPads() {
		isLoading = true;
		error = null;
		try {
			pads = await loadPads();
		} catch (e) {
			error = 'Erreur lors du chargement des pads';
			console.error(e);
		} finally {
			isLoading = false;
		}
	}

	async function handleCreatePad() {
		if (!newPadTitle.trim()) {
			error = 'Le titre du pad ne peut pas être vide';
			return;
		}

		isCreating = true;
		error = null;

		try {
			const newPad = await createPad(newPadTitle);
			pads = [newPad, ...pads];
			newPadTitle = '';
			// Rediriger vers le pad nouvellement créé
			goto(`/dashboard/pads/${newPad.id}`);
		} catch (e) {
			error = 'Erreur lors de la création du pad';
			console.error(e);
		} finally {
			isCreating = false;
		}
	}

	// Charger les pads au chargement de la page
	$effect(() => {
		loadAllPads();
	});

	function formatDate(dateString: string) {
		return format(new Date(dateString), 'dd MMMM yyyy à HH:mm', { locale: fr });
	}
</script>

<div class="container mx-auto px-4 py-8">
	<h1 class="text-3xl font-bold">Mes documents collaboratifs</h1>

	{#if isLoading}
		<div class="flex justify-center py-12">
			<span class="loading loading-dots loading-lg"></span>
		</div>
	{:else if pads.length === 0}
		<div class="card bg-base-100 shadow-md">
			<div class="card-body py-16 text-center">
				<h3 class="mb-2 text-xl font-semibold">Aucun document collaboratif</h3>
				<p class="text-base-content/60">Créez votre premier document</p>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			<div class="card bg-base-200 max-w-md p-4 shadow-md">
				<div class="card-body p-4">
					<h2 class="card-title mb-2 text-xl">Créer un nouveau pad</h2>
					<div class="flex gap-2">
						<input
							type="text"
							class="input input-bordered w-full"
							placeholder="Titre du nouveau pad"
							bind:value={newPadTitle}
							onkeydown={(e) => e.key === 'Enter' && handleCreatePad()}
						/>
						<button
							class="btn btn-primary"
							onclick={handleCreatePad}
							disabled={isCreating || !newPadTitle}
						>
							{#if isCreating}
								<span class="loading loading-spinner loading-xs"></span>
							{:else}
								Créer
							{/if}
						</button>
					</div>
					{#if error}
						<p class="text-error mt-2 text-sm">{error}</p>
					{/if}
				</div>
			</div>
			{#each pads as pad (pad.id)}
				<a
					href={`/dashboard/pads/${pad.id}`}
					class="card bg-base-100 shadow-md transition-shadow hover:shadow-lg"
				>
					<div class="card-body">
						<h2 class="card-title text-xl">{pad.title}</h2>
						<p class="text-base-content/70 text-sm">
							Créé le {formatDate(pad.created as string)}
						</p>
						<p class="text-base-content/70 text-sm">
							Dernière modification: {formatDate(pad.updated as string)}
						</p>
						<div class="card-actions mt-4 justify-end">
							<button class="btn btn-sm btn-outline">Ouvrir</button>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
