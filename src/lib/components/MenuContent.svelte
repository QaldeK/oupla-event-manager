<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state"; // $app/store est déprécié !
	import { screenDetector } from "$lib/utils/screen.svelte";

	import { modalState } from "$lib/shared/states.svelte.js";
	import {
		AlertTriangle,
		Calendar,
		CalendarCheck2,
		CalendarCog,
		CalendarPlus,
		CalendarSearch,
		CalendarX,
		CalendarX2,
		Clock,
		Files,
		Globe,
		Mail,
		RefreshCw,
		Settings,
		UserPlus,
		Users,
		UserX
	} from "lucide-svelte";

	interface Props {
		isCompact?: boolean;
		onItemClick?: () => void;
	}

	let { isCompact = false, onItemClick }: Props = $props();
	let isMobile = $derived(screenDetector.isMobile);
	let currentUrl = $derived(page.url.pathname + page.url.search);
	let currentPathname = $derived(page.url.pathname);

	function getFilterUrl(filters: { status?: string }): string {
		const url = new URL("/dashboard/events", window.location.origin);
		Object.entries(filters).forEach(([key, value]) => {
			if (value) url.searchParams.set(key, value);
		});
		return url.toString();
	}

	function handleNavigation(url: string) {
		goto(url);
		onItemClick?.();
	}

	// Fonction pour vérifier si un élément est actif
	function isItemActive(item: MenuItem): boolean {
		const itemUrl = typeof item.url === "function" ? item.url(item.filterParams || {}) : item.url;

		// Normaliser les URLs pour la comparaison
		const normalizedItemUrl = new URL(itemUrl, window.location.origin);
		const normalizedCurrentUrl = new URL(currentUrl, window.location.origin);

		// Vérification directe pour l'URL exacte (pathname + search params)
		if (
			normalizedCurrentUrl.pathname === normalizedItemUrl.pathname &&
			normalizedCurrentUrl.search === normalizedItemUrl.search
		) {
			return true;
		}

		// Vérification pour les sous-éléments
		if (item.subItems) {
			return item.subItems.some((subItem) => isItemActive(subItem));
		}

		return false;
	}

	// Fonction pour vérifier si les sous-menus doivent être affichés
	function shouldShowSubItems(item: MenuItem): boolean {
		if (isCompact || !item.subItems) return false;

		const itemUrl = typeof item.url === "function" ? item.url(item.filterParams || {}) : item.url;
		const normalizedItemUrl = new URL(itemUrl, window.location.origin);

		// Pour le niveau 1 (Événement) : toujours afficher si on est sur la section
		if (currentPathname === normalizedItemUrl.pathname) return true;

		// Pour les sous-pages (ex: /dashboard/events/recurrent)
		if (
			currentPathname.startsWith(normalizedItemUrl.pathname) &&
			currentPathname !== normalizedItemUrl.pathname
		)
			return true;

		// Vérifier si un des sous-éléments est actif
		return item.subItems.some((subItem) => isItemActive(subItem));
	}

	interface MenuItem {
		label: string;
		icon;
		url: string | ((filters: { status?: string }) => string);
		filterParams?: { status?: string };
		subItems?: MenuItem[];
		iconClass?: string;
	}

	const menuItems: MenuItem[] = [
		{
			label: "Événement",
			icon: Calendar,
			url: "/dashboard/events",
			filterParams: { status: "all" },
			subItems: [
				{
					label: "Programmés",
					icon: CalendarCheck2,
					url: (filters) => getFilterUrl(filters),
					filterParams: { status: "confirmed" }
				},
				{
					label: "En attentes",
					icon: CalendarCog,
					iconClass: "text-warning",
					url: (filters) => getFilterUrl(filters),
					filterParams: { status: "pending" },
					subItems: [
						{
							label: "Sans date",
							icon: CalendarX2,
							iconClass: "text-error",
							url: (filters) => getFilterUrl(filters),
							filterParams: { status: "eventsWithoutDate" }
						},
						{
							label: "Sans organisateur·ices",
							icon: UserX,
							iconClass: "text-error",
							url: (filters) => getFilterUrl(filters),
							filterParams: { status: "eventsWithoutOrganizers" }
						},
						{
							label: "Sondages en cours",
							icon: CalendarSearch,
							iconClass: "text-primary",
							url: (filters) => getFilterUrl(filters),
							filterParams: { status: "eventsWithSondage" }
						}
					]
				},
				{
					label: "En conflits",
					icon: AlertTriangle,
					iconClass: "text-error",
					url: (filters) => getFilterUrl(filters),
					filterParams: { status: "conflicts" }
				},
				{
					label: "Récurrents",
					icon: RefreshCw,
					url: "/dashboard/events/recurrent"
				}
			]
		},
		{
			label: "Newsletter",
			icon: Mail,
			url: "/dashboard/newsletter"
		},
		{
			label: "Site public",
			icon: Globe,
			url: "/dashboard/site_pages"
		},
		{
			label: "Documents",
			url: "/dashboard/pads",
			icon: Files
		}
	];

	const secondaryMenuItems: MenuItem[] = [
		{
			label: "Inviter",
			icon: UserPlus,
			url: "#" // Utilisé pour le bouton modal
		},
		{
			label: "Configuration",
			icon: Settings,
			url: "/dashboard/config"
		}
	];
</script>

{#snippet menuItem(item)}
	<li>
		<a
			href={typeof item.url === "function" ? item.url(item.filterParams || {}) : item.url}
			class={isItemActive(item) ? "bg-base-300" : ""}
			onclick={(e) => {
				e.preventDefault();
				if (item === secondaryMenuItems[0]) {
					// Cas spécial pour le bouton modal Inviter
					modalState.inviteUser = true;
					onItemClick?.();
				} else {
					handleNavigation(
						typeof item.url === "function" ? item.url(item.filterParams || {}) : item.url
					);
				}
			}}
		>
			<item.icon size={24} class={item.iconClass} />
			<span class:hidden={isCompact}>{item.label}</span>
		</a>

		{#if shouldShowSubItems(item)}
			<ul>
				{#each item.subItems as subItem (subItem)}
					<li>
						<a
							href={typeof subItem.url === "function"
								? subItem.url(subItem.filterParams || {})
								: subItem.url}
							class={isItemActive(subItem) ? "bg-base-300" : ""}
							onclick={(e) => {
								e.preventDefault();
								handleNavigation(
									typeof subItem.url === "function"
										? subItem.url(subItem.filterParams || {})
										: subItem.url
								);
							}}
						>
							<subItem.icon size={20} class={subItem.iconClass} />
							{subItem.label}
						</a>

						{#if shouldShowSubItems(subItem)}
							<ul>
								{#each subItem.subItems as subSubItem (subSubItem)}
									<li>
										<a
											href={typeof subSubItem.url === "function"
												? subSubItem.url(subSubItem.filterParams || {})
												: subSubItem.url}
											class={isItemActive(subSubItem) ? "bg-base-300" : ""}
											onclick={(e) => {
												e.preventDefault();
												handleNavigation(
													typeof subSubItem.url === "function"
														? subSubItem.url(subSubItem.filterParams || {})
														: subSubItem.url
												);
											}}
										>
											<subSubItem.icon size={18} class={subSubItem.iconClass} />
											{subSubItem.label}
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</li>
{/snippet}

<div class=" flex flex-col gap-4">
	<!-- Bouton Nouvel événement -->
	<button
		class="btn btn-primary mb-4 p-2"
		onclick={() => {
			modalState.event = true;
			onItemClick?.();
		}}
	>
		{#if isCompact}
			<CalendarPlus size={24} />
		{:else}
			<CalendarPlus size={24} />
			Nouvel événement
		{/if}
	</button>
	<!-- Menu principal -->
	<ul class="menu rounded-box bg-base-100 w-full gap-2 {isMobile ? 'menu-md' : 'menu-lg'}">
		{#each menuItems as item, index (index)}
			{@render menuItem(item)}
		{/each}
	</ul>

	<!-- Menu secondaire -->
	<ul class="menu w-full {isMobile ? 'menu-md' : 'menu-lg'} rounded-box bg-base-100 mt-4 gap-2">
		{#each secondaryMenuItems as item, index (index)}
			{@render menuItem(item)}
		{/each}
	</ul>
</div>

<style>
	li {
		margin: 4px 0 0 0;
	}
</style>
