import type { SitePagesRecord, SitePagesResponse } from "./pocketbase";

// Types d'énumération pour les composants
export enum ComponentType {
	navigationMenu = "navigationMenu",
	bloc = "bloc",
	page = "page"
}

// Configuration pour le menu de navigation
export interface NavigationMenuConfig {
	links: NavigationLink[];
	showTitle?: boolean;
	bgColor?: string;
	textColor?: string;
	hoverColor?: string;
}

// Configuration pour un bloc de contenu
export interface BlocConfig {
	bgColor?: string;
	textColor?: string;
	showTitle?: boolean;
}

// Configuration pour une page
// USELESS pour le layout... Pour plus tard ?
export interface PageConfig {
	showTitle?: boolean;
	showDate?: boolean;
	template?: string;
	bgColor?: string;
	textColor?: string;
}

// Type générique pour les configurations
export type ComponentConfig = NavigationMenuConfig | BlocConfig | PageConfig;

// Interface pour un lien de navigation
export interface NavigationLink {
	title: string;
	url: string;
	target?: "_blank" | "_self";
	icon?: string;
}

// Types discriminés pour les différents composants
export interface NavigationMenuComponent extends SitePagesRecord {
	componentType: ComponentType.navigationMenu;
	componentConfig: NavigationMenuConfig;
}

export interface BlocComponent extends SitePagesRecord {
	componentType: ComponentType.bloc;
	componentConfig: BlocConfig;
}

export interface PageComponent extends SitePagesRecord {
	componentType: ComponentType.page;
	componentConfig: PageConfig;
}

// Union type pour tous les composants
export type SitePageComponent = NavigationMenuComponent | BlocComponent | PageComponent;

// Types de réponse avec discrimination
export interface NavigationMenuResponse extends SitePagesResponse {
	componentType: ComponentType.navigationMenu;
	componentConfig: NavigationMenuConfig;
}

export interface BlocResponse extends SitePagesResponse {
	componentType: ComponentType.bloc;
	componentConfig: BlocConfig;
}

export interface PageResponse extends SitePagesResponse {
	componentType: ComponentType.page;
	componentConfig: PageConfig;
}

// Union type pour toutes les réponses
export type SitePageResponse = NavigationMenuResponse | BlocResponse | PageResponse;

// Type guard pour vérifier le type de composant
export function isNavigationMenuComponent(
	component: SitePageComponent | SitePageResponse | SitePagesResponse
): component is NavigationMenuComponent | NavigationMenuResponse {
	return component.componentType === ComponentType.navigationMenu;
}

export function isBlocComponent(
	component: SitePageComponent | SitePageResponse | SitePagesResponse
): component is BlocComponent | BlocResponse {
	return component.componentType === ComponentType.bloc;
}

export function isPageComponent(
	component: SitePageComponent | SitePageResponse | SitePagesResponse
): component is PageComponent | PageResponse {
	return component.componentType === ComponentType.page;
}

// Type guard pour vérifier si c'est un composant typé
export function isTypedComponent(
	component: SitePageComponent | SitePageResponse | SitePagesResponse
): component is SitePageComponent | SitePageResponse {
	return (
		component.componentType !== undefined &&
		component.componentConfig !== undefined &&
		component.componentConfig !== null
	);
}

// Fonction utilitaire pour obtenir la configuration typée
export function getTypedComponentConfig(
	component: SitePageComponent | SitePageResponse | SitePagesResponse
): NavigationMenuConfig | BlocConfig | PageConfig | undefined {
	if (!component.componentConfig) {
		return undefined;
	}
	return component.componentConfig as NavigationMenuConfig | BlocConfig | PageConfig;
}

// Fonction utilitaire pour vérifier si un composant a des liens
export function hasLinks(
	component: SitePageComponent | SitePageResponse | SitePagesResponse
): component is NavigationMenuComponent | NavigationMenuResponse {
	return (
		isNavigationMenuComponent(component) &&
		component.componentConfig.links !== undefined &&
		component.componentConfig.links.length > 0
	);
}

// Type legacy pour compatibilité (à supprimer progressivement)
export type SitePagesNavigationMenuRecord = NavigationMenuResponse;
