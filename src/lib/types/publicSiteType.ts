import type { SitePagesRecord } from "./pocketbase";

export enum ComponentType {
	navigationMenu = "navigationMenu",
	bloc = "bloc",
	page = "page"
}

export interface NavigationMenuConfig {
	links: NavigationLink[];
}

export interface NavigationLink {
	title: string;
	url: string;
}

export type SitePagesNavigationMenuRecord = Omit<SitePagesRecord<any>, "componentConfig"> & {
	componentConfig: ComponentConfig;
};

export type ComponentConfig = {
	links: NavigationLink[];
};
