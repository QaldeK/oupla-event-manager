// src/lib/test/conversationDirectoryStore.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { conversationDirectoryStore } from "$lib/shared/conversationDirectoryStore.svelte";
import type { ConversationSummariesResponse } from "$lib/types/pocketbase";

/**
 * Tests pour conversationDirectoryStore
 *
 * Ces tests vérifient que :
 * 1. Le store peut être initialisé avec les espaces de l'utilisateur
 * 2. Les conversations sont correctement filtrées et indexées
 * 3. Les méthodes de recherche et de filtrage fonctionnent
 * 4. Les statistiques sont calculées correctement
 * 5. La découverte de conversations est opérationnelle
 */

// Mock global de userDb
const mockUserDb = {
	id: "testuser",
	memberOf: [
		{ id: "space1", name: "Espace Test 1" },
		{ id: "space2", name: "Espace Test 2" }
	]
};

vi.mock("$lib/shared/userDb.svelte", () => ({
	userDb: mockUserDb
}));

describe("ConversationDirectoryStore", () => {
	let mockUserDb: any;
	let mockSyncStore: any;
	let mockPb: any;

	// Données de test
	const mockSpaces = [
		{ id: "space1", name: "Espace Test 1" },
		{ id: "space2", name: "Espace Test 2" }
	];

	const mockConversations: ConversationSummariesResponse[] = [
		{
			id: "conv1",
			topic_id: "event1",
			topic_type: "event",
			topic_title: "Événement Test 1",
			space: "space1",
			last_message_timestamp: "2024-01-15T10:00:00Z",
			last_message_user: "user1",
			last_message_snippet: "Premier message de test",
			message_count: 5,
			created: "2024-01-01T10:00:00Z",
			updated: "2024-01-15T10:00:00Z",
			collectionId: "conv_summaries",
			collectionName: "conversation_summaries"
		},
		{
			id: "conv2",
			topic_id: "event2",
			topic_type: "event",
			topic_title: "Événement Test 2",
			space: "space2",
			last_message_timestamp: "2024-01-14T15:30:00Z",
			last_message_user: "user2",
			last_message_snippet: "Deuxième message de test",
			message_count: 3,
			created: "2024-01-01T11:00:00Z",
			updated: "2024-01-14T15:30:00Z",
			collectionId: "conv_summaries",
			collectionName: "conversation_summaries"
		},
		{
			id: "conv3",
			topic_id: "group1",
			topic_type: "group",
			topic_title: "Groupe Test",
			space: "space1",
			last_message_timestamp: "2024-01-13T09:00:00Z",
			last_message_user: "user3",
			last_message_snippet: "Message de groupe",
			message_count: 12,
			created: "2024-01-01T12:00:00Z",
			updated: "2024-01-13T09:00:00Z",
			collectionId: "conv_summaries",
			collectionName: "conversation_summaries"
		}
	];

	beforeEach(() => {
		// Mock userDb
		mockUserDb = {
			id: "testuser",
			memberOf: mockSpaces.map((space) => ({ id: space.id, name: space.name }))
		};

		// Mock SyncStore
		mockSyncStore = {
			init: vi.fn().mockResolvedValue(undefined),
			destroy: vi.fn().mockResolvedValue(undefined),
			forceRefresh: vi.fn().mockResolvedValue(undefined),
			allRecords: mockConversations,
			isSyncing: false,
			error: null,
			getByIndex: vi.fn((indexName: string, value: string) => {
				switch (indexName) {
					case "bySpace":
						return mockConversations.filter((conv) => conv.space === value);
					case "byTopicType":
						return mockConversations.filter((conv) => conv.topic_type === value);
					case "byTopicId":
						return mockConversations.filter((conv) => conv.topic_id === value);
					default:
						return [];
				}
			})
		};

		// Mock de SyncStore constructor
		vi.doMock("$lib/shared/syncState.svelte", () => ({
			SyncStore: vi.fn().mockImplementation(() => mockSyncStore)
		}));

		// Mock userDb
		vi.doMock("$lib/shared/userDb.svelte", () => ({
			userDb: mockUserDb
		}));

		// Mock PocketBase
		mockPb = {
			collection: vi.fn().mockReturnValue({
				getFullList: vi.fn().mockResolvedValue(mockConversations),
				subscribe: vi.fn(),
				unsubscribe: vi.fn()
			})
		};

		vi.doMock("$lib/pocketbase.svelte", () => ({
			pb: mockPb
		}));
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	describe("Initialisation", () => {
		it("devrait s'initialiser avec les espaces de l'utilisateur", async () => {
			await conversationDirectoryStore.init();

			expect(conversationDirectoryStore.isInitialized).toBe(true);
			expect(conversationDirectoryStore.currentFilter).toContain("space1");
			expect(conversationDirectoryStore.currentFilter).toContain("space2");
		});

		it("ne devrait pas s'initialiser si l'utilisateur n'a pas d'espaces", async () => {
			mockUserDb.memberOf = [];

			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			await conversationDirectoryStore.init();

			expect(conversationDirectoryStore.isInitialized).toBe(false);
			expect(consoleSpy).toHaveBeenCalledWith(
				"[ConversationDirectoryStore] No user spaces available, aborting init."
			);
		});

		it("ne devrait pas s'initialiser si l'utilisateur n'est pas connecté", async () => {
			mockUserDb.id = null;

			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			await conversationDirectoryStore.init();

			expect(conversationDirectoryStore.isInitialized).toBe(false);
			expect(consoleSpy).toHaveBeenCalledWith(
				"[ConversationDirectoryStore] No user spaces available, aborting init."
			);
		});
	});

	describe("Accès aux conversations", () => {
		beforeEach(async () => {
			await conversationDirectoryStore.init();
		});

		afterEach(async () => {
			await conversationDirectoryStore.reset();
		});

		it("devrait retourner toutes les conversations", () => {
			const conversations = conversationDirectoryStore.conversations;
			expect(conversations).toHaveLength(3);
			expect(conversations[0].topic_title).toBe("Événement Test 1");
		});

		it("devrait filtrer par espace", () => {
			const space1Conversations = conversationDirectoryStore.getConversationsForSpace("space1");
			expect(space1Conversations).toHaveLength(2);
			expect(space1Conversations.every((conv) => conv.space === "space1")).toBe(true);

			const space2Conversations = conversationDirectoryStore.getConversationsForSpace("space2");
			expect(space2Conversations).toHaveLength(1);
			expect(space2Conversations[0].topic_title).toBe("Événement Test 2");
		});

		it("devrait filtrer par type", () => {
			const eventConversations = conversationDirectoryStore.getConversationsByType("event");
			expect(eventConversations).toHaveLength(2);
			expect(eventConversations.every((conv) => conv.topic_type === "event")).toBe(true);

			const groupConversations = conversationDirectoryStore.getConversationsByType("group");
			expect(groupConversations).toHaveLength(1);
			expect(groupConversations[0].topic_title).toBe("Groupe Test");

			const dmConversations = conversationDirectoryStore.getConversationsByType("dm");
			expect(dmConversations).toHaveLength(0);
		});

		it("devrait trouver une conversation spécifique", () => {
			const conversation = conversationDirectoryStore.findConversation("event1", "event");
			expect(conversation).toBeDefined();
			expect(conversation?.topic_title).toBe("Événement Test 1");

			const notFound = conversationDirectoryStore.findConversation("nonexistent");
			expect(notFound).toBeUndefined();
		});
	});

	describe("Recherche et filtrage", () => {
		beforeEach(async () => {
			await conversationDirectoryStore.init();
		});

		afterEach(async () => {
			await conversationDirectoryStore.reset();
		});

		it("devrait effectuer une recherche textuelle", () => {
			const results = conversationDirectoryStore.search("Test 1");
			expect(results).toHaveLength(1);
			expect(results[0].topic_title).toBe("Événement Test 1");

			const multipleResults = conversationDirectoryStore.search("test");
			expect(multipleResults).toHaveLength(3); // Tous contiennent "test"

			const snippetSearch = conversationDirectoryStore.search("groupe");
			expect(snippetSearch).toHaveLength(1);
			expect(snippetSearch[0].last_message_snippet).toBe("Message de groupe");
		});

		it("devrait retourner toutes les conversations pour une recherche vide", () => {
			const results = conversationDirectoryStore.search("");
			expect(results).toHaveLength(3);

			const whitespaceResults = conversationDirectoryStore.search("   ");
			expect(whitespaceResults).toHaveLength(3);
		});

		it("devrait identifier les conversations récentes", () => {
			// Mock des dates récentes
			const now = new Date("2024-01-15T12:00:00Z");
			vi.setSystemTime(now);

			const recent = conversationDirectoryStore.recentConversations;
			expect(recent).toHaveLength(2); // conv1 et conv2 sont récentes

			vi.useRealTimers();
		});

		it("devrait identifier les conversations actives", () => {
			// Mock d'une date dans la semaine passée
			const now = new Date("2024-01-20T12:00:00Z");
			vi.setSystemTime(now);

			const active = conversationDirectoryStore.activeConversations;
			expect(active).toHaveLength(3); // Toutes les conversations sont dans les 7 derniers jours

			vi.useRealTimers();
		});
	});

	describe("Statistiques et groupement", () => {
		beforeEach(async () => {
			await conversationDirectoryStore.init();
		});

		afterEach(async () => {
			await conversationDirectoryStore.reset();
		});

		it("devrait grouper par espace", () => {
			const bySpace = conversationDirectoryStore.conversationsBySpace;
			expect(Object.keys(bySpace)).toHaveLength(2);
			expect(bySpace["space1"]).toHaveLength(2);
			expect(bySpace["space2"]).toHaveLength(1);
		});

		it("devrait grouper par type", () => {
			const byType = conversationDirectoryStore.conversationsByType;
			expect(byType["event"]).toHaveLength(2);
			expect(byType["group"]).toHaveLength(1);
		});

		it("devrait calculer les statistiques", () => {
			const stats = conversationDirectoryStore.stats;
			expect(stats.total).toBe(3);
			expect(stats.byType.events).toBe(2);
			expect(stats.byType.groups).toBe(1);
			expect(stats.byType.directMessages).toBe(0);
			expect(stats.spaces).toBe(2);
		});
	});

	describe("Méthodes utilitaires", () => {
		beforeEach(async () => {
			await conversationDirectoryStore.init();
		});

		afterEach(async () => {
			await conversationDirectoryStore.reset();
		});

		it("devrait vérifier l'existence d'une conversation", () => {
			expect(conversationDirectoryStore.hasConversation("event1", "event")).toBe(true);
			expect(conversationDirectoryStore.hasConversation("nonexistent")).toBe(false);
		});

		it("devrait retourner le nombre de messages", () => {
			expect(conversationDirectoryStore.getMessageCount("event1", "event")).toBe(5);
			expect(conversationDirectoryStore.getMessageCount("group1", "group")).toBe(12);
			expect(conversationDirectoryStore.getMessageCount("nonexistent")).toBe(0);
		});

		it("devrait retourner le dernier message", () => {
			const lastMessage = conversationDirectoryStore.getLastMessage("event1", "event");
			expect(lastMessage).toEqual({
				snippet: "Premier message de test",
				timestamp: "2024-01-15T10:00:00Z",
				user: "user1"
			});

			const notFound = conversationDirectoryStore.getLastMessage("nonexistent");
			expect(notFound).toBeNull();
		});
	});

	describe("Gestion du cycle de vie", () => {
		it("devrait se réinitialiser correctement", async () => {
			await conversationDirectoryStore.init();
			expect(conversationDirectoryStore.isInitialized).toBe(true);

			await conversationDirectoryStore.reset();
			expect(conversationDirectoryStore.isInitialized).toBe(false);
			expect(conversationDirectoryStore.currentFilter).toBe("");
		});

		it("devrait se rafraîchir (reset + init)", async () => {
			await conversationDirectoryStore.init();
			const originalFilter = conversationDirectoryStore.currentFilter;

			// Changer les espaces utilisateur
			mockUserDb.memberOf = [{ id: "space3", name: "Nouvel Espace" }];

			await conversationDirectoryStore.refresh();

			expect(conversationDirectoryStore.isInitialized).toBe(true);
			expect(conversationDirectoryStore.currentFilter).not.toBe(originalFilter);
			expect(conversationDirectoryStore.currentFilter).toContain("space3");
		});

		it("devrait forcer un rafraîchissement des données", async () => {
			await conversationDirectoryStore.init();
			await conversationDirectoryStore.forceRefresh();

			expect(mockSyncStore.forceRefresh).toHaveBeenCalled();
		});
	});

	describe("États et erreurs", () => {
		it("devrait indiquer l'état de chargement", async () => {
			mockSyncStore.isSyncing = true;
			await conversationDirectoryStore.init();

			expect(conversationDirectoryStore.isLoading).toBe(true);

			mockSyncStore.isSyncing = false;
			expect(conversationDirectoryStore.isLoading).toBe(false);
		});

		it("devrait exposer les erreurs de synchronisation", async () => {
			const errorMessage = "Erreur de test";
			mockSyncStore.error = { message: errorMessage };

			await conversationDirectoryStore.init();

			expect(conversationDirectoryStore.error).toBe(errorMessage);
		});

		it("devrait gérer l'absence de SyncStore", () => {
			// Test avec store non initialisé
			expect(conversationDirectoryStore.conversations).toEqual([]);
			expect(conversationDirectoryStore.getConversationsForSpace("space1")).toEqual([]);
			expect(conversationDirectoryStore.findConversation("event1")).toBeUndefined();
		});
	});
});
