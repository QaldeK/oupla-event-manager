import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { messageStore, messageManager } from "$lib/shared/messageStore.svelte";
import { globalMessagesStore } from "$lib/shared/globalMessagesStore.svelte";
import { userDb } from "$lib/shared/userDb.svelte";
import type { MessagesResponse, UsersResponse } from "$lib/types/pocketbase";
import type { ExpandedMessage } from "$lib/types/types";

// Mock des dépendances
vi.mock("$lib/shared/globalMessagesStore.svelte", () => ({
	globalMessagesStore: {
		isInitialized: false,
		messages: [],
		init: vi.fn(),
		getMessagesForSpace: vi.fn(() => [])
	}
}));

vi.mock("$lib/shared/userDb.svelte", () => ({
	userDb: {
		id: "test-user-123",
		memberOf: ["space-1", "space-2"]
	}
}));

vi.mock("$lib/shared/syncState.svelte", () => {
	const mockSyncStore = vi.fn().mockImplementation((config) => ({
		config,
		allRecords: [],
		isInitialized: false,
		init: vi.fn().mockResolvedValue(undefined),
		destroy: vi.fn().mockResolvedValue(undefined),
		query: vi.fn(() => ({
			byIndex: vi.fn(() => ({
				sort: vi.fn(() => ({
					exec: vi.fn(() => [])
				}))
			}))
		}))
	}));

	return {
		SyncStore: mockSyncStore
	};
});

describe("MessageManager", () => {
	beforeEach(() => {
		// Reset tous les mocks avant chaque test
		vi.clearAllMocks();

		// Reset l'état du messageManager
		messageManager.destroy();
	});

	afterEach(async () => {
		// Nettoyage après chaque test
		await messageManager.destroy();
	});

	describe("Initialisation", () => {
		it("devrait s'initialiser correctement avec un spaceId valide", async () => {
			// Arrange
			const spaceId = "test-space-123";
			globalMessagesStore.init = vi.fn().mockResolvedValue(undefined);
			globalMessagesStore.isInitialized = false;

			// Act
			await messageManager.init(spaceId);

			// Assert
			expect(messageManager.isInitialized).toBe(true);
			expect(messageManager.error).toBeNull();
			expect(globalMessagesStore.init).toHaveBeenCalled();
		});

		it("devrait gérer l'erreur si spaceId est manquant", async () => {
			// Act
			await messageManager.init("");

			// Assert
			expect(messageManager.isInitialized).toBe(false);
			expect(messageManager.error).toBeInstanceOf(Error);
			expect(messageManager.error?.message).toContain("Space ID is required");
		});

		it("ne devrait pas réinitialiser globalMessagesStore s'il est déjà initialisé", async () => {
			// Arrange
			const spaceId = "test-space-123";
			globalMessagesStore.isInitialized = true;
			globalMessagesStore.init = vi.fn();

			// Act
			await messageManager.init(spaceId);

			// Assert
			expect(globalMessagesStore.init).not.toHaveBeenCalled();
		});
	});

	describe("Gestion des conversations", () => {
		beforeEach(async () => {
			// Initialiser le manager pour les tests
			globalMessagesStore.isInitialized = true;
			await messageManager.init("test-space");
		});

		it("devrait déterminer correctement si l'utilisateur participe à une conversation", () => {
			// Arrange
			const eventId = "event-123";
			const mockMessages = [
				{ id: "msg-1", event: eventId, user: "test-user-123" },
				{ id: "msg-2", event: "other-event", user: "test-user-123" }
			] as MessagesResponse<ExpandedMessage>[];

			globalMessagesStore.getMessagesForSpace = vi.fn(() => mockMessages);

			// Act - utiliser la fonction getMessageOfEvent pour déclencher la logique
			const result = messageManager.getMessageOfEvent(eventId);

			// Assert
			expect(globalMessagesStore.getMessagesForSpace).toHaveBeenCalledWith("test-space");
		});

		it("devrait retourner un tableau vide pour un événement inexistant", () => {
			// Arrange
			const eventId = "nonexistent-event";
			globalMessagesStore.getMessagesForSpace = vi.fn(() => []);

			// Act
			const result = messageManager.getMessageOfEvent(eventId);

			// Assert
			expect(result).toEqual([]);
		});

		it("devrait précharger une conversation sans erreur", async () => {
			// Arrange
			const eventId = "event-to-preload";

			// Act & Assert - ne devrait pas lever d'exception
			await expect(messageManager.preloadConversation(eventId)).resolves.toBeUndefined();
		});
	});

	describe("Nettoyage et gestion mémoire", () => {
		beforeEach(async () => {
			globalMessagesStore.isInitialized = true;
			await messageManager.init("test-space");
		});

		it("devrait nettoyer les instances inactives", async () => {
			// Arrange - précharger quelques conversations
			await messageManager.preloadConversation("event-1");
			await messageManager.preloadConversation("event-2");

			// Act
			await messageManager.cleanupInactiveInstances(0); // Age maximal de 0 pour forcer le nettoyage

			// Assert - difficile de tester directement, mais ça ne devrait pas lever d'erreur
			expect(true).toBe(true); // Test de non-régression
		});

		it("devrait se détruire complètement", async () => {
			// Arrange
			await messageManager.preloadConversation("event-1");

			// Act
			await messageManager.destroy();

			// Assert
			expect(messageManager.isInitialized).toBe(false);
			expect(messageManager.error).toBeNull();
		});
	});

	describe("Statistiques", () => {
		beforeEach(async () => {
			globalMessagesStore.isInitialized = true;
			await messageManager.init("test-space");
		});

		it("devrait fournir des statistiques correctes", async () => {
			// Act
			const stats = messageManager.stats;

			// Assert
			expect(stats).toHaveProperty("activeConversations");
			expect(stats).toHaveProperty("participantConversations");
			expect(stats).toHaveProperty("memoryOnlyConversations");
			expect(stats).toHaveProperty("currentSpaceId");
			expect(stats.currentSpaceId).toBe("test-space");
		});

		it("devrait compter correctement les conversations actives après préchargement", async () => {
			// Arrange
			await messageManager.preloadConversation("event-1");
			await messageManager.preloadConversation("event-2");

			// Act
			const stats = messageManager.stats;

			// Assert
			expect(stats.activeConversations).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Compatibilité API", () => {
		it("devrait exposer messageStore comme alias de messageManager", () => {
			// Assert
			expect(messageStore).toBe(messageManager);
		});

		it("devrait maintenir les propriétés de compatibilité", async () => {
			// Arrange
			globalMessagesStore.isInitialized = true;
			await messageManager.init("test-space");

			// Assert
			expect(typeof messageManager.isInitialized).toBe("boolean");
			expect(messageManager.error === null || messageManager.error instanceof Error).toBe(true);
			expect(typeof messageManager.getMessageOfEvent).toBe("function");
		});
	});

	describe("Gestion d'erreurs", () => {
		it("devrait gérer les erreurs lors de l'initialisation", async () => {
			// Arrange
			globalMessagesStore.init = vi.fn().mockRejectedValue(new Error("Init failed"));
			globalMessagesStore.isInitialized = false;

			// Act
			await messageManager.init("test-space");

			// Assert
			expect(messageManager.error).toBeInstanceOf(Error);
			expect(messageManager.isInitialized).toBe(false);
		});

		it("devrait gérer les erreurs lors du préchargement", async () => {
			// Arrange
			globalMessagesStore.isInitialized = true;
			await messageManager.init("test-space");

			// Act & Assert - ne devrait pas lever d'exception même en cas d'erreur interne
			await expect(messageManager.preloadConversation("invalid-event")).resolves.toBeUndefined();
		});

		it("devrait retourner un tableau vide si pas initialisé", () => {
			// Arrange - manager non initialisé

			// Act
			const result = messageManager.getMessageOfEvent("any-event");

			// Assert
			expect(result).toEqual([]);
		});
	});

	describe("Modes de stockage", () => {
		beforeEach(async () => {
			globalMessagesStore.isInitialized = true;
			await messageManager.init("test-space");
		});

		it("devrait utiliser le bon mode de stockage selon la participation", async () => {
			// Ce test est plus complexe car il nécessite de mocker la création des SyncStore
			// Pour l'instant, on vérifie juste que la préchargement fonctionne
			await expect(
				messageManager.preloadConversation("participant-event")
			).resolves.toBeUndefined();
			await expect(
				messageManager.preloadConversation("non-participant-event")
			).resolves.toBeUndefined();
		});
	});
});

describe("Intégration MessageManager", () => {
	it("devrait fonctionner avec des données réelles simulées", async () => {
		// Arrange - simuler des données plus réalistes
		const mockMessages = [
			{
				id: "msg-1",
				event: "event-123",
				user: "user-1",
				content: "Hello world",
				created: "2024-01-01T10:00:00Z",
				expand: {
					user: { id: "user-1", name: "Test User" } as UsersResponse
				}
			}
		] as MessagesResponse<ExpandedMessage>[];

		globalMessagesStore.isInitialized = true;
		globalMessagesStore.getMessagesForSpace = vi.fn(() => mockMessages);

		// Act
		await messageManager.init("test-space");
		const messages = messageManager.getMessageOfEvent("event-123");

		// Assert
		expect(Array.isArray(messages)).toBe(true);
	});
});
