import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/svelte";
import Page from "./+page.svelte";

// vi.mock est hoisted par Vitest — les variables mock doivent être définies via vi.hoisted()
const { mockGoto, mockAuthStore, mockUserDb, mockCollection } = vi.hoisted(() => ({
	mockGoto: vi.fn(),
	mockAuthStore: {
		isValid: false,
		record: null as null | { id: string },
		clear: vi.fn()
	},
	mockUserDb: {
		initializeUserData: vi.fn(),
		register: vi.fn(),
		login: vi.fn(),
		logout: vi.fn(),
		memberOf: [] as unknown[],
		userData: null as null | { username: string }
	},
	mockCollection: vi.fn(() => ({
		create: vi.fn()
	}))
}));

vi.mock("$app/navigation", () => ({
	goto: (...args: unknown[]) => mockGoto(...args)
}));

vi.mock("$lib/pocketbase.svelte", () => ({
	pb: {
		authStore: mockAuthStore,
		collection: mockCollection
	}
}));

vi.mock("$lib/shared/userDb.svelte", () => ({
	userDb: mockUserDb
}));

describe("/+page.svelte — Page d'accueil", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAuthStore.isValid = false;
		mockAuthStore.record = null;
		mockUserDb.memberOf = [];
		mockUserDb.userData = null;
	});

	describe("État non authentifié", () => {
		test("affiche le formulaire d'inscription avec tous les champs", async () => {
			render(Page);
			await vi.waitFor(() => {
				expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bienvenue");
			});

			// Vérifie le titre et la description
			expect(screen.getByText("Créez votre compte pour commencer")).toBeInTheDocument();

			// Vérifie la présence des champs (DaisyUI v5 utilise <legend>, on cherche par placeholder)
			expect(screen.getByPlaceholderText("utilisateur")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("email@exemple.com")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Au moins 8 caractères")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Confirmez le mot de passe")).toBeInTheDocument();

			// Vérifie le bouton de soumission
			expect(screen.getByRole("button", { name: /Créer mon compte/i })).toBeInTheDocument();

			// Vérifie le lien vers la page de connexion
			const loginLink = screen.getByText("Se connecter");
			expect(loginLink.closest("a")).toHaveAttribute("href", "/login");
		});
	});

	describe("État authentifié sans espace", () => {
		test("affiche le formulaire de création d'espace", async () => {
			mockAuthStore.isValid = true;
			mockAuthStore.record = { id: "test-user-id" };

			render(Page);
			await vi.waitFor(() => {
				expect(
					screen.getByRole("heading", { level: 1, name: /Bonjour/i })
				).toBeInTheDocument();
			});

			// Vérifie le formulaire de création d'espace
			expect(screen.getByText("Créer votre premier espace")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Mon Espace")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /Créer l'espace/i })).toBeInTheDocument();
			expect(screen.getByText("Se déconnecter")).toBeInTheDocument();
		});
	});
});
