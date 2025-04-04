<script lang="ts">
	import { pb } from '$lib/pocketbase.svelte';
	import { publicStore } from '$lib/shared/publicStore.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Menu, X } from 'lucide-svelte';
	// 👉 Importer le type SitePagesResponse
	import type { SitePagesResponse } from '$lib/types/pocketbase'; // À REMPLACER par le vrai chemin

	let { children, data } = $props();
	// 👉 LOG CLIENT 1: Voir l'objet data brut dès l'initialisation du script
	console.log('[Layout Script Start] Initial data prop:', data);
	// 👉 LOG CLIENT 2: Essayer de forcer la lecture et voir si ça lève une erreur ou ce que ça contient
	try {
		console.log('[Layout Script Start] Attempting stringify:', JSON.stringify(data));
	} catch (e) {
		console.error('[Layout Script Start] Error stringifying data:', e);
	}

	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Store local pour l'état du drawer (sidebar gauche)
	let isLeftSidebarOpen = $state(false);

	// 👉 Traiter les données reçues du serveur
	let sitePages = $derived<SitePagesResponse[]>(data?.sitePages || []);

	// 👉 Grouper les pages par section pour un accès facile
	let pagesBySection = $derived(() => {
		const groups: Record<string, SitePagesResponse[]> = {
			header: [],
			left_side: [],
			top: [],
			right_side: [],
			footer: []
		};
		for (const page of sitePages) {
			if (page.section && groups[page.section]) {
				groups[page.section].push(page);
			}
		}
		// Trier chaque groupe par 'order' si nécessaire (déjà fait côté serveur mais peut être utile)
		// for (const key in groups) {
		//  groups[key].sort((a, b) => (a.order || 0) - (b.order || 0));
		// }
		return groups;
	});

	// Synchroniser les données du serveur avec le store global et gérer l'état local
	$effect(() => {
		if (data?.spaceInfo) {
			publicStore.setSpaceInfo(data.spaceInfo);
			isLoading = false;
			error = data.error || null;
			if (error) {
				// setTimeout(() => goto('/'), 5000);
			}
		} else if (data?.error) {
			error = data.error;
			isLoading = false;
			publicStore.clearStore();
			// setTimeout(() => goto('/'), 3000);
		} else {
			const spaceName = page.params.space; // Lire page.params ici
			if (spaceName) {
				loadSpaceData(spaceName); // Fallback (moins probable)
			} else {
				isLoading = false;
				error = "Nom d'espace manquant dans l'URL";
				// setTimeout(() => goto('/'), 3000);
			}
		}
	});

	let initialPathname = $state(page.url.pathname); // Stocker le pathname initial
	$effect(() => {
		const currentPathname = page.url.pathname; // Lire le pathname actuel DANS l'effet
		// Fermer la sidebar SEULEMENT si le pathname a changé depuis le chargement initial ou la dernière navigation
		if (currentPathname !== initialPathname) {
			// console.log('Navigation détectée, fermeture sidebar:', initialPathname, '->', currentPathname);
			isLeftSidebarOpen = false;
			// Mettre à jour initialPathname pour la prochaine comparaison *après* avoir potentiellement fermé
			initialPathname = currentPathname;
		}

		// Alternative pour comparer avec la valeur précédente (plus complexe si non nécessaire)
		// let previousPathname: string | undefined = undefined;
		// return () => { previousPathname = currentPathname; }; // Stocker pour la prochaine fois
		// if (previousPathname !== undefined && previousPathname !== currentPathname) {
		//    isLeftSidebarOpen = false;
		// }
	});

	async function loadSpaceData(spaceName: string) {
		// Cette fonction est maintenant moins probable d'être appelée directement
		// car les données viennent de +page.server.ts
		console.warn('Tentative de chargement manuel des données dans +layout.svelte');
		isLoading = true;
		try {
			// Ici, il faudrait recharger TOUTES les données (spaceInfo, events, sitePages)
			// Cela complexifie la logique. Il est préférable de s'assurer que +page.server.ts
			// fournit toujours les données nécessaires ou une erreur claire.
			// Pour simplifier, on va juste afficher l'erreur si on arrive ici sans données serveur.
			error = 'Erreur interne : Données non chargées par le serveur.';
			// setTimeout(() => goto('/'), 3000);
		} catch (err) {
			console.error('Erreur de chargement manuel:', err);
			error = err instanceof Error ? err.message : 'Erreur lors du chargement des données';
			setTimeout(() => goto('/'), 3000);
		} finally {
			isLoading = false;
		}
	}

	// Fonction pour obtenir la classe de fond DaisyUI
	function getBgClass(color: string | undefined | null): string {
		if (!color) return 'bg-base-100'; // Défaut si pas de couleur
		const colorMap: Record<string, string> = {
			primary: 'bg-primary text-primary-content',
			secondary: 'bg-secondary text-secondary-content',
			accent: 'bg-accent text-accent-content',
			info: 'bg-info text-info-content',
			success: 'bg-success text-success-content',
			warning: 'bg-warning text-warning-content',
			error: 'bg-error text-error-content',
			neutral: 'bg-neutral text-neutral-content',
			outline: 'border border-base-content/20 bg-transparent', // Cas spécifique pour 'outline'
			// Ajouter d'autres couleurs ou styles si nécessaire
			'base-100': 'bg-base-100 text-base-content',
			'base-200': 'bg-base-200 text-base-content',
			'base-300': 'bg-base-300 text-base-content'
		};
		return colorMap[color] || 'bg-base-100'; // Fallback si la couleur n'est pas mappée
	}
</script>

{#snippet pageBlock(page: SitePagesResponse)}
	<div class="card mb-4 border shadow-sm {getBgClass(page.bg_color)}">
		<div class="card-body">
			{#if page.title}
				<h3 class="card-title">{page.title}</h3>
			{/if}
			{#if page.content}
				<div class="prose max-w-none">
					{@html page.content}
				</div>
			{/if}
		</div>
	</div>
{/snippet}

{#if isLoading}
	<div class="flex min-h-screen items-center justify-center">
		<div class="text-center">
			<span class="loading loading-dots loading-lg"></span>
			<p>Chargement de l'espace...</p>
		</div>
	</div>
{:else if error}
	<div class="container mx-auto max-w-2xl p-4">
		<div role="alert" class="alert alert-error">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 shrink-0 stroke-current"
				fill="none"
				viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				/></svg
			>
			<div>
				<h3 class="font-bold">Erreur</h3>
				<div class="text-xs">{error}</div>
			</div>
		</div>
		<p class="mt-4 text-center text-sm">Vous allez être redirigé vers l'accueil...</p>
	</div>
{:else if publicStore.spaceInfo}
	<!-- Utilisation du composant Drawer de DaisyUI pour la sidebar gauche -->
	<div class="drawer lg:drawer-open">
		<input
			id="left-sidebar-drawer"
			type="checkbox"
			class="drawer-toggle"
			bind:checked={isLeftSidebarOpen}
		/>

		<!-- Contenu principal (incluant header, top, main, right, footer) -->
		<div class="drawer-content bg-base-200/50 flex flex-col">
			<!-- Header Section -->
			<header class="bg-base-100 sticky top-0 z-30 w-full shadow-sm">
				<div class="container mx-auto">
					{#if pagesBySection.header.length > 0}
						{#each pagesBySection.header as page (page.id)}
							{@render pageBlock(page)}
						{/each}
					{:else}
						<!-- Header par défaut si aucun bloc 'header' n'est défini -->
						<div class="navbar min-h-[4rem]">
							<div class="navbar-start">
								<!-- Bouton pour ouvrir la sidebar gauche sur mobile -->
								<label
									for="left-sidebar-drawer"
									aria-label="Ouvrir menu"
									class="btn btn-square btn-ghost lg:hidden"
								>
									<Menu />
								</label>
								<span class="hidden px-2 text-xl font-bold lg:block">
									{publicStore.spaceInfo.title || publicStore.spaceInfo.name}
								</span>
							</div>
							<div class="navbar-center lg:hidden">
								<span class="text-lg font-bold">
									{publicStore.spaceInfo.title || publicStore.spaceInfo.name}
								</span>
							</div>
							<div class="navbar-end">
								<!-- Autres éléments du header ici -->
							</div>
						</div>
					{/if}
				</div>
			</header>

			<!-- Top Section -->
			{#if pagesBySection.top.length > 0}
				<section aria-label="Contenu supérieur" class="container mx-auto px-4 pt-4">
					{#each pagesBySection.top as page (page.id)}
						{@render pageBlock(page)}
					{/each}
				</section>
			{/if}

			<!-- Zone principale: Main Content + Right Sidebar -->
			<div class="container mx-auto flex flex-grow flex-col px-4 py-4 lg:flex-row lg:gap-6">
				<!-- Main Content Area (Page spécifique + enfants) -->
				<main class="order-last w-full flex-grow lg:order-first">
					{@render children?.()}
				</main>

				<!-- Right Sidebar Section -->
				{#if pagesBySection.right_side.length > 0}
					<aside
						class="order-first mt-6 w-full shrink-0 lg:order-last lg:mt-0 lg:w-64 xl:w-72"
						role="complementary"
					>
						<h2 class="sr-only">Informations supplémentaires</h2>
						<!-- Pour l'accessibilité -->
						{#each pagesBySection.right_side as page (page.id)}
							{@render pageBlock(page)}
						{/each}
					</aside>
				{/if}
			</div>

			<!-- Footer Section -->
			{#if pagesBySection.footer.length > 0}
				<footer class="bg-base-300 text-base-content mt-auto">
					<div class="container mx-auto p-4">
						{#each pagesBySection.footer as page (page.id)}
							{@render pageBlock(page)}
						{/each}
					</div>
				</footer>
			{/if}
		</div>

		<!-- Sidebar gauche (Drawer) -->
		<div class="drawer-side z-40">
			<!-- Overlay pour fermer en cliquant à côté -->
			<label for="left-sidebar-drawer" aria-label="Fermer menu" class="drawer-overlay"></label>
			<!-- Contenu de la sidebar -->
			<aside class="bg-base-100 min-h-full w-72 p-4 shadow-lg" role="navigation">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-lg font-semibold">Menu</h2>
					<button
						class="btn btn-ghost btn-sm lg:hidden"
						onclick={() => (isLeftSidebarOpen = false)}
						aria-label="Fermer menu"
					>
						<X size="20" />
					</button>
				</div>
				{#if pagesBySection.left_side.length > 0}
					{#each pagesBySection.left_side as page (page.id)}
						{@render pageBlock(page)}
					{/each}
				{:else}
					<p class="text-base-content/70 text-sm italic">Aucun contenu pour le menu latéral.</p>
				{/if}
			</aside>
		</div>
	</div>
{:else}
	<!-- Cas où isLoading est false, error est null, mais spaceInfo est null (devrait être couvert par l'erreur) -->
	<div class="container mx-auto p-4">
		<p class="text-error text-center">Impossible d'afficher l'espace public.</p>
	</div>
{/if}

<Alert />

<style>
	/* Styles spécifiques au layout si nécessaire */
	.drawer-content {
		/* Assurer un scroll indépendant si le contenu dépasse */
		/* overflow-y: auto; */ /* Peut être géré par les flex-grow */
	}
	.drawer-side > aside {
		/* Scroll si le contenu de la sidebar dépasse */
		overflow-y: auto;
	}

	/* Amélioration pour le contenu HTML rendu par {@html} */
	:global(.prose) {
		/* Styles par défaut pour le contenu généré */
		--tw-prose-body: hsl(var(--bc));
		--tw-prose-headings: hsl(var(--bc));
		--tw-prose-lead: hsl(var(--bc));
		--tw-prose-links: hsl(var(--p)); /* Couleur primaire pour les liens */
		--tw-prose-bold: hsl(var(--bc));
		--tw-prose-counters: hsl(var(--bc) / 0.6);
		--tw-prose-bullets: hsl(var(--bc) / 0.4);
		--tw-prose-hr: hsl(var(--b2)); /* Bordure pour les hr */
		--tw-prose-quotes: hsl(var(--bc));
		--tw-prose-quote-borders: hsl(var(--b3));
		--tw-prose-captions: hsl(var(--bc) / 0.7);
		--tw-prose-code: hsl(var(--n)); /* Couleur neutre pour le code inline */
		--tw-prose-pre-code: hsl(var(--nc));
		--tw-prose-pre-bg: hsl(var(--n)); /* Fond neutre pour les blocs de code */
		--tw-prose-th-borders: hsl(var(--b3));
		--tw-prose-td-borders: hsl(var(--b2));
	}
	/* Rendre les images responsives dans le contenu {@html} */
	:global(.prose img) {
		max-width: 100%;
		height: auto;
		border-radius: var(--radius-box, 0.5rem); /* Appliquer le radius des boîtes DaisyUI */
	}
	/* Ajustement pour les cards dans le contenu */
	:global(.prose .card) {
		margin-top: 1em;
		margin-bottom: 1em;
	}
</style>
