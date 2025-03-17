<script lang="ts">
	import { pb } from '$lib/pocketbase.svelte';
	import { getSpace, loadSpaceOptions } from '$lib/shared/spaceOptions.svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { children } = $props();
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let currentSpaceName = $state<string | null>(null);

	async function loadSpaceData(spaceName: string) {
		try {
			isLoading = true;
			// Rechercher l'espace par son nom
			const spaceRecord = await pb.collection('spaces').getFirstListItem(`name="${spaceName}"`);

			if (!spaceRecord) {
				throw new Error("L'espace n'existe pas");
			}

			// Charge les options en mode public avec l'ID trouvé
			const space = await loadSpaceOptions(spaceRecord.id, true);
			if (!space) {
				throw new Error("Impossible de charger les options de l'espace");
			}

			currentSpaceName = spaceName;
			console.log('Space loaded:', space);
		} catch (err) {
			console.error('Erreur de chargement:', err);
			error = "L'espace demandé n'existe pas ou n'est pas accessible";
			setTimeout(() => goto('/'), 3000);
		} finally {
			isLoading = false;
		}
	}

	$effect.pre(() => {
		const spaceName = page.params.space;
		if (spaceName && spaceName !== currentSpaceName) {
			loadSpaceData(spaceName);
		}
	});
</script>

{#if isLoading}
	<div class="flex min-h-[200px] items-center justify-center">
		<div class="text-center">Chargement...</div>
	</div>
{:else if error}
	<div class="container mx-auto max-w-2xl p-4">
		<div class="rounded-lg border-l-4 border-red-500 bg-red-100 p-4 text-red-700">
			<p>{error}</p>
			<p class="text-fluid-sm mt-2">Redirection vers la page d'accueil...</p>
		</div>
	</div>
{:else}
	{@render children?.()}
{/if}
