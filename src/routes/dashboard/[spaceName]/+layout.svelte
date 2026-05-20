<script lang="ts">
	// composants
	import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
	import DateSondageModal from "$lib/components/DateSondageModal.svelte";
	import EventModal from "$lib/components/EventModal.svelte";
	import MessageSheet from "$lib/components/MessageSheet.svelte";
	import TaskDialog from "$lib/components/TaskDialog.svelte";
	import Alert from "$lib/components/Alert.svelte";
	import InviteUserModal from "$lib/components/InviteUserModal.svelte";
	import HeaderBar from "$lib/components/HeaderBar.svelte";
	import MobileDock from "$lib/components/MobileDock.svelte";
	import MobileDrawer from "$lib/components/MobileDrawer.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";

	// stores et utilitaires
	import { pb } from "$lib/pocketbase.svelte";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import { messageManager } from "$lib/shared/messageStore.svelte";
	import { conversationDirectoryStore } from "$lib/shared/conversationDirectoryStore.svelte";
	import { getSpace, loadSpaceOptions } from "$lib/shared/spaceOptions.svelte";
	import { loadingState, messageSheet, modalState } from "$lib/shared/states.svelte";
	import { userDb } from "$lib/shared/userDb.svelte";
	import { navigationStore } from "$lib/shared/navigation.svelte";
	import { notificationSystem } from "$lib/shared/notificationSystem.svelte";
	import type { CurrentUser } from "$lib/types/types";
	import type { LayoutData } from "./$types";

	import { screenDetector } from "$lib/utils/screen.svelte";
	import { type UserCurrentSpace } from "$lib/types/types";

	import { goto } from "$app/navigation";
	import { setContext } from "svelte";
	import { fade } from "svelte/transition";

	// Props du layout - données chargées par +layout.ts
	let { data, children } = $props<{ data: LayoutData; children: any }>();

	// ::: states
	let isInitialized = $state(false);
	let initPromise = $state<Promise<void>>();

	// Construire currentSpace à partir des données chargées par +layout.ts
	let currentSpace: UserCurrentSpace = $derived({
		id: data.spaceId,
		name: data.spaceName,
		public_name: data.public_name,
		role: data.role
	});

	let currentUser = $state<CurrentUser>({
		id: "",
		username: "",
		role: ""
	});

	let isMobile = $derived(screenDetector.isMobile);
	let isMedium = $derived(screenDetector.isMedium);
	let isLarge = $derived(screenDetector.isLarge);

	let sidebarState = $state({
		isCompact: false
	});

	// 👉 State pour le drawer mobile
	let mobileDrawerOpen = $state(false);

	// Fonction d'initialisation adaptée pour le multi-espace
	async function initializeApp() {
		try {
			if (!pb.authStore.isValid) {
				throw new Error("Session invalide");
			}

			// S'assurer que userDb est initialisé (normalement déjà fait par +layout.ts)
			await userDb.initializeUserData();

			// Initialiser les stores principaux avec l'ID de l'espace courant
			await Promise.all([
				loadSpaceOptions(currentSpace.id),
				eventsStore.init({ spaceId: currentSpace.id, mode: "internal" }),
				messageManager.init(currentSpace.id)
			]);

			// Initialiser le store global des conversations s'il ne l'est pas déjà
			if (!conversationDirectoryStore.isInitialized) {
				await conversationDirectoryStore.init();
			}

			// Initialiser le contexte utilisateur
			currentUser = {
				id: userDb.id,
				username: userDb.current?.username || "",
				role: currentSpace.role
			};

			isInitialized = true;
		} catch (err) {
			console.error("Erreur contrôlée lors de l'initialisation :", err);
			// Nettoyer l'auth pour éviter les boucles de redirection
			pb.authStore.clear();
			userDb.logout();
			// Lancer une erreur qui sera affichée à l'utilisateur
			throw new Error(err instanceof Error ? err.message : "Une erreur inconnue est survenue.");
		}
	}

	// Ré-initialiser quand l'espace change (navigation entre espaces)
	$effect(() => {
		if (currentSpace?.id) {
			// Initialiser le store de navigation avec le nom de l'espace
			navigationStore.setSpaceName(currentSpace.name);

			isInitialized = false;
			initPromise = initializeApp();
		}
	});

	// ::: setContext - Fournir les données aux composants enfants
	$effect(() => {
		if (isInitialized) {
			setContext("currentSpace", currentSpace);
			setContext("currentUser", currentUser);
			setContext("tasks", getSpace.tasks);
		}
	});

	// Effet pour initialiser et mettre à jour la sidebar en fonction de la taille de l'écran
	$effect(() => {
		if (isMedium) {
			sidebarState.isCompact = true;
		} else if (isLarge) {
			sidebarState.isCompact = false;
		}
	});

	// ::: functions

	// forcer le rafraîchissement depuis pocketbase (reset idb eventsStore)
	async function handleRefresh() {
		try {
			await eventsStore.forceRefresh();
			// Optionnel : afficher un message de succès
		} catch (error) {
			// Gérer l'erreur (par exemple, afficher un message d'erreur)
			console.error("Erreur lors du refresh:", error);
		}
	}

	// 👉 Méthodes pour manipuler la sidebar avec gestion mobile
	let sidebarActions = {
		toggle() {
			if (isMobile) {
				// Mobile : bascule le drawer
				mobileDrawerOpen = !mobileDrawerOpen;
			} else {
				// Desktop : bascule entre compact et large
				sidebarState.isCompact = !sidebarState.isCompact;
			}
		},
		close() {
			if (isMobile) {
				mobileDrawerOpen = false;
			}
		}
	};

	async function handleLogout() {
		try {
			// 1. Détruire tous les stores
			await Promise.all([eventsStore.destroy(), messageManager.destroy()]);

			// Nettoyer les notifications
			notificationSystem.reset();

			// 2. Réinitialiser les états locaux
			isInitialized = false;

			currentUser = {
				id: "",
				username: "",
				role: ""
			};

			// 4. Nettoyer l'authentification
			pb.authStore.clear();
			userDb.logout(); // S'assurer que userDb est aussi nettoyé

			// 5. Rediriger vers la page de sélection d'espace plutôt que login
			goto("/dashboard");
		} catch (error) {
			console.error("Erreur lors de la déconnexion:", error);
			// Forcer un nettoyage même en cas d'erreur
			pb.authStore.clear();
			userDb.logout();
			goto("/dashboard");
		}
	}

	// 👉 Fonctions helper pour les actions du header/dock
	function handleToggleSidebar() {
		sidebarActions.toggle();
	}
</script>

<div data-theme="my-corporate">
	{#await initPromise}
		<div class="flex min-h-screen items-center justify-center">
			<div class="text-base-content space-y-8 text-center">
				<span class="loading loading-spinner loading-lg"></span>
				<div class="text-2xl font-semibold">Chargement...</div>
				<div class="">Initialisation de l'espace "{data.public_name}"</div>
			</div>
		</div>
	{:then}
		{#if isInitialized}
			<div class="bg-base-100 flex min-h-screen flex-col">
				{#if !isMobile}
					<HeaderBar
						{sidebarState}
						onToggleSidebar={handleToggleSidebar}
						onRefresh={handleRefresh}
						onLogout={handleLogout}
					/>
				{:else}
					<MobileDock
						onToggleSidebar={handleToggleSidebar}
						onRefresh={handleRefresh}
						onLogout={handleLogout}
					/>
					<MobileDrawer
						bind:isOpen={mobileDrawerOpen}
						onClose={() => {
							mobileDrawerOpen = false;
						}}
					/>
				{/if}

				<!-- Mode desktop avec sidebar classique -->
				<div id="global-app" class="min-h-screen">
					<!-- Sidebar desktop -->
					{#if !isMobile}
						<Sidebar {sidebarState} />
					{/if}
					<!-- Contenu principal -->
					<main
						class={[
							sidebarState.isCompact && !isMobile && "ml-20",
							!sidebarState.isCompact && !isMobile && "ml-64"
						]}
					>
						<div class="container mx-auto p-4 md:p-8" style="min-height: calc(100dvh - 100px);">
							{@render children()}
						</div>
					</main>
				</div>
			</div>
		{/if}

		<!-- Modales -->
		{#if modalState.event}
			<EventModal />
		{/if}
		{#if modalState.report}
			<!-- <ReportEvent /> -->
		{/if}
		{#if modalState.dateSondage}
			<DateSondageModal />
		{/if}
		{#if modalState.tasks.isOpen}
			<TaskDialog />
		{/if}
		{#if modalState.inviteUser}
			<InviteUserModal />
		{/if}
		{#if modalState.confirm.isOpen}
			<ConfirmDialog />
		{/if}
		{#if messageSheet.isOpen}
			<MessageSheet />
		{/if}

		<Alert />
	{:catch error}
		<script lang="ts">
			$effect(() => {
				const timer = setTimeout(() => {
					goto("/dashboard");
				}, 4000);
				return () => clearTimeout(timer);
			});
		</script>
		<div class="bg-base-100 fixed inset-0 z-50 flex items-center justify-center">
			<div class="bg-base-200 rounded-lg p-6 text-center shadow-lg">
				<h2 class="text-fluid-xl text-error mb-4 font-bold">Erreur de session</h2>
				<p class="text-base-content mb-4">{error.message}</p>
				<p class="text-sm">Vous allez être redirigé vers la sélection d'espace.</p>
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
