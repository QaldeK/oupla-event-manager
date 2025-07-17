<script lang="ts">
	// composants
	import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
	import DateSondageModal from "$lib/components/DateSondageModal.svelte";
	import EventModal from "$lib/components/EventModal.svelte";
	import MessageSheet from "$lib/components/MessageSheet.svelte";
	// import ReportEvent from '$lib/components/ReportEvent.svelte';
	import TaskDialog from "$lib/components/TaskDialog.svelte";
	// store
	import Alert from "$lib/components/Alert.svelte";
	import InviteUserModal from "$lib/components/InviteUserModal.svelte";
	import HeaderBar from "$lib/components/HeaderBar.svelte";
	import MobileDock from "$lib/components/MobileDock.svelte";
	import MobileDrawer from "$lib/components/MobileDrawer.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";
	// 👉 Utilitaire pour la détection d'écran
	import { pb } from "$lib/pocketbase.svelte";
	import { eventsStore } from "$lib/shared/eventsStore.svelte";
	import { messageStore } from "$lib/shared/messageStore.svelte";
	import { getSpace, loadSpaceOptions } from "$lib/shared/spaceOptions.svelte";
	import { loadingState, messageSheet, modalState } from "$lib/shared/states.svelte";
	import { userDb } from "$lib/shared/userDb.svelte";
	import type { CurrentUser } from "$lib/types/types";
	import { clearNotifications, loadNotifications } from "$lib/utils/notificationsAndLogs";
	import { screenDetector } from "$lib/utils/screen.svelte";

	import { goto } from "$app/navigation";

	import { setContext } from "svelte";

	import { fade } from "svelte/transition";

	let { children } = $props();

	// ::: states

	// XXX :  passer currentUser et currentSpace en simple let non reactive ?
	let isInitializing = $state(false);
	let isInitialized = $state(false);

	let initPromise = $state<Promise<void>>();
	let error = $state<Error | null>(null);
	let currentSpace = $state<{
		id: string;
		name: string;
		role: string;
		description?: string;
		since?: string;
	} | null>(null);
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

	// Fonction d'initialisation
	async function initializeApp() {
		if (isInitializing) return;
		isInitializing = true;

		try {
			// 1. Initialiser les données utilisateur
			await userDb.initializeUserData();

			const spaceData = userDb.currentSpace;
			if (!spaceData || typeof spaceData === "string") {
				throw new Error("Vous êtes inscrit à aucun espace");
			}
			currentSpace = spaceData;

			// Initialiser les stores principaux en parallèle
			await Promise.all([
				loadSpaceOptions(currentSpace.id),
				eventsStore.init({ spaceId: currentSpace.id, mode: "internal" })
			]);

			// Initialiser le contexte
			currentUser = {
				id: pb.authStore.record?.id || "",
				username: pb.authStore.record?.username || "",
				role: pb.authStore.record?.role || ""
			};
			isInitialized = true;
		} catch (err) {
			console.error("Erreur lors de l'initialisation :", err);
			// Nettoyer l'auth
			pb.authStore.clear();
			// Lancer une erreur qui sera affichée à l'utilisateur
			throw new Error("Votre session a expiré. Veuillez vous reconnecter.");
		}
	}

	// Chargement différé des stores secondaires après l'initialisation principale
	$effect(() => {
		if (isInitialized && currentSpace?.id) {
			// Délai de 1 seconde pour ne pas impacter l'expérience utilisateur
			setTimeout(() => {
				// Chargement différé du messageStore et des notifications
				if (currentSpace?.id) {
					messageStore.init(currentSpace.id);
					loadNotifications(currentSpace.id);
				}
			}, 1000);
		}
	});

	// ::: effect
	// Lancer l'initialisation
	// XXX utilisation de effect.pre ?
	$effect.pre(() => {
		if (!pb.authStore.isValid) {
			goto("/login");
		}
		initPromise = initializeApp();
	});

	// :::_setContext
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

	// ::: function

	// forcer le rachraichissement depuis pocketbase (reset idb eventsStore)
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
			await Promise.all([eventsStore.clearAndDestroy(), messageStore.clearAndDestroy()]);

			// Nettoyer les notifications
			clearNotifications();

			// 2. Réinitialiser les états locaux
			isInitialized = false;
			isInitializing = false;
			currentSpace = null;
			currentUser = {
				id: "",
				username: "",
				role: ""
			};
			error = null;

			// 4. Nettoyer l'authentification
			pb.authStore.clear();
			userDb.logout(); // S'assurer que userDb est aussi nettoyé

			// 5. Rediriger
			goto("/login");
		} catch (error) {
			console.error("Erreur lors de la déconnexion:", error);
			// Forcer un nettoyage même en cas d'erreur
			pb.authStore.clear();
			userDb.logout();
			goto("/login");
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
			<div class="text-center">
				<div class="mb-4 text-2xl font-semibold">Chargement...</div>
				<div class="text-base-content">Initialisation de votre espace</div>
			</div>
		</div>
	{:then}
		{#if isInitialized}
			<div class="bg-base-100 flex min-h-screen flex-col">
				{#if error}
					<div class="fixed inset-0 z-50 flex items-center justify-center">
						<div class="rounded-lg bg-white p-6 shadow-lg">
							<h2 class="text-fluid-xl mb-4 font-bold text-red-600">Erreur d'initialisation</h2>
							<p class="text-base-content">{error.message}</p>
							<button class="btn btn-primary" onclick={() => goto("/login")}>
								Retour à la connexion
							</button>
						</div>
					</div>
				{:else}
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
					<div id="global-app" class="min-h-screen {isMobile ? 'pb-20' : 'pt-16'}">
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
				{/if}
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
		<div class="fixed inset-0 z-50 flex items-center justify-center">
			<div class="rounded-lg bg-white p-6 shadow-lg">
				<h2 class="text-fluid-xl mb-4 font-bold text-red-600">Session expirée</h2>
				<p class="text-base-content">{error.message}</p>
				<button class="btn btn-primary" onclick={() => goto("/login")}>
					Retour à la connexion
				</button>
			</div>
		</div>
	{/await}
</div>
{#if loadingState.is}
	<div transition:fade class="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
		<span class="loading loading-spinner loading-lg"></span>
	</div>
{/if}
