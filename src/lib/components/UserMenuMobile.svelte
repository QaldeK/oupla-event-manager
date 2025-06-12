<script lang="ts">
	import { goto } from "$app/navigation";
	import { userDb } from "$lib/shared/userDb.svelte.js";
	import { CircleUserRound, LogOut, RefreshCw, Settings, Users, X } from "lucide-svelte";
	import { fade } from "svelte/transition";
	import * as Drawer from "$lib/components/ui/drawer";

	interface Props {
		onRefresh: () => Promise<void>;
		onLogout: () => Promise<void>;
		class?: string;
	}

	let { onRefresh, onLogout, class: className = "" }: Props = $props();

	let isOpen = $state(false);

	function toggleUserMenu() {
		isOpen = !isOpen;
	}

	function closeUserMenu() {
		isOpen = false;
	}

	function handleRefresh() {
		onRefresh();
		closeUserMenu();
	}

	function handleLogout() {
		onLogout();
		closeUserMenu();
	}

	function handleSettings() {
		goto("/dashboard/config");
		closeUserMenu();
	}
</script>

<div class="flex flex-col items-center {className}">
	<!-- Bouton utilisateur -->
	<button class="btn btn-ghost btn-circle" onclick={toggleUserMenu} aria-label="Menu utilisateur">
		<CircleUserRound size={20} />
	</button>
</div>

<!-- Drawer pour le menu utilisateur -->
<Drawer.Root bind:open={isOpen} direction="bottom">
	<Drawer.Content
		class="bg-base-100 h-auto max-h-[calc(100vh-4rem)] flex-col"
		data-theme="my-corporate"
	>
		<Drawer.Header class="bg-base-100 border-base-300 border-b pb-2">
			<div class="flex items-center justify-between">
				<div class="text-base-content text-lg font-semibold">Mon compte</div>
				<button class="btn btn-ghost btn-sm btn-circle" onclick={closeUserMenu}>
					<X size={16} />
				</button>
			</div>
			{#if userDb.current?.username}
				<div class="text-base-content text-sm font-medium">
					@{userDb.current.username}
				</div>
			{/if}
		</Drawer.Header>

		<!-- Contenu du menu -->
		<div class="flex-1 overflow-y-auto">
			<div class="p-4">
				<!-- Informations utilisateur -->

				<!-- Actions principales -->
				<div class="space-y-2">
					<button
						onclick={handleSettings}
						class="btn btn-ghost w-full justify-start gap-3"
						transition:fade
					>
						<Settings class="h-5 w-5" />
						<span>Paramètres</span>
					</button>

					<button
						onclick={handleRefresh}
						class="btn btn-ghost w-full justify-start gap-3"
						transition:fade
					>
						<RefreshCw class="h-5 w-5" />
						<span>Actualiser</span>
					</button>
				</div>

				<!-- Changement d'espace (si plusieurs espaces) -->
				{#if userDb.current?.memberOf && userDb.current.memberOf.length > 1}
					<div class="divider my-4"></div>
					<div class="mb-2">
						<h3 class="text-base-content/70 text-sm font-medium">Espaces</h3>
					</div>
					<div class="space-y-2">
						{#each userDb.memberOf as space (space.id)}
							<button class="btn btn-ghost w-full justify-start gap-3" transition:fade>
								<Users class="h-5 w-5" />
								<span>{space.name}</span>
							</button>
						{/each}
					</div>
				{/if}

				<!-- Déconnexion -->
				<div class="divider my-4"></div>
				<button
					onclick={handleLogout}
					class="btn btn-ghost text-error hover:bg-error/10 w-full justify-start gap-3"
					transition:fade
				>
					<LogOut class="h-5 w-5" />
					<span>Déconnexion</span>
				</button>
			</div>
		</div>

		<!-- Footer -->
		<div class="border-base-300 border-t p-3">
			<button class="btn btn-ghost btn-sm w-full text-xs" onclick={closeUserMenu}> Fermer </button>
		</div>
	</Drawer.Content>
</Drawer.Root>
