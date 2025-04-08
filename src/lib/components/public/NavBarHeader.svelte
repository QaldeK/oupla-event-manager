<script lang="ts">
	import { Sun, Moon } from 'lucide-svelte';

	export interface NavBarHeaderConfig {
		title: string;
		titleClass: string[];
		hasMenu: boolean;
		links: {
			title: string;
			url: string;
		}[];
		linkClass: string[];
		toggleThemeMode: () => void;
		bgClass: string;
		size: string;
		isFixed: boolean;
	}

	interface Props {
		config: NavBarHeaderConfig;
	}

	let { config }: Props = $props();
</script>

<div class=" {config.isFixed ? ' sticky top-0 z-50' : ''}">
	<div
		class="navbar shadow-b
		{config.size} {config.bgClass}"
	>
		<div class="navbar-start ms-14">
			<span class={config.titleClass.join(' ')}>
				{config.title}
			</span>
		</div>

		<div class="navbar-center lg:navbar-start {config.hasMenu ? 'lg:ml-0' : ''}">
			<!-- 👉 Utiliser config.title -->

			<!-- FIXIT link rel -->
			<ul tabindex="0" class="menu menu-horizontal rounded-box z-[1]">
				{#each config.links as link (link.url)}
					<li><a href={link.url} class={config.linkClass.join(' ')}>{link.title}</a></li>
				{/each}
			</ul>
		</div>

		<div class="navbar-end me-4">
			<label class="swap swap-rotate {config.linkClass}">
				<!-- this hidden checkbox controls the state -->
				<input type="checkbox" onclick={config.toggleThemeMode} aria-label="Changer le thème" />

				<!-- sun icon -->
				<Sun class="swap-on h-5 w-5 fill-current" />

				<!-- moon icon -->
				<Moon class="swap-off h-5 w-5 fill-current" />
			</label>
		</div>
	</div>
</div>

<style>
	.shadow-b {
		box-shadow: 1px 4px 4px -1px rgba(0, 0, 0, 0.3);
	}
</style>
