<script lang="ts">
	import NotificationBell from "$lib/components/NotificationBell.svelte";
	import UserMenu from "$lib/components/UserMenu.svelte";
	import { Menu, PanelLeftClose } from "lucide-svelte";
	import { getContext } from "svelte";
	import { type UserCurrentSpace } from "$lib/types/types";

	interface Props {
		sidebarState: {
			isCompact: boolean;
		};
		onToggleSidebar: () => void;
		onRefresh: () => Promise<void>;
		onLogout: () => Promise<void>;
	}

	let { sidebarState, onToggleSidebar, onRefresh, onLogout }: Props = $props();

	// Récupérer le contexte de l'espace courant (peut être null sur /dashboard)
	const currentSpace: UserCurrentSpace | null = getContext("currentSpace");
</script>

<header class="navbar border-base-300 bg-base-100/80 fixed top-0 z-40 border-b backdrop-blur-sm">
	<div class="flex-none">
		<button class="btn btn-square btn-ghost" onclick={onToggleSidebar}>
			{#if !sidebarState.isCompact}
				<PanelLeftClose size={24} />
			{:else}
				<Menu size={24} />
			{/if}
		</button>
	</div>

	<div class="flex flex-1 justify-center">
		<a
			href="/dashboard{currentSpace?.name ? `/${currentSpace.name}` : ''}"
			class="text-lg font-semibold">Oupla Event Manager</a
		>
	</div>

	<div class="flex gap-2">
		<NotificationBell />
		<UserMenu {onRefresh} {onLogout} showUsername={true} />
	</div>
</header>
