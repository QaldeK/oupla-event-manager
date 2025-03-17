<script lang="ts">
	// composants
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import DateSondageModal from '$lib/components/DateSondageModal.svelte';
	import EventModal from '$lib/components/EventModal.svelte';
	import MessageSheet from '$lib/components/MessageSheet.svelte';
	// import ReportEvent from '$lib/components/ReportEvent.svelte';
	import TaskDialog from '$lib/components/TaskDialog.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	// store
	import { eventsStore } from '$lib/shared/eventsStore.svelte';
	import { messageStore } from '$lib/shared/messageStore.svelte';
	import { getSpace, loadSpaceOptions } from '$lib/shared/spaceOptions.svelte';
	import { userDb } from '$lib/shared/userDb.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import InviteUserModal from '$lib/components/InviteUserModal.svelte';
	import { Button } from '$lib/components/ui/button';
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
		Users
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
			// Destruction des stores de manière asynchrone
			await Promise.all([eventsStore.clearAndDestroy(), messageStore.clearAndDestroy()]);

			// Effacer les données d'authentification
			pb.authStore.clear();

			// Rediriger vers login
			goto('/login');
		} catch (error) {
			console.error('Erreur lors de la déconnexion:', error);
			goto('/login');
		}
	}

	// $inspect(messageSheet);
</script>

{#await initPromise}
	<div class="flex min-h-screen items-center justify-center">
		<div class="text-center">
			<div class="mb-4 text-2xl font-semibold">Chargement...</div>
			<div class="text-gray-600">Initialisation de votre espace</div>
		</div>
	</div>
{:then}
	{#if isInitialized}
		<div class="flex h-full w-full bg-gray-100">
			{#if error}
				<div class="fixed inset-0 z-50 flex items-center justify-center">
					<div class="rounded-lg bg-white p-6 shadow-lg">
						<h2 class="mb-4 text-xl font-bold text-red-600">Erreur d'initialisation</h2>
						<p class="text-gray-700">{error.message}</p>
						<button
							class="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
							onclick={() => goto('/login')}
						>
							Retour à la connexion
						</button>
					</div>
				</div>
			{:else}
				<!-- Top nav -->
				<header
					class="fixed top-0 right-0 left-0 z-50 flex w-full items-center justify-between bg-gray-800 p-2 text-white"
				>
					<!-- Bouton pour les écrans < md -->
					<button
						data-drawer-target="logo-sidebar"
						data-drawer-toggle="logo-sidebar"
						aria-controls="logo-sidebar"
						type="button"
						class="inline-flex items-center rounded-lg bg-slate-600 p-2 text-gray-200 hover:bg-slate-500 focus:ring-2 focus:ring-gray-200 focus:outline-hidden"
						onclick={sidebarActions.toggle}
					>
						<span class="sr-only">Gérer la sidebar</span>
						{#if sidebarState.isOpen}
							<PanelLeftClose size={24} />
						{:else}
							<Menu size={24} />
						{/if}
					</button>
					<a href="/dashboard"> <p>Oupla - mofo - {currentUser.username}</p></a>

					<div class="flex items-center space-x-4">
						{#if userDb.current?.memberOf && userDb.current.memberOf.length > 1}
							<Select.Root
								type="single"
								value={space}
								onSelectedChange={(value: string) => {
									const new_space = userDb.current?.memberOf.find(
										(s: { id: string }) => s.id === value
									);
									if (new_space) space = new_space;
								}}
							>
								<Select.Trigger class="w-[180px] border-gray-600 bg-gray-700 text-white">
									<Select.Value placeholder="Sélectionner un espace" />
								</Select.Trigger>
								<Select.Content>
									{#each userDb.memberOf as space}
										<Select.Item value={space.id}>{space.name}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						{:else if userDb.currentSpace}
							<div class="text-fluid-sm font-medium text-white">{userDb.currentSpace.name}</div>
						{/if}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger asChild>
								<Button
									variant="outline"
									class="border-gray-600 bg-gray-700 text-white hover:bg-gray-600"
								>
									{currentUser.username}
								</Button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content class="w-56">
								<DropdownMenu.Label>Mon compte</DropdownMenu.Label>
								<DropdownMenu.Separator />
								<DropdownMenu.Group>
									<DropdownMenu.Item onclick={() => goto('/dashboard/config')}>
										<Settings class="mr-2 h-4 w-4" />
										<span>Paramètres</span>
									</DropdownMenu.Item>
									<DropdownMenu.Item onclick={handleRefresh}>
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
											{#each userDb.memberOf as space}
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

				<!-- Responsive sidebar -->
				<aside
					id="logo-sidebar"
					class=" fixed top-0 left-0 z-40 h-screen
					overflow-y-auto border-r border-gray-200 bg-white pt-15 transition-all duration-300 lg:shrink-0 dark:border-gray-700 dark:bg-gray-800
					{sidebarState.isOpen ? 'translate-x-0' : '-translate-x-full'}
					{!displayState.isMobile && sidebarState.isCompact ? 'w-15' : 'w-70 p-2'}"
					aria-label="Sidebar"
				>
					<div class="mt-10 flex flex-col">
						<button
							onclick={() => (modalState.event = true)}
							class=" mb-4 flex w-full items-center justify-center rounded-lg bg-blue-500 p-2 font-bold text-white hover:bg-blue-700 {sidebarState.isCompact
								? 'm-auto h-10'
								: ''}"
						>
							{#if sidebarState.isCompact}
								<CalendarPlus size={30} class="" />
							{:else}
								Ajouter un événement
							{/if}
						</button>
						<div
							class="my-4 items-center justify-center space-y-2 rounded-xl bg-gray-100 font-medium text-nowrap {sidebarState.isCompact
								? ' flex w-15 flex-col px-0'
								: ' px-4 '}"
						>
							<a
								href="/dashboard/events"
								class:active={!page.url.searchParams.has('status')}
								class="sidebar-link"
								title="Événements"
							>
								<span class="flex items-center justify-center">
									<Calendar
										size={sidebarState.isCompact ? 32 : 24}
										strokeWidth={sidebarState.isCompact ? 2.5 : 2}
										class=""
									/>
								</span>
								<span class:hidden={sidebarState.isCompact}>Événements</span>
							</a>
							<hr class="my-2" />

							<!-- Événements confirmés -->
							<a
								href={getFilterUrl({ status: 'confirmed' })}
								class:active={page.url.searchParams.get('status') === 'confirmed'}
								class="sidebar-link"
								title="Programmés"
							>
								<span class="flex items-center justify-center">
									<Clock
										size={sidebarState.isCompact ? 32 : 24}
										strokeWidth={sidebarState.isCompact ? 2.5 : 2}
										class=""
									/>
								</span>
								<span class:hidden={sidebarState.isCompact}>Programmés</span>
							</a>

							<!-- Événements en attente -->
							<div
								class="rounded-lg {sidebarState.isCompact
									? 'bg-slate-200'
									: 'p-2 shadow-lg ring-2 shadow-slate-500/50 ring-slate-200'}"
							>
								<a
									href={getFilterUrl({ status: 'pending' })}
									class:active={page.url.searchParams.get('status') === 'pending'}
									class="sidebar-link"
									title="En attentes"
								>
									<span class="flex items-center justify-center">
										<Clock
											size={sidebarState.isCompact ? 32 : 24}
											strokeWidth={sidebarState.isCompact ? 2.5 : 2}
											class=" text-yellow-500"
										/>
									</span>
									<span class:hidden={sidebarState.isCompact}>En attentes</span>
								</a>
								<a
									href={getFilterUrl({ status: 'eventsWithoutDate' })}
									class:active={page.url.searchParams.get('status') === 'eventsWithoutDate'}
									class:ml-3={!sidebarState.isCompact}
									class="sidebar-link"
									title="Sans date"
								>
									<span class="flex items-center justify-center">
										<Calendar
											size={sidebarState.isCompact ? 32 : 24}
											strokeWidth={sidebarState.isCompact ? 2.5 : 2}
											class=" text-red-500"
										/>
									</span>
									<span class:hidden={sidebarState.isCompact} class="text-fluid-sm">Sans date</span>
								</a>

								<a
									href={getFilterUrl({ status: 'eventsWithoutOrganizers' })}
									class:active={page.url.searchParams.get('status') === 'eventsWithoutOrganizers'}
									class:ml-3={!sidebarState.isCompact}
									class="sidebar-link"
									title="Sans organisateur·ices"
								>
									<span class="flex items-center justify-center">
										<Users
											size={sidebarState.isCompact ? 32 : 24}
											strokeWidth={sidebarState.isCompact ? 2.5 : 2}
											class=" text-red-500"
										/>
									</span>
									<span class:hidden={sidebarState.isCompact} class="text-fluid-sm"
										>Sans organisateur·ices</span
									>
								</a>

								<a
									href={getFilterUrl({ status: 'eventsWithSondage' })}
									class:active={page.url.searchParams.get('status') === 'eventsWithSondage'}
									class:ml-3={!sidebarState.isCompact}
									class="sidebar-link"
									title="Sondages en cours"
								>
									<span class="flex items-center justify-center">
										<CalendarSearch
											size={sidebarState.isCompact ? 32 : 24}
											strokeWidth={sidebarState.isCompact ? 2.5 : 2}
											class=" text-fuchsia-700"
										/>
									</span>
									<span class:hidden={sidebarState.isCompact} class="text-fluid-sm"
										>Sondages en cours</span
									>
								</a>
							</div>
							<!-- Autres items du menu -->
							<a
								href={getFilterUrl({ status: 'conflicts' })}
								class:active={page.url.searchParams.get('status') === 'conflicts'}
								class="sidebar-link"
								title="En conflits"
							>
								<span class="flex items-center justify-center">
									<AlertTriangle
										size={sidebarState.isCompact ? 32 : 24}
										strokeWidth={sidebarState.isCompact ? 2.5 : 2}
										class=" text-red-500"
									/>
								</span>
								<span class:hidden={sidebarState.isCompact}> En conflits</span>
							</a>

							<a
								href="/dashboard/events/recurrent"
								class:active={page.url.pathname === '/dashboard/events/recurrent'}
								class="sidebar-link"
								title="Récurrents"
							>
								<span class="flex items-center justify-center">
									<RefreshCw
										size={sidebarState.isCompact ? 32 : 24}
										strokeWidth={sidebarState.isCompact ? 2.5 : 2}
										class=""
									/>
								</span>
								<span class:hidden={sidebarState.isCompact}>Récurrents</span>
							</a>
							<a
								href="/dashboard/newsletter"
								class:active={page.url.pathname === '/dashboard/newsletter'}
								class="sidebar-link"
								title="Newsletter"
							>
								<span class="flex items-center justify-center">
									<Mail
										size={sidebarState.isCompact ? 32 : 24}
										strokeWidth={sidebarState.isCompact ? 2.5 : 2}
										class=""
									/>
								</span>
								<span class:hidden={sidebarState.isCompact}>Newsletter</span>
							</a>
						</div>
						<div
							class="my-4 items-center justify-center space-y-2 rounded-xl bg-gray-100 py-4 font-medium text-nowrap {sidebarState.isCompact
								? ' flex w-15 flex-col px-0'
								: ' px-4 '}"
						>
							<a
								href="/"
								onclick={() => (modalState.inviteUser = true)}
								class="sidebar-link"
								title="Inviter un utilisateur"
							>
								<span class="flex items-center justify-center">
									<UserPlus
										size={sidebarState.isCompact ? 32 : 24}
										strokeWidth={sidebarState.isCompact ? 2.5 : 2}
										class=""
									/>
								</span>
								<span class:hidden={sidebarState.isCompact}>Inviter</span>
							</a>

							<a
								href="/dashboard/config"
								class:active={page.url.pathname === '/dashboard/config'}
								class="sidebar-link"
								title="Paramètres"
							>
								<span class="flex items-center justify-center">
									<Settings
										size={sidebarState.isCompact ? 32 : 24}
										strokeWidth={sidebarState.isCompact ? 2.5 : 2}
										class=""
									/>
								</span>
								<span class:hidden={sidebarState.isCompact}>Paramètres</span>
							</a>
						</div>
					</div>
				</aside>

				<!-- Content -->
				<main
					class="mt-16 w-full p-1 transition-all duration-300
				{sidebarState.isOpen && !sidebarState.isCompact ? 'ml-70' : ''}
				{sidebarState.isOpen && sidebarState.isCompact ? 'ml-18' : ''}
				md:p-4"
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
			{/if}
		</div>
	{/if}
{:catch error}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<div class="rounded-lg bg-white p-6 shadow-lg">
			<h2 class="mb-4 text-xl font-bold text-red-600">Session expirée</h2>
			<p class="text-gray-700">{error.message}</p>
			<button
				class="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
				onclick={() => goto('/login')}
			>
				Retour à la connexion
			</button>
		</div>
	</div>
{/await}

<style>
	.active {
		background-color: white;
		color: #2563eb;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
	}

	/* Ajustements pour le mode compact */
	:global(.w-70) {
		width: 17.5rem;
	}

	.hidden {
		display: none;
	}

	a.sidebar-link {
		display: flex;
		justify-items: center;
		align-items: center;
		gap: 0.5rem; /* gap-2 */
		border-radius: 0.75rem; /* rounded-xl */
		padding-left: 0.75rem; /* px-3 */
		padding-right: 0.75rem; /* px-3 */
		padding-top: 0.5rem; /* py-2 */
		padding-bottom: 0.5rem; /* py-2 */
		font-size: 1.125rem; /* text-lg */
		line-height: 1.75rem; /* text-lg */
		font-weight: 500; /* font-medium */
		text-decoration: none; /* pour enlever le soulignement par défaut des liens */
		color: inherit; /* pour hériter la couleur du parent */
	}

	a.sidebar-link:hover {
		background-color: white; /* hover:bg-white */
	}
</style>
