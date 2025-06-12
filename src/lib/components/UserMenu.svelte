<script lang="ts">
	import { goto } from "$app/navigation";
	import { userDb } from "$lib/shared/userDb.svelte.js";
	import PortalDropdown from "$lib/components/ui/PortalDropdown.svelte";
	import { CircleUserRound, LogOut, RefreshCw, Settings, Users } from "lucide-svelte";

	interface Props {
		onRefresh: () => Promise<void>;
		onLogout: () => Promise<void>;
		/** Position du dropdown (pour mobile vs desktop) */
		dropdownPosition?: "top" | "bottom";
		/** Afficher le texte du nom d'utilisateur à côté de l'icône */
		showUsername?: boolean;
		/** Classes CSS supplémentaires pour le bouton */
		buttonClass?: string;
		/** Slot pour personnaliser le contenu du bouton */
		children?: import("svelte").Snippet;
	}

	let {
		onRefresh,
		onLogout,
		dropdownPosition = "bottom",
		showUsername = false,
		buttonClass = "btn btn-outline",
		children
	}: Props = $props();

	let isDropdownOpen = $state(false);

	function handleRefresh() {
		onRefresh();
		isDropdownOpen = false;
	}

	function handleLogout() {
		onLogout();
		isDropdownOpen = false;
	}

	function handleSettings() {
		goto("/dashboard/config");
		isDropdownOpen = false;
	}
</script>

<!-- Menu utilisateur avec dropdown personnalisé -->
<PortalDropdown
	bind:isOpen={isDropdownOpen}
	position={dropdownPosition}
	align="right"
	width="w-56"
	triggerClass={buttonClass}
	contentClass="bg-base-200"
	headerTitle="Mon compte"
	showCloseButton={false}
>
	{#snippet trigger()}
		{#if children}
			{@render children()}
		{:else}
			<CircleUserRound size={24} />
			{#if showUsername && userDb.current?.username}
				<span class="ml-2">{userDb.current.username}</span>
			{/if}
		{/if}
	{/snippet}

	{#snippet content()}
		<div class="menu p-2">
			<!-- Actions principales -->
			<ul>
				<li>
					<button onclick={handleSettings} class="flex items-center gap-2">
						<Settings class="h-4 w-4" />
						<span>Paramètres</span>
					</button>
				</li>

				<li>
					<button onclick={handleRefresh} class="flex items-center gap-2">
						<RefreshCw class="h-4 w-4" />
						<span>Actualiser</span>
					</button>
				</li>
			</ul>

			<!-- Divider -->
			<div class="divider my-1"></div>

			<!-- Changement d'espace (si plusieurs espaces) -->
			{#if userDb.current?.memberOf && userDb.current.memberOf.length > 1}
				<div class="menu-title">
					<span>Espaces</span>
				</div>
				<ul>
					{#each userDb.memberOf as space (space.id)}
						<li>
							<button class="flex items-center gap-2">
								<Users class="h-4 w-4" />
								<span>{space.name}</span>
							</button>
						</li>
					{/each}
				</ul>
				<div class="divider my-1"></div>
			{/if}

			<!-- Déconnexion -->
			<ul>
				<li>
					<button onclick={handleLogout} class="text-error flex items-center gap-2">
						<LogOut class="h-4 w-4" />
						<span>Déconnexion</span>
					</button>
				</li>
			</ul>
		</div>
	{/snippet}
</PortalDropdown>
