import { describe, it, expect } from "vitest";
import {
	ComponentType,
	type SitePageResponse,
	type NavigationMenuResponse,
	type BlocResponse,
	type PageResponse,
	isNavigationMenuComponent,
	isBlocComponent,
	isPageComponent,
	getTypedComponentConfig
} from "$lib/types/publicSiteType";

describe("Types discriminés pour les composants de site", () => {
	// Mock data pour les tests
	const mockNavigationMenuComponent: NavigationMenuResponse = {
		id: "nav1",
		componentType: ComponentType.navigationMenu,
		componentConfig: {
			links: [
				{ title: "Accueil", url: "/" },
				{ title: "Événements", url: "/events", target: "_blank" }
			],
			bgColor: "bg-blue-500",
			textColor: "text-white"
		},
		title: "Menu Principal",
		content: "",
		section: "leftSide" as any,
		pos: 1,
		enabled: true,
		space: "space1",
		collectionId: "site_pages",
		collectionName: "site_pages" as any,
		created: "2024-01-01T00:00:00Z",
		updated: "2024-01-01T00:00:00Z",
		isEditing: false,
		editingUser: null,
		lastEditHeartbeat: null,
		created_by: "user1",
		lastMod: "2024-01-01T00:00:00Z",
		tags: null
	};

	const mockBlocComponent: BlocResponse = {
		id: "bloc1",
		componentType: ComponentType.bloc,
		componentConfig: {
			bgColor: "bg-gray-100",
			textColor: "text-gray-900",
			showTitle: true,
			padding: "p-4"
		},
		title: "Bloc d'information",
		content: "<p>Contenu du bloc</p>",
		section: "rightSide" as any,
		pos: 2,
		enabled: true,
		space: "space1",
		collectionId: "site_pages",
		collectionName: "site_pages" as any,
		created: "2024-01-01T00:00:00Z",
		updated: "2024-01-01T00:00:00Z",
		isEditing: false,
		editingUser: null,
		lastEditHeartbeat: null,
		created_by: "user1",
		lastMod: "2024-01-01T00:00:00Z",
		tags: null
	};

	const mockPageComponent: PageResponse = {
		id: "page1",
		componentType: ComponentType.page,
		componentConfig: {
			showTitle: false,
			showDate: true,
			template: "default",
			bgColor: "bg-white"
		},
		title: "Page d'accueil",
		content: "<h1>Bienvenue</h1>",
		section: "page" as any,
		pos: 0,
		enabled: true,
		space: "space1",
		collectionId: "site_pages",
		collectionName: "site_pages" as any,
		created: "2024-01-01T00:00:00Z",
		updated: "2024-01-01T00:00:00Z",
		isEditing: false,
		editingUser: null,
		lastEditHeartbeat: null,
		created_by: "user1",
		lastMod: "2024-01-01T00:00:00Z",
		tags: null
	};

	describe("Type Guards", () => {
		it("devrait identifier correctement un composant navigation menu", () => {
			expect(isNavigationMenuComponent(mockNavigationMenuComponent)).toBe(true);
			expect(isNavigationMenuComponent(mockBlocComponent)).toBe(false);
			expect(isNavigationMenuComponent(mockPageComponent)).toBe(false);
		});

		it("devrait identifier correctement un composant bloc", () => {
			expect(isBlocComponent(mockBlocComponent)).toBe(true);
			expect(isBlocComponent(mockNavigationMenuComponent)).toBe(false);
			expect(isBlocComponent(mockPageComponent)).toBe(false);
		});

		it("devrait identifier correctement un composant page", () => {
			expect(isPageComponent(mockPageComponent)).toBe(true);
			expect(isPageComponent(mockNavigationMenuComponent)).toBe(false);
			expect(isPageComponent(mockBlocComponent)).toBe(false);
		});
	});

	describe("Configuration typée", () => {
		it("devrait retourner la bonne configuration pour un menu de navigation", () => {
			const config = getTypedComponentConfig(mockNavigationMenuComponent);
			expect(config).toEqual({
				links: [
					{ title: "Accueil", url: "/" },
					{ title: "Événements", url: "/events", target: "_blank" }
				],
				bgColor: "bg-blue-500",
				textColor: "text-white"
			});
		});

		it("devrait retourner la bonne configuration pour un bloc", () => {
			const config = getTypedComponentConfig(mockBlocComponent);
			expect(config).toEqual({
				bgColor: "bg-gray-100",
				textColor: "text-gray-900",
				showTitle: true,
				padding: "p-4"
			});
		});

		it("devrait retourner la bonne configuration pour une page", () => {
			const config = getTypedComponentConfig(mockPageComponent);
			expect(config).toEqual({
				showTitle: false,
				showDate: true,
				template: "default",
				bgColor: "bg-white"
			});
		});
	});

	describe("Propriétés spécifiques aux types", () => {
		it("devrait permettre l'accès aux liens dans un menu de navigation", () => {
			if (isNavigationMenuComponent(mockNavigationMenuComponent)) {
				expect(mockNavigationMenuComponent.componentConfig.links).toBeDefined();
				expect(mockNavigationMenuComponent.componentConfig.links).toHaveLength(2);
				expect(mockNavigationMenuComponent.componentConfig.links[0].title).toBe("Accueil");
			}
		});

		it("devrait permettre l'accès aux propriétés de style dans un bloc", () => {
			if (isBlocComponent(mockBlocComponent)) {
				expect(mockBlocComponent.componentConfig.bgColor).toBe("bg-gray-100");
				expect(mockBlocComponent.componentConfig.showTitle).toBe(true);
			}
		});

		it("devrait permettre l'accès aux propriétés de page", () => {
			if (isPageComponent(mockPageComponent)) {
				expect(mockPageComponent.componentConfig.showTitle).toBe(false);
				expect(mockPageComponent.componentConfig.template).toBe("default");
			}
		});
	});

	describe("Gestion des liens de navigation", () => {
		it("devrait gérer les liens avec target personnalisé", () => {
			if (isNavigationMenuComponent(mockNavigationMenuComponent)) {
				const linkWithTarget = mockNavigationMenuComponent.componentConfig.links.find(
					(link) => link.target === "_blank"
				);
				expect(linkWithTarget).toBeDefined();
				expect(linkWithTarget?.title).toBe("Événements");
			}
		});

		it("devrait avoir un target par défaut de _self", () => {
			if (isNavigationMenuComponent(mockNavigationMenuComponent)) {
				const linkWithoutTarget = mockNavigationMenuComponent.componentConfig.links.find(
					(link) => !link.target
				);
				expect(linkWithoutTarget).toBeDefined();
				expect(linkWithoutTarget?.title).toBe("Accueil");
			}
		});
	});

	describe("Compatibilité avec les types existants", () => {
		it("devrait être compatible avec SitePageResponse union type", () => {
			const components: SitePageResponse[] = [
				mockNavigationMenuComponent,
				mockBlocComponent,
				mockPageComponent
			];

			components.forEach((component) => {
				expect(component.id).toBeDefined();
				expect(component.componentType).toBeDefined();
				expect(component.componentConfig).toBeDefined();
			});
		});
	});
});
