<script lang="ts">
	import NotificationBellMobile from "$lib/components/NotificationBellMobile.svelte";
	import UserMenu from "$lib/components/UserMenu.svelte";
	import { CircleUserRound, Menu } from "lucide-svelte";

	interface Props {
		onToggleSidebar: () => void;
		onRefresh: () => Promise<void>;
		onLogout: () => Promise<void>;
	}

	let { onToggleSidebar, onRefresh, onLogout }: Props = $props();
</script>

<!-- Dock DaisyUI fixé en bas de l'écran -->
<div class="dock">
	<!-- Bouton Menu pour ouvrir la sidebar -->
	<button onclick={onToggleSidebar} aria-label="Ouvrir le menu">
		<Menu size={24} />
	</button>

	<NotificationBellMobile />

	<!-- Menu utilisateur intégré dans le dock -->
	<UserMenu {onRefresh} {onLogout} dropdownPosition="top"></UserMenu>
</div>
