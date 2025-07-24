<script lang="ts">
	// Composants
	import HeaderBar from "$lib/components/HeaderBar.svelte";
	import UserMenuMobile from "$lib/components/UserMenuMobile.svelte";
	import Alert from "$lib/components/Alert.svelte";

	// Stores et utilitaires
	import { pb } from "$lib/pocketbase.svelte";
	import { userDb } from "$lib/shared/userDb.svelte";
	import { globalLogsStore } from "$lib/shared/globalLogsStore.svelte";
	import { globalMessagesStore } from "$lib/shared/globalMessagesStore.svelte";
	import { notificationSystem } from "$lib/shared/notificationSystem.svelte";
	import { loadingState } from "$lib/shared/states.svelte";
	import { screenDetector } from "$lib/utils/screen.svelte";

	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";

	let { children } = $props();

	// États locaux
	let isInitialized = $state(false);
	let initPromise = $state<Promise<void>>();

	let isMobile = $derived(screenDetector.isMobile);
	let mobileMenuOpen = $state(false);

	// Sidebar state pour compatibilité avec HeaderBar
	let sidebarState = $state({
		isCompact: false
	});

	// Fonction d'initialisation pour la page dashboard
	async function initializeDashboard() {
		try {
			if (!pb.authStore.isValid) {
				throw new Error("Session invalide");
			}

			// S'assurer que userDb est initialisé
			await userDb.initializeUserData();

			// Initialiser les nouveaux stores
			try {
				// Initialiser le store de logs global
				await globalLogsStore.init();

				// Récupérer les messages du dashboard
				await globalMessagesStore.messages;

				// Initialiser le système de notification
				await notificationSystem.init();

				console.log("[Dashboard] Stores initialisés avec succès");
			} catch (error) {
				console.warn("Impossible d'initialiser les stores du dashboard:", error);
				// Continue même en cas d'erreur
			}

			isInitialized = true;
		} catch (err) {
			console.error("Erreur lors de l'initialisation du dashboard:", err);
			// Rediriger vers login en cas d'erreur d'authentification
			pb.authStore.clear();
			userDb.logout();
			goto("/login");
		}
	}

	// Initialisation au montage
	onMount(() => {
		if (!pb.authStore.isValid) {
			goto("/login");
		} else {
			initPromise = initializeDashboard();
		}
	});

	// Fonctions pour HeaderBar
	async function handleRefresh() {
		try {
			// Forcer le rechargement des messages
			await globalMessagesStore.refresh;
			console.log("[Dashboard] Données rafraîchies");
		} catch (error) {
			console.error("Erreur lors du refresh:", error);
		}
	}

	async function handleLogout() {
		try {
			// Nettoyer les nouveaux stores
			await globalLogsStore.reset();
			globalMessagesStore.reset();
			notificationSystem.reset();

			// Nettoyer l'authentification
			pb.authStore.clear();
			userDb.logout();

			// Rediriger vers login
			goto("/login");
		} catch (error) {
			console.error("Erreur lors de la déconnexion:", error);
			// Forcer le nettoyage même en cas d'erreur
			await globalLogsStore.reset();
			globalMessagesStore.reset();
			notificationSystem.reset();
			pb.authStore.clear();
			userDb.logout();
			goto("/login");
		}
	}

	// Fonction pour toggle sidebar (pas vraiment utilisée ici mais requise par HeaderBar)
	function handleToggleSidebar() {
		if (isMobile) {
			mobileMenuOpen = !mobileMenuOpen;
		} else {
			sidebarState.isCompact = !sidebarState.isCompact;
		}
	}
</script>

<div data-theme="my-corporate">
	{#await initPromise}
		<div class="flex min-h-screen items-center justify-center">
			<div class="text-base-content space-y-8 text-center">
				<span class="loading loading-spinner loading-lg"></span>
				<div class="text-2xl font-semibold">Chargement...</div>
				<div class="">Initialisation du tableau de bord</div>
			</div>
		</div>
	{:then}
		{#if isInitialized}
			<div class="bg-base-100 flex min-h-screen flex-col">
				{#if !isMobile}
					<!-- HeaderBar pour desktop -->
					<HeaderBar
						{sidebarState}
						onToggleSidebar={handleToggleSidebar}
						onRefresh={handleRefresh}
						onLogout={handleLogout}
					/>
				{:else}
					<!-- Version mobile simplifiée -->
					<div class="navbar border-base-300 bg-base-100/80 border-b backdrop-blur-sm">
						<div class="flex-1">
							<span class="text-lg font-semibold">Oupla Event Manager</span>
						</div>
						<div class="flex-none">
							<UserMenuMobile onRefresh={handleRefresh} onLogout={handleLogout} />
						</div>
					</div>
				{/if}

				<!-- Contenu principal -->
				<main class={isMobile ? "" : "pt-16"}>
					{@render children()}
				</main>
			</div>
		{/if}

		<Alert />
	{:catch error}
		<script lang="ts">
			$effect(() => {
				const timer = setTimeout(() => {
					goto("/login");
				}, 4000);
				return () => clearTimeout(timer);
			});
		</script>
		<div class="bg-base-100 fixed inset-0 z-50 flex items-center justify-center">
			<div class="bg-base-200 rounded-lg p-6 text-center shadow-lg">
				<h2 class="text-fluid-xl text-error mb-4 font-bold">Erreur de session</h2>
				<p class="text-base-content mb-4">{error.message}</p>
				<p class="text-sm">Vous allez être redirigé vers la page de connexion.</p>
				<span class="loading loading-dots loading-md mt-4"></span>
			</div>
		</div>
	{/await}
</div>

{#if loadingState.is}
	<div transition:fade class="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
		<span class="loading loading-spinner loading-lg"></span>
	</div>
{/if}
