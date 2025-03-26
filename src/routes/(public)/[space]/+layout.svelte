<script lang="ts">
	import { pb } from '$lib/pocketbase.svelte';
	import { publicStore } from '$lib/shared/publicStore.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { children, data } = $props();
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Synchroniser les données du serveur avec le store
	$effect(() => {
		if (data?.spaceInfo) {
			// Utiliser les setters définis dans le store
			publicStore.setSpaceInfo(data.spaceInfo);
			publicStore.setSpaceEvents(data.events || []);
			isLoading = false;
		} else if (data?.error) {
			error = data.error;
			isLoading = false;
			setTimeout(() => goto('/'), 3000);
		} else {
			// Si pas de données, vérifions le store ou chargeons les données
			const spaceName = page.params.space;

			if (spaceName) {
				if (publicStore.spaceInfo?.name === spaceName) {
					// On a déjà les données dans le store
					isLoading = false;
				} else {
					// Chargement des données
					loadSpaceData(spaceName);
				}
			} else {
				isLoading = false;
				error = "Nom d'espace manquant";
				setTimeout(() => goto('/'), 3000);
			}
		}
	});

	async function loadSpaceData(spaceName: string) {
		try {
			await publicStore.loadPublicSpaceData(spaceName);

			if (!publicStore.spaceInfo) {
				error = "L'espace demandé n'existe pas ou n'est pas accessible publiquement";
				setTimeout(() => goto('/'), 3000);
			}
		} catch (err) {
			console.error('Erreur de chargement:', err);
			error = err instanceof Error ? err.message : 'Erreur lors du chargement des données';
			setTimeout(() => goto('/'), 3000);
		} finally {
			isLoading = false;
		}
	}
</script>

{#if publicStore.spaceInfo}
	<header class="bg-base-100 shadow">
		<div class="container mx-auto flex items-center justify-between p-4">
			<div class="text-xl font-bold">
				{publicStore.spaceInfo.title || publicStore.spaceInfo.name}
			</div>
			<div class="flex items-center gap-4">
				<!-- Actions supplémentaires peuvent être ajoutées ici -->
			</div>
		</div>
	</header>
{/if}

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

<Alert />
