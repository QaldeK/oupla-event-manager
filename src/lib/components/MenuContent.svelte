<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { modalState } from "$lib/shared/states.svelte.js";
	import { screenDetector } from "$lib/utils/screen.svelte";
	// Importation de TOUT depuis notre nouveau fichier de configuration
	import {
		confMenuItems,
		eventsMenuItems,
		generateUrl,
		inviteUserButton,
		newEventButton,
		otherMenuItems,
		type ActionItem,
		type MenuItem
	} from "$lib/shared/navigation";

	interface Props {
		isCompact?: boolean;
		onItemClick?: () => void;
	}

	let { isCompact = false, onItemClick }: Props = $props();
	let isMobile = $derived(screenDetector.isMobile);

	// L'URL courante, utilisée pour déterminer l'état "actif"
	let currentFullUrl = $derived(page.url.pathname + page.url.search);
	let currentPathname = $derived(page.url.pathname);

	// Vérifie si un item de navigation correspond EXACTEMENT à l'URL actuelle
	function isItemActive(item: MenuItem): boolean {
		return generateUrl(item) === currentFullUrl;
	}

	// Vérifie si un groupe de sous-menus doit être déplié
	function shouldShowSubItems(item: MenuItem): boolean {
		if (!item.subItems) return false;

		// Déplie si on est sur la page parente ou une de ses sous-pages
		if (currentPathname.startsWith(item.path)) {
			return true;
		}

		// Déplie si un des enfants est la page active
		return item.subItems.some(isItemActive);
	}

	// Gère tous les clics : soit une navigation, soit une action
	function handleClick(item: MenuItem | ActionItem) {
		// Vérifie si c'est un item d'action (a la prop 'action')
		if ("action" in item) {
			switch (item.action) {
				case "openEventModal":
					modalState.event = true;
					break;
				case "openInviteModal":
					modalState.inviteUser = true;
					break;
			}
		}
		// Sinon, c'est un item de navigation (a la prop 'path')
		else if ("path" in item) {
			goto(generateUrl(item));
		}

		onItemClick?.(); // Ferme le menu sur mobile, par exemple
	}
</script>

<!-- SNIPPET RÉCURSIF POUR AFFICHER LES ITEMS DE MENU -->
{#snippet renderMenuItem(item, level = 0)}
	{@const url = generateUrl(item)}
	{@const Icon = item.icon}
	<li>
		<a href={url} class={[isItemActive(item) && "bg-base-300"]} onclick={() => handleClick(item)}>
			<Icon size={isCompact ? "26" : "24"} class={item.iconClass} />
			<span class={[isCompact && "hidden"]}>{item.label}</span>
		</a>

		<!-- Appel récursif si des sous-items existent et doivent être montrés -->
		{#if item.subItems && shouldShowSubItems(item)}
			<ul class="menu-sub {isCompact ? 'compact-subitem' : ''}">
				{#each item.subItems as subItem (subItem.label)}
					{@render renderMenuItem(subItem, level + 1)}
				{/each}
			</ul>
		{/if}
	</li>
{/snippet}

<div class="flex w-full flex-col gap-4">
	<!-- Bouton d'action "Nouvel événement" -->
	<button class="btn btn-primary p-2" onclick={() => handleClick(newEventButton)}>
		<newEventButton.icon size={isCompact ? "26" : "24"} />
		{#if !isCompact}
			<span>{newEventButton.label}</span>
		{/if}
	</button>

	<!-- Menu evenement -->
	<ul class="menu rounded-box menu-vertical bg-base-200 menu-lg w-full gap-1">
		{#each eventsMenuItems as item (item.label)}
			{@render renderMenuItem(item)}
		{/each}
	</ul>

	<!-- menu autre (newsletter, doc) -->

	<ul class="menu rounded-box menu-vertical bg-base-200 menu-lg w-full gap-1">
		{#each otherMenuItems as item (item.label)}
			{@render renderMenuItem(item)}
		{/each}
	</ul>

	<!-- Menu bottom -->
	<ul
		class="menu menu-vertical w-full {isMobile
			? 'menu-md'
			: 'menu-lg'} rounded-box bg-base-200 mt-auto mb-4 gap-1"
	>
		<!-- Bouton d'action "Inviter" -->
		<li>
			<button onclick={() => handleClick(inviteUserButton)}>
				<inviteUserButton.icon size={isCompact ? "26" : "24"} />
				<span class:hidden={isCompact}>{inviteUserButton.label}</span>
			</button>
		</li>

		<!-- Liens de navigation secondaires -->
		{#each confMenuItems as item (item.label)}
			{@render renderMenuItem(item)}
		{/each}
	</ul>
</div>

<style>
	/* Si le sous-menu est en mode compact, on supprime la marge */
	.compact-subitem {
		margin-inline-start: 0;
		padding-inline-start: 0;
	}

	.compact-subitem li {
		scale: 0.9;
	}

	.compact-subitem li li {
		scale: 0.9;
	}

	/* Supprime la fine bordure gauche en mode compact */
	.compact-subitem:before {
		display: none;
	}
</style>
