<script lang="ts">
	import { publicStore } from '$lib/shared/publicStore.svelte';
	import Alert from '$lib/components/Alert.svelte';

	import NavBarHeader from '$lib/components/public/NavBarHeader.svelte';

	import { page } from '$app/state';
	import { Menu } from 'lucide-svelte';
	import '/src/daisy.css';

	// 👉 Importer le type SitePagesResponse
	import type { SitePagesResponse } from '$lib/types/pocketbase';
	import type { PublicSiteThemeOptions } from '$lib/types/theme';
	import type { NavBarHeaderConfig } from '$lib/components/public/NavBarHeader.svelte';
	let { children } = $props();

	let isLeftSidebarOpen = $state(false);

	let isLoading = $derived(publicStore.isLoading);
	let storeError = $derived(publicStore.error);
	let spaceInfo = $derived(publicStore.spaceInfo);

	let themeOptions = $derived(publicStore.themeOptions); // Récupère les options du thème
	let layoutSitePages = $derived(publicStore.layoutSitePages);

	let theme = $state(themeOptions.daisyTheme || 'light'); // sécurité

	let showNavBarHeader = $derived(themeOptions?.components?.navbarHeader?.enabled ?? false);
	let shouldNavBarBeSticky = $derived(themeOptions?.components?.navbarHeader?.isFixed ?? false);

	let pagesBySection = $derived.by(() => {
		const groups: Record<string, SitePagesResponse[]> = {
			leftSide: [],
			top: [],
			rightSide: [],
			footer: []
		};
		if (layoutSitePages) {
			console.log('[pagesBySection] layoutSitePages contient:', layoutSitePages.length, 'éléments'); // 👉 DEBUG
			for (const page of layoutSitePages) {
				// Vérifier que la section existe dans 'groups' avant d'ajouter
				// 👉 DEBUG: Log chaque page et sa section avant le tri
				console.log(`[pagesBySection] Traitement page ID: ${page.id}, Section: ${page.section}`);
				if (page.section && page.section in groups) {
					groups[page.section].push(page);
				}
			}
		}
		// Trier par pos DANS chaque groupe (le store les récupère déjà triées, mais double sécurité)
		for (const key in groups) {
			groups[key].sort((a, b) => (a.pos || 0) - (b.pos || 0));
		}
		return groups;
	});

	let configNavBarHeader: NavBarHeaderConfig = $derived({
		title: spaceInfo?.name || 'Mon Application',
		bgClass: themeOptions.layoutSections.header.bgClass,
		titleClass: themeOptions.components.navbarHeader.titleClass,
		hasMenu: themeOptions.components.navbarHeader.hasMenu,
		isFixed: shouldNavBarBeSticky,
		size: themeOptions.components.navbarHeader.size,
		linkClass: themeOptions.components.navbarHeader.linkClass,
		links: themeOptions.components.navbarHeader.links,
		toggleThemeMode
	});

	// --- Effet pour charger les données publiques ---

	$effect(() => {
		const spaceName = page.params.space; // Lire le paramètre de la route
		console.log('[Layout Effect] Déclenché pour space:', spaceName);

		if (!spaceName) {
			console.warn("[Layout Effect] Nom d'espace manquant.");
			publicStore.clearStore(); // S'assurer que le store est vide
			// Gérer la redirection si nécessaire
			// setTimeout(() => goto('/'), 3000);
			return; // Arrêter l'effet si pas de nom d'espace
		}
		publicStore.loadPublicData(spaceName);
	});

	let initialPathname = $state(page.url.pathname); // Stocker le pathname initial

	// --- Effet pour fermer la sidebar à la navigation ---
	$effect(() => {
		const currentPathname = page.url.pathname;
		if (currentPathname !== initialPathname) {
			isLeftSidebarOpen = false;
			initialPathname = currentPathname; // Mettre à jour pour la prochaine navigation
		}
	});

	$effect(() => {
		if (themeOptions) {
			const themeToApply =
				themeOptions.defaultMode === 'dark'
					? themeOptions.daisyThemeDark
					: themeOptions.daisyThemeLight;
			theme = themeToApply;
		}
	});

	// --- Fonctions Utilitaires de Style ---
	function toggleThemeMode() {
		if (themeOptions.daisyTheme === themeOptions.daisyThemeDark) {
			themeOptions.daisyTheme = themeOptions.daisyThemeLight;
		} else {
			themeOptions.daisyTheme = themeOptions.daisyThemeDark;
		}
		theme = themeOptions.daisyTheme;
	}

	function getSectionClasses(sectionName: keyof PublicSiteThemeOptions['layoutSections']): string {
		if (sectionName === 'mainBackgroundClass') {
			return themeOptions?.layoutSections?.mainBackgroundClass || 'bg-base-200/50';
		}

		const sectionStyle = themeOptions?.layoutSections?.[sectionName];
		// Retourne les classes définies ou des classes par défaut sûres
		return sectionStyle
			? `${sectionStyle.bgClass || 'bg-base-100'} ${sectionStyle.textClass || 'text-base-content'}`
			: 'bg-base-100 text-base-content';
	}

	// Fonction pour obtenir la classe de fond DaisyUI
	function getBgClassForBlock(color: string | undefined | null): string {
		if (!color) return 'bg-transparent'; // Défaut si pas de couleur
		const colorMap: Record<string, string> = {
			primary: 'bg-primary text-primary-content',
			secondary: 'bg-secondary text-secondary-content',
			accent: 'bg-accent text-accent-content',
			info: 'bg-info text-info-content',
			success: 'bg-success text-success-content',
			warning: 'bg-warning text-warning-content',
			error: 'bg-error text-error-content',
			neutral: 'bg-neutral text-neutral-content',
			outline: 'border border-current', // Cas spécifique pour 'outline'
			// Ajouter d'autres couleurs ou styles si nécessaire
			'base-100': 'bg-base-100 text-base-content',
			'base-200': 'bg-base-200 text-base-content',
			'base-300': 'bg-base-300 text-base-content'
		};
		return colorMap[color] || 'bg-base-100'; // Fallback si la couleur n'est pas mappée
	}

	$inspect(layoutSitePages, 'layoutSitePages brut du store'); // 👉 DEBUG: Voir les données brutes
</script>

{#snippet pageBlock(page: SitePagesResponse)}
	<div class="card mb-4 shadow-sm {getBgClassForBlock(page.bg_color)}">
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

<div data-theme={theme}>
	{#if publicStore.isLoading}
		<div class="flex min-h-screen items-center justify-center">
			<div class="text-center">
				<span class="loading loading-dots loading-lg"></span>
				<p>Chargement de l'espace...</p>
			</div>
		</div>
	{:else if storeError}
		<div class="container mx-auto max-w-2xl p-4">
			<div role="alert" class="alert alert-error">
				<div>
					<h3 class="font-bold">Erreur</h3>
					<div class="text-xs">{storeError}</div>
				</div>
			</div>
			<p class="mt-4 text-center text-sm">
				Impossible de charger l'espace. Vérifiez l'URL ou réessayez plus tard..
			</p>
		</div>
	{:else if spaceInfo && themeOptions}
		<div class="drawer lg:drawer-open">
			<input
				id="left-sidebar-drawer"
				type="checkbox"
				class="drawer-toggle"
				bind:checked={isLeftSidebarOpen}
			/>

			<!-- Contenu principal (incluant header, top, main, right, footer) -->
			<div class="drawer-content flex flex-col {getSectionClasses('mainBackgroundClass')}">
				<label
					for="left-sidebar-drawer"
					aria-label="Ouvrir menu"
					class="btn btn-square btn-ghost fixed top-2 left-2 z-[51] lg:hidden"
				>
					<Menu />
				</label>

				<!-- Header Section -->
				<header class="w-full shadow-sm">
					<div class=""></div>
				</header>

				{#if showNavBarHeader}
					<div
						class="{shouldNavBarBeSticky ? 'sticky top-0 z-50' : ''} w-full {getSectionClasses(
							'header'
						)}"
					>
						<NavBarHeader config={configNavBarHeader} />
						<!-- Possible d'ajouter ici un séparateur visuel ou une ombre si non sticky -->
					</div>
				{/if}

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
					{#if pagesBySection.rightSide.length > 0}
						<aside
							class="card order-first mt-6 w-full shrink-0 p-4 lg:order-last lg:mt-0 lg:w-72 xl:w-96 {getSectionClasses(
								'rightSidebar'
							)}"
							role="complementary"
							aria-labelledby="right-sidebar-heading"
						>
							<h2 id="right-sidebar-heading" class="sr-only">Informations supplémentaires</h2>
							<!-- Pour l'accessibilité -->
							{#each pagesBySection.rightSide as page (page.id)}
								{@render pageBlock(page)}
							{/each}
						</aside>
					{/if}
				</div>

				<!-- Footer Section -->
				{#if pagesBySection.footer.length > 0}
					<footer class="mt-auto {getSectionClasses('footer')}">
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
				<aside
					class="min-h-full w-72 p-4 shadow-lg {getSectionClasses('leftSidebar')}"
					role="navigation"
				>
					{#if pagesBySection.leftSide.length > 0}
						{#each pagesBySection.leftSide as page (page.id)}
							{@render pageBlock(page)}
						{/each}
					{/if}
				</aside>
			</div>
		</div>

		<!--  FIX: apparait brievement au chargement -->
		<!-- {:else} -->
		<!-- Cas où isLoading est false, error est null, mais spaceInfo est null (devrait être couvert par l'erreur) -->
		<!-- <div class="container mx-auto p-4">
			<p class="text-error text-center">Impossible d'afficher l'espace public.</p>
		</div> -->
	{/if}

	<Alert />
</div>

<style>
	/* Styles spécifiques au layout si nécessaire */
	.drawer-content {
		/* Assurer un scroll indépendant si le contenu dépasse */
		/* overflow-y: auto; */ /* Peut être géré par les flex-grow */
		min-height: 100vh;
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

	:global(.prose a) {
		color: hsl(var(--p));
	}
	:global(.prose a:hover) {
		color: hsl(var(--pf)); /* Couleur primaire hover/focus */
	}
</style>
