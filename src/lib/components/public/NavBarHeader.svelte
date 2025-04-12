<script lang="ts">
	import { Sun, Moon, Menu } from 'lucide-svelte';
	import type { NavbarHeaderType } from '$lib/types/theme.d';

	interface Props {
		siteName: string;
		url: string;
		config: NavbarHeaderType;
		toggleThemeMode: () => void;
		toggleSidebar: () => void;
	}

	let { siteName, url, config, toggleThemeMode, toggleSidebar }: Props = $props();
	let menuButtonClass = $derived(
		`cursor-pointer mx-4 btn-ghost btn-square lg:hidden ${config.linkClass?.join(' ')}`
	);
</script>

<div class="flex flex-col {config.isFixed ? ' sticky top-0 z-50' : ''}">
	<div
		class="navbar
		{config.size}"
	>
		<div class="navbar-start">
			<button
				type="button"
				aria-label="Ouvrir/Fermer menu"
				class="{menuButtonClass} "
				onclick={toggleSidebar}
			>
				<Menu />
				<!-- Optionnel: on pourrait changer l'icône si la sidebar est ouverte, ex: import { X } from 'lucide-svelte'; -->
				<!-- {#if isSidebarOpen} <X /> {:else} <Menu /> {/if} -->
			</button>
			<a href="/{url}" class="ps-4 {config.titleClass.join(' ')}">
				{siteName}
			</a>
		</div>

		<div class="navbar-center lg:navbar-start"></div>

		<div class="navbar-end me-4">
			<label class="swap swap-rotate {config.linkClass?.join(' ')}">
				<!-- this hidden checkbox controls the state -->
				<input type="checkbox" onclick={toggleThemeMode} aria-label="Changer le thème" />

				<Moon class="swap-on h-5 w-5 fill-current" />
				<Sun class="swap-off h-5 w-5 fill-current" />
			</label>
		</div>
	</div>
</div>

<style>
	.shadow-b {
		box-shadow: 1px 4px 4px -1px rgba(0, 0, 0, 0.3);
	}
</style>
