// src/lib/config/menuItems.ts

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
	UserPlus
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
 * @returns La chaîne de l'URL (ex: "/dashboard/events?status=pending").
 */
export function generateUrl(item: MenuItem): string {
	const url = new URL(item.path, "http://localhost"); // La base est arbitraire, on ne veut que le pathname + search
	if (item.params) {
		Object.entries(item.params).forEach(([key, value]) => {
			if (value) url.searchParams.set(key, value);
		});
	}
	return url.pathname + url.search;
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

// --- DÉFINITIONS DES MENUS ---

export const eventsMenuItems: MenuItem[] = [
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
				// subItems: [
				// 	{
				// 		label: "Sans date",
				// 		icon: CalendarX2,
				// 		iconClass: "text-error",
				// 		path: "/dashboard/events",
				// 		params: { status: "eventsWithoutDate" }
				// 	},
				// 	{
				// 		label: "Sans organisateur·ices",
				// 		icon: UserX,
				// 		iconClass: "text-error",
				// 		path: "/dashboard/events",
				// 		params: { status: "eventsWithoutOrganizers" }
				// 	},
				// 	{
				// 		label: "Sondages en cours",
				// 		icon: CalendarSearch,
				// 		iconClass: "text-primary",
				// 		path: "/dashboard/events",
				// 		params: { status: "eventsWithSondage" }
				// 	}
				// ]
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
				path: "/dashboard/events",
				params: { status: "conflicts" }
			},
			{
				label: "Récurrents",
				icon: RefreshCw,
				path: "/dashboard/events/recurrent"
			}
		]
	}
];

export const otherMenuItems: MenuItem[] = [
	{
		label: "Newsletter",
		icon: Mail,
		path: "/dashboard/newsletter"
	},
	{
		label: "Site public",
		icon: Globe,
		path: "/dashboard/site_pages"
	},
	{
		label: "Documents",
		path: "/dashboard/pads",
		icon: Files
	}
];

export const confMenuItems: MenuItem[] = [
	{
		label: "Configuration",
		icon: Settings,
		path: "/dashboard/config"
	}
];
