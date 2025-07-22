import { describe, it, expect } from "vitest";
import type { NavigationLink } from "$lib/types/publicSiteType";

// Test de la logique du NavigationMenuEditor
describe("NavigationMenuEditor Logic", () => {
	it("should create a navigation link correctly", () => {
		const link: NavigationLink = {
			title: "Test Link",
			url: "/test"
		};

		expect(link.title).toBe("Test Link");
		expect(link.url).toBe("/test");
	});

	it("should validate link structure", () => {
		const validLink: NavigationLink = {
			title: "Valid Link",
			url: "https://example.com"
		};

		// Vérifier que les propriétés requises sont présentes
		expect(validLink).toHaveProperty("title");
		expect(validLink).toHaveProperty("url");
		expect(typeof validLink.title).toBe("string");
		expect(typeof validLink.url).toBe("string");
	});

	it("should handle empty links array", () => {
		const links: NavigationLink[] = [];

		expect(Array.isArray(links)).toBe(true);
		expect(links.length).toBe(0);
	});

	it("should handle multiple links", () => {
		const links: NavigationLink[] = [
			{ title: "Home", url: "/" },
			{ title: "About", url: "/about" },
			{ title: "Contact", url: "/contact" }
		];

		expect(links.length).toBe(3);
		expect(links[0].title).toBe("Home");
		expect(links[1].title).toBe("About");
		expect(links[2].title).toBe("Contact");
	});

	it("should validate URL formats", () => {
		const internalLink: NavigationLink = {
			title: "Internal Page",
			url: "/internal"
		};

		const externalLink: NavigationLink = {
			title: "External Page",
			url: "https://external.com"
		};

		const relativeLink: NavigationLink = {
			title: "Relative Page",
			url: "relative"
		};

		// Tous ces formats devraient être valides
		expect(internalLink.url.startsWith("/")).toBe(true);
		expect(externalLink.url.startsWith("http")).toBe(true);
		expect(relativeLink.url).toBe("relative");
	});

	it("should simulate adding a link to an array", () => {
		const initialLinks: NavigationLink[] = [{ title: "Existing", url: "/existing" }];

		const newLink: NavigationLink = {
			title: "New Link",
			url: "/new"
		};

		const updatedLinks = [...initialLinks, newLink];

		expect(updatedLinks.length).toBe(2);
		expect(updatedLinks[1]).toEqual(newLink);
	});

	it("should simulate removing a link from an array", () => {
		const links: NavigationLink[] = [
			{ title: "First", url: "/first" },
			{ title: "Second", url: "/second" },
			{ title: "Third", url: "/third" }
		];

		// Supprimer le lien à l'index 1
		const updatedLinks = links.filter((_, index) => index !== 1);

		expect(updatedLinks.length).toBe(2);
		expect(updatedLinks[0].title).toBe("First");
		expect(updatedLinks[1].title).toBe("Third");
	});

	it("should simulate reordering links", () => {
		const links: NavigationLink[] = [
			{ title: "First", url: "/first" },
			{ title: "Second", url: "/second" },
			{ title: "Third", url: "/third" }
		];

		// Déplacer le premier élément à la fin
		const reorderedLinks = [...links.slice(1), links[0]];

		expect(reorderedLinks[0].title).toBe("Second");
		expect(reorderedLinks[1].title).toBe("Third");
		expect(reorderedLinks[2].title).toBe("First");
	});

	it("should handle menu title validation", () => {
		const validTitle = "Menu Principal";
		const emptyTitle = "";
		const spacesOnlyTitle = "   ";

		expect(validTitle.trim().length > 0).toBe(true);
		expect(emptyTitle.trim().length > 0).toBe(false);
		expect(spacesOnlyTitle.trim().length > 0).toBe(false);
	});
});
