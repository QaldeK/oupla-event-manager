<script lang="ts">
	// composants
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import DateSondageModal from '$lib/components/DateSondageModal.svelte';
	import EventModal from '$lib/components/EventModal.svelte';
	import MessageSheet from '$lib/components/MessageSheet.svelte';
	// import ReportEvent from '$lib/components/ReportEvent.svelte';
	import TaskDialog from '$lib/components/TaskDialog.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	// store
	import { eventsStore } from '$lib/shared/eventsStore.svelte';
	import { messageStore } from '$lib/shared/messageStore.svelte';
	import { getSpace, loadSpaceOptions } from '$lib/shared/spaceOptions.svelte';
	import { userDb } from '$lib/shared/userDb.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import InviteUserModal from '$lib/components/InviteUserModal.svelte';
	import { pb } from '$lib/pocketbase.svelte';
	import { messageSheet, modalState } from '$lib/shared/states.svelte';
	import type { CurrentUser } from '$lib/types/types';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import { setContext } from 'svelte';

	// Icônes pour la sidebar
	import {
		AlertTriangle,
		Calendar,
		CalendarPlus,
		CalendarPlus2,
		CalendarSearch,
		Clock,
		LogOut,
		Mail,
		Menu,
		PanelLeftClose,
		RefreshCw,
		Settings,
		UserPlus,
		Users,
		CircleUserRound
	} from 'lucide-svelte';

	let { children } = $props();

	// initialisé dans $effect après isInitialized
	setContext('currentSpace', null);
	setContext('currentUser', null);
	setContext('tasks', null);

	// ::: states

	// XXX :  passer currentUser et currentSpace en simple let non reactive ?
	let isInitializing = $state(false);
	let isInitialized = $state(false);

	let initPromise = $state<Promise<void>>();
	let error = $state<Error | null>(null);
	let currentSpace = $state();
	let currentUser: CurrentUser = $state({}) as CurrentUser;

	let displayState = $state({
		isMobile: window.innerWidth < 640 // Initialisation basée sur la largeur initiale
	});

	let space = $state<{
		id: string;
		name: string;
		role: string;
		description?: string;
		since?: string;
	} | null>(null);

	let sidebarState = $state({
		isOpen: window.innerWidth >= 640,
		isCompact: false
	});

	// Fonction d'initialisation
	async function initializeApp() {
		if (isInitializing) return;
		isInitializing = true;

		try {
			// 1. Initialiser les données utilisateur
			const userData = await userDb.initializeUserData();

			currentSpace = userDb.currentSpace;
			if (!currentSpace?.id) {
				throw new Error('Vous êtes inscrit à aucun espace');
			}

			// Initialiser les stores en parallèle
			await Promise.all([
				loadSpaceOptions(currentSpace.id),
				eventsStore.init({ spaceId: currentSpace.id }),
				messageStore.init(currentSpace.id)
			]);

			// Initialiser le contexte
			currentUser = {
				id: pb.authStore.record?.id,
				username: pb.authStore.record?.username,
				role: pb.authStore.record?.role
			};
			isInitialized = true;
		} catch (err) {
			console.error("Erreur lors de l'initialisation :", err);
			// Nettoyer l'auth
			pb.authStore.clear();
			// Lancer une erreur qui sera affichée à l'utilisateur
			throw new Error('Votre session a expiré. Veuillez vous reconnecter.');
		}
	}

	// ::: effect
	// Lancer l'initialisation
	// XXX utilisation de effect.pre ?
	$effect.pre(() => {
		if (!pb.authStore.isValid) {
			goto('/login');
		}
		initPromise = initializeApp();
	});

	// :::_setContext
	$effect(() => {
		if (isInitialized) {
			setContext('currentSpace', currentSpace);
			setContext('currentUser', currentUser);
			setContext('tasks', getSpace.tasks);
		}
	});

	// Effet pour initialiser et mettre à jour la sidebar en fonction de la taille de l'écran
	$effect(() => {
		const updateSidebarState = () => {
			const isMobile = window.matchMedia('(max-width: 639px)').matches;
			const isMedium = window.matchMedia('(min-width: 640px) and (max-width: 1023px)').matches;
			const isLarge = window.matchMedia('(min-width: 1024px)').matches;

			if (isMobile) {
				sidebarState.isOpen = false;
				sidebarState.isCompact = false;
			} else if (isMedium) {
				sidebarState.isOpen = true;
				sidebarState.isCompact = true;
			} else if (isLarge) {
				sidebarState.isOpen = true;
				sidebarState.isCompact = false;
			}
		};

		// Initialisation
		updateSidebarState();

		// Écouter les changements de taille d'écran
		window.addEventListener('resize', updateSidebarState);

		// Retourne une fonction de nettoyage
		return () => {
			window.removeEventListener('resize', updateSidebarState);
		};
	});

	// ::: function

	// forcer le rachraichissement depuis pocketbase (reset idb eventsStore)
	async function handleRefresh() {
		try {
			await eventsStore.forceRefresh();
			// Optionnel : afficher un message de succès
		} catch (error) {
			// Gérer l'erreur (par exemple, afficher un message d'erreur)
			console.error('Erreur lors du refresh:', error);
		}
	}
	// Méthodes pour manipuler la sidebar
	let sidebarActions = {
		toggle() {
			if (window.matchMedia('(max-width: 639px)').matches) {
				// mobile : bascule ouvert/fermé
				sidebarState.isOpen = !sidebarState.isOpen;
				sidebarState.isCompact = false;
			} else {
				// Sur desktop : bascule entre compact et large
				sidebarState.isCompact = !sidebarState.isCompact;
				sidebarState.isOpen = true;
			}
		}
	};

	// Helper pour construire les URLs avec les filtres
	function getFilterUrl(filters: { status?: string }) {
		const url = new URL('/dashboard/events', window.location.origin);
		Object.entries(filters).forEach(([key, value]) => {
			if (value) url.searchParams.set(key, value);
		});
		return url.toString();
	}

	async function handleLogout() {
		try {
			// 1. Détruire tous les stores
			await Promise.all([
				eventsStore.clearAndDestroy(), 
				messageStore.clearAndDestroy()
			]);

			// 2. Réinitialiser les états locaux
			isInitialized = false;
			isInitializing = false;
			currentSpace = null;
			currentUser = {} as CurrentUser;
			error = null;

			// 4. Nettoyer l'authentification
			pb.authStore.clear();
			userDb.logout();  // S'assurer que userDb est aussi nettoyé

			// 5. Rediriger
			goto('/login');
		} catch (error) {
			console.error('Erreur lors de la déconnexion:', error);
			// Forcer un nettoyage même en cas d'erreur
			pb.authStore.clear();
			userDb.logout();
			goto('/login');
		}
	}
</script>

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
						<h2 class="mb-4 text-xl font-bold text-red-600">Erreur d'initialisation</h2>
						<p class="text-base-content">{error.message}</p>
						<button class="btn btn-primary" onclick={() => goto('/login')}>
							Retour à la connexion
						</button>
					</div>
				</div>
			{:else}
				<!-- Top nav -->
				<header class="navbar min-h-0 bg-neutral text-base-300 fixed top-0 right-0 left-0 z-50 shadow-sm">
					<div class="flex-none">
						<button class="btn btn-square btn-ghost" onclick={sidebarActions.toggle}>
							{#if sidebarState.isOpen && !sidebarState.isCompact}
								<PanelLeftClose size={24} />
							{:else}
								<Menu size={24} />
							{/if}
						</button>
					</div>

					<div class="flex-1 flex justify-center">
						<a href="/dashboard" class="text-lg"
							>Oupla - {currentSpace.name} - {currentUser.username}</a
						>
					</div>

					<div class="flex-none gap-2">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								<button class="btn btn-outline"><CircleUserRound />
 									{currentUser.username} </button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content class="menu bg-base-200 rounded-box w-56">
								<DropdownMenu.Label class="menu-title">Mon compte</DropdownMenu.Label>
								<DropdownMenu.Separator />
								<DropdownMenu.Group>
									<DropdownMenu.Item onclick={() => goto('/dashboard/config')} class="menu-item">
										<Settings class="mr-2 h-4 w-4" />
										<span>Paramètres</span>
									</DropdownMenu.Item>
									<DropdownMenu.Item onclick={handleRefresh} class="menu-item">
										<RefreshCw class="mr-2 h-4 w-4" />
										<span>Forcer le rafraîchissement</span>
									</DropdownMenu.Item>
								</DropdownMenu.Group>
								<DropdownMenu.Separator />
								{#if userDb.current?.memberOf && userDb.current.memberOf.length > 1}
									<DropdownMenu.Sub>
										<DropdownMenu.SubTrigger>
											<Users class="mr-2 h-4 w-4" />
											<span>Changer d'espace</span>
										</DropdownMenu.SubTrigger>
										<DropdownMenu.SubContent>
											{#each userDb.memberOf as space (space.id)}
												<DropdownMenu.Item>
													{space.name}
												</DropdownMenu.Item>
											{/each}
										</DropdownMenu.SubContent>
									</DropdownMenu.Sub>
									<DropdownMenu.Separator />
								{/if}
								<DropdownMenu.Item onclick={handleLogout} class="text-red-600">
									<LogOut class="mr-2 h-4 w-4" />
									<span>Déconnexion</span>
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</header>

				<div class="flex min-h-screen pt-16">
					<!-- Responsive sidebar -->

					<aside
						id="logo-sidebar"
						class="bg-base-200 fixed top-0 left-0 z-40 h-[calc(100vh-4rem)] overflow-hidden overflow-x-hidden transition-all duration-300
					{sidebarState.isOpen ? 'translate-x-0' : '-translate-x-full'}
					{!displayState.isMobile && sidebarState.isCompact ? 'w-20' : 'w-64 '}
					"
						aria-label="Sidebar"
					>
						<div class="mt-24 flex h-full flex-col overflow-y-auto p-1">
							<button
								onclick={() => (modalState.event = true)}
								class="btn btn-primary mb-4 w-full {sidebarState.isCompact ? 'btn-square' : ''}"
							>
								{#if sidebarState.isCompact}
									<CalendarPlus size={24} />
								{:else}
									Ajouter un événement
								{/if}
							</button>

							<ul class="menu menu-lg rounded-box bg-base-100 gap-3">
								<li>
									<a
										href="/dashboard/events"
										class:bg-primary-content={!page.url.searchParams.has('status')}
										class="flex items-center gap-2"
									>
										<Calendar size={24} />
										<span class:hidden={sidebarState.isCompact}>Événements</span>
									</a>
								</li>

								<li>
									<a
										href={getFilterUrl({ status: 'confirmed' })}
										class:bg-primary-content={page.url.searchParams.get('status') === 'confirmed'}
									>
										<Clock size={24} />
										<span class:hidden={sidebarState.isCompact}>Programmés</span>
									</a>
								</li>

								<!-- Section en attente avec style spécial -->
								<li>
									<a
										href={getFilterUrl({ status: 'pending' })}
										class:bg-primary-content={page.url.searchParams.get('status') === 'pending'}
									>
										<Clock size={24} class="text-warning" />
										<span class:hidden={sidebarState.isCompact}>En attentes</span>
									</a>
									<ul class:hidden={sidebarState.isCompact}>
										<li>
											<a
												href={getFilterUrl({ status: 'eventsWithoutDate' })}
												class:bg-primary-content={page.url.searchParams.get('status') ===
													'eventsWithoutDate'}
											>
												<Calendar size={24} class="text-error" />
												<span class:hidden={sidebarState.isCompact}>Sans date</span>
											</a>
										</li>
										<li>
											<a
												href={getFilterUrl({ status: 'eventsWithoutOrganizers' })}
												class:bg-primary-content={page.url.searchParams.get('status') ===
													'eventsWithoutOrganizers'}
											>
												<Users size={24} class="text-error" />
												<span class:hidden={sidebarState.isCompact}>Sans organisateur·ices</span>
											</a>
										</li>
										<li>
											<a
												href={getFilterUrl({ status: 'eventsWithSondage' })}
												class:bg-primary-content={page.url.searchParams.get('status') ===
													'eventsWithSondage'}
											>
												<CalendarSearch size={24} class="text-primary" />
												<span class:hidden={sidebarState.isCompact}>Sondages en cours</span>
											</a>
										</li>
									</ul>
								</li>

								<li>
									<a
										href={getFilterUrl({ status: 'conflicts' })}
										class:bg-primary-content={page.url.searchParams.get('status') === 'conflicts'}
									>
										<AlertTriangle size={24} class="text-error" />
										<span class:hidden={sidebarState.isCompact}>En conflits</span>
									</a>
								</li>

								<li>
									<a
										href="/dashboard/events/recurrent"
										class:bg-primary-content={page.url.pathname === '/dashboard/events/recurrent'}
									>
										<RefreshCw size={24} />
										<span class:hidden={sidebarState.isCompact}>Récurrents</span>
									</a>
								</li>

								<li>
									<a
										href="/dashboard/newsletter"
										class:bg-primary-content={page.url.pathname === '/dashboard/newsletter'}
									>
										<Mail size={24} />
										<span class:hidden={sidebarState.isCompact}>Newsletter</span>
									</a>
								</li>
									<li>
										<a
											href="/dashboard/pads"
											class:bg-primary-content={page.url.pathname.startsWith("/dashboard/pads")}
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
												<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
												<polyline points="14 2 14 8 20 8"/>
												<path d="M10.4 12.6a1 1 0 0 1 3.2 0"/>
												<path d="M9 11h.01"/>
												<path d="M15 11h.01"/>
											</svg>
											<span class:hidden={sidebarState.isCompact}>Documents collaboratifs</span>
										</a>
									</li>
							</ul>

							<!-- Section du bas -->
							<ul class="menu menu-lg rounded-box bg-base-100 mt-4">
								<li>
									<a href="/" onclick={() => (modalState.inviteUser = true)}>
										<UserPlus size={24} />
										<span class:hidden={sidebarState.isCompact}>Inviter</span>
									</a>
								</li>
								<li>
									<a
										href="/dashboard/config"
										class:bg-primary-content={page.url.pathname === '/dashboard/config'}
									>
										<Settings size={24} />
										<span class:hidden={sidebarState.isCompact}>Paramètres</span>
									</a>
								</li>
							</ul>
						</div>
					</aside>

					<!-- Content -->
					<main
						class="mt-16 flex-1 overflow-y-auto p-4 transition-all duration-300
					{sidebarState.isOpen && !sidebarState.isCompact ? 'ml-72' : ''}
					{sidebarState.isOpen && sidebarState.isCompact ? 'ml-20' : ''}"
					>
						{@render children()}
						<!--
		{#if $benevoleModal}
		<CreateBenevole />
		{/if} -->
						{#if modalState.event}
							<EventModal />
						{/if}
						{#if modalState.report}
							<!-- <Modal>
						<ReportEvent />
					</Modal> -->
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
					</main>
				</div>
			{/if}
		</div>
	{/if}
{:catch error}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<div class="rounded-lg bg-white p-6 shadow-lg">
			<h2 class="mb-4 text-xl font-bold text-red-600">Session expirée</h2>
			<p class="text-base-content">{error.message}</p>
			<button class="btn btn-primary" onclick={() => goto('/login')}>
				Retour à la connexion
			</button>
		</div>
	</div>
{/await}

<!-- <style lang="postcss">
  @reference "tailwindcss";
	.active {
		 "bg-base-300";
	}
</style> -->
