// src/lib/shared/navigation.svelte.ts

import {
	AlertTriangle,
	Calendar,
	CalendarCheck2,
	CalendarCog,
	CalendarPlus,
	CalendarSearch,
	Files,
	Globe,
	Mail,
	RefreshCw,
	Settings,
	UserPlus,
	Palette,
	PanelsTopLeft,
	ExternalLink,
	Archive,
	MessageCircle
} from "lucide-svelte";

// --- INTERFACES ---

/**
 * Un élément qui déclenche une action dans l'UI (ex: ouvrir un modal).
 * Il n'a pas de chemin de navigation.
 */
export interface ActionItem {
	label: string;
	icon: any;
	action: "openEventModal" | "openInviteModal"; // Actions spécifiques et typées
	iconClass?: string;
}

export type NavigationItem = MenuItem | ActionItem;

/**
 * Un élément qui navigue vers une nouvelle URL.
 * Il a un chemin (`path`) et peut avoir des paramètres (`params`).
 */
export interface MenuItem {
	label: string;
	icon: any;
	path: string;
	params?: { [key: string]: string | undefined };
	subItems?: MenuItem[];
	iconClass?: string;
}

// --- FONCTION UTILITAIRE ---

/**
 * Construit une URL complète (chemin + paramètres) à partir d'un objet MenuItem.
 * @param item - L'élément de menu
 * @param spaceName - Le nom de l'espace courant pour construire les URLs
 * @returns La chaîne de l'URL (ex: "/dashboard/mon-espace/events?status=pending").
 */
export function generateUrl(item: NavigationItem, spaceName: string): string {
	if (!("path" in item)) {
		return "#"; // ActionItem n'a pas de chemin, retourne un fragment vide
	}

	// Remplacer /dashboard par /dashboard/{spaceName} dans le path
	const spacedPath = item.path.replace("/dashboard", `/dashboard/${spaceName}`);

	// Construire les paramètres de requête manuellement
	let queryString = "";
	if (item.params) {
		const params = Object.entries(item.params)
			.filter(([, value]) => value)
			.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value!)}`)
			.join("&");
		if (params) {
			queryString = `?${params}`;
		}
	}
	return spacedPath + queryString;
}

// --- STORE DE NAVIGATION ---

class NavigationStore {
	#currentSpaceName = $state<string>("");

	/**
	 * Met à jour le nom de l'espace courant
	 */
	setSpaceName(spaceName: string) {
		this.#currentSpaceName = spaceName;
	}

	/**
	 * Récupère le nom de l'espace courant
	 */
	get spaceName() {
		return this.#currentSpaceName;
	}

	/**
	 * Génère les éléments de menu avec les URLs adaptées à l'espace courant
	 */
	get eventsMenuItems(): MenuItem[] {
		return [
			{
				label: "Événement",
				icon: Calendar,
				path: "/dashboard/events",
				params: { status: "all" },
				subItems: [
					{
						label: "Programmés",
						icon: CalendarCheck2,
						iconClass: "text-success",
						path: "/dashboard/events",
						params: { status: "confirmed" }
					},
					{
						label: "En attentes",
						icon: CalendarCog,
						iconClass: "text-warning",
						path: "/dashboard/events",
						params: { status: "pending" }
					},
					{
						label: "Sondages",
						icon: CalendarSearch,
						iconClass: "text-primary",
						path: "/dashboard/events",
						params: { status: "eventsWithSondage" }
					},
					{
						label: "En conflits",
						icon: AlertTriangle,
						iconClass: "text-error",
						path: "/dashboard/events/conflicts"
					},
					{
						label: "Récurrents",
						icon: RefreshCw,
						path: "/dashboard/events/recurrent"
					},
					{
						label: "Passés...",
						icon: Archive,
						path: "/dashboard/events/archived"
					}
				]
			}
		];
	}

	get otherMenuItems(): MenuItem[] {
		return [
			{
				label: "Newsletter",
				icon: Mail,
				path: "/dashboard/newsletter"
			},
			{
				label: "Discussions",
				icon: MessageCircle,
				path: "/dashboard/discussions"
			},
			{
				label: "Site public",
				icon: Globe,
				path: "/dashboard/site_pages",
				subItems: [
					{
						label: "Pages",
						icon: Files,
						path: "/dashboard/site_pages/pages"
					},
					{
						label: "Themes",
						icon: Palette,
						path: "/dashboard/site_pages/theme"
					},
					{
						label: "Template",
						icon: PanelsTopLeft,
						path: "/dashboard/site_pages/template"
					},
					{
						label: "Visiter",
						icon: ExternalLink,
						path: `/${this.#currentSpaceName}`
					}
				]
			},
			{
				label: "Documents",
				path: "/dashboard/pads",
				icon: Files
			}
		];
	}

	get confMenuItems(): MenuItem[] {
		return [
			{
				label: "Configuration",
				icon: Settings,
				path: "/dashboard/config"
			}
		];
	}

	/**
	 * Génère une URL complète pour un élément de menu
	 */
	generateUrl(item: NavigationItem): string {
		return generateUrl(item, this.#currentSpaceName);
	}
}

// --- BOUTONS D'ACTION SPÉCIAUX ---

export const newEventButton: ActionItem = {
	icon: CalendarPlus,
	label: "Nouvel événement",
	action: "openEventModal"
};

export const inviteUserButton: ActionItem = {
	icon: UserPlus,
	label: "Inviter",
	action: "openInviteModal"
};

// Instance singleton du store
export const navigationStore = new NavigationStore();
