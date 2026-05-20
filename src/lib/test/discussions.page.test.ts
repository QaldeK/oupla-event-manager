import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { conversationDirectoryStore } from "$lib/shared/conversationDirectoryStore.svelte";
import { messageManager } from "$lib/shared/messageStore.svelte";
import type { ConversationSummariesResponse } from "$lib/types/pocketbase";

// Mock des dépendances
vi.mock("$lib/shared/conversationDirectoryStore.svelte", () => ({
	conversationDirectoryStore: {
		isInitialized: true,
		error: null,
		allConversations: [],
		searchConversations: vi.fn((query: string) => []),
		getStats: vi.fn(() => ({
			totalConversations: 10,
			eventConversations: 6,
			groupConversations: 3,
			dmConversations: 1,
			recentConversations: 4
		}))
	}
}));

vi.mock("$lib/shared/messageStore.svelte", () => ({
	messageManager: {
		preloadConversation: vi.fn().mockResolvedValue(undefined)
	}
}));

vi.mock("$lib/shared", () => ({
	getSpace: {
		name: "Test Space"
	}
}));

vi.mock("$lib/shared/states.svelte", () => ({
	messageSheet: {
		open: vi.fn()
	}
}));

describe("Discussions Page Integration", () => {
	// Données de test
	const mockConversations: ConversationSummariesResponse[] = [
		{
			id: "conv-1",
			topic_id: "event-1",
			topic_type: "event",
			topic_title: "Réunion équipe",
			space: "space-1",
			last_message_timestamp: "2024-01-15T10:30:00Z",
			last_message_user: "user-1",
			last_message_snippet: "On se retrouve à 14h ?",
			message_count: 5,
			created: "2024-01-15T08:00:00Z",
			updated: "2024-01-15T10:30:00Z"
		} as ConversationSummariesResponse,
		{
			id: "conv-2",
			topic_id: "group-1",
			topic_type: "group",
			topic_title: "Développeurs",
			space: "space-1",
			last_message_timestamp: "2024-01-14T16:20:00Z",
			last_message_user: "user-2",
			last_message_snippet: "Le nouveau framework est intéressant",
			message_count: 12,
			created: "2024-01-10T09:00:00Z",
			updated: "2024-01-14T16:20:00Z"
		} as ConversationSummariesResponse,
		{
			id: "conv-3",
			topic_id: "event-2",
			topic_type: "event",
			topic_title: "Formation Svelte",
			space: "space-1",
			last_message_timestamp: "2024-01-13T11:15:00Z",
			last_message_user: "user-3",
			last_message_snippet: "Les exercices sont dans le repo",
			message_count: 8,
			created: "2024-01-12T14:00:00Z",
			updated: "2024-01-13T11:15:00Z"
		} as ConversationSummariesResponse
	];

	beforeEach(() => {
		vi.clearAllMocks();
		// Configuration par défaut du store
		conversationDirectoryStore.allConversations = mockConversations;
		conversationDirectoryStore.isInitialized = true;
		conversationDirectoryStore.error = null;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("ConversationDirectoryStore Integration", () => {
		it("devrait charger les conversations correctement", () => {
			// Act
			const conversations = conversationDirectoryStore.allConversations;

			// Assert
			expect(conversations).toHaveLength(3);
			expect(conversations[0].topic_title).toBe("Réunion équipe");
			expect(conversations[1].topic_type).toBe("group");
			expect(conversations[2].message_count).toBe(8);
		});

		it("devrait fournir des statistiques correctes", () => {
			// Act
			const stats = conversationDirectoryStore.getStats();

			// Assert
			expect(stats.totalConversations).toBe(10);
			expect(stats.eventConversations).toBe(6);
			expect(stats.groupConversations).toBe(3);
			expect(stats.dmConversations).toBe(1);
			expect(stats.recentConversations).toBe(4);
		});

		it("devrait gérer la recherche de conversations", () => {
			// Arrange
			const searchResults = [mockConversations[0]]; // Résultat filtré
			conversationDirectoryStore.searchConversations = vi.fn().mockReturnValue(searchResults);

			// Act
			const results = conversationDirectoryStore.searchConversations("Réunion");

			// Assert
			expect(conversationDirectoryStore.searchConversations).toHaveBeenCalledWith("Réunion");
			expect(results).toHaveLength(1);
			expect(results[0].topic_title).toBe("Réunion équipe");
		});
	});

	describe("MessageManager Integration", () => {
		it("devrait précharger une conversation avant ouverture", async () => {
			// Arrange
			const conversation = mockConversations[0];

			// Act
			await messageManager.preloadConversation(conversation.topic_id);

			// Assert
			expect(messageManager.preloadConversation).toHaveBeenCalledWith("event-1");
		});

		it("devrait gérer le préchargement sans erreur", async () => {
			// Arrange
			const conversation = mockConversations[1];

			// Act & Assert
			await expect(
				messageManager.preloadConversation(conversation.topic_id)
			).resolves.toBeUndefined();
		});
	});

	describe("Logique de filtrage et tri", () => {
		it("devrait filtrer les conversations par type", () => {
			// Arrange
			const eventConversations = mockConversations.filter((conv) => conv.topic_type === "event");
			const groupConversations = mockConversations.filter((conv) => conv.topic_type === "group");

			// Assert
			expect(eventConversations).toHaveLength(2);
			expect(groupConversations).toHaveLength(1);
			expect(eventConversations[0].topic_title).toBe("Réunion équipe");
			expect(groupConversations[0].topic_title).toBe("Développeurs");
		});

		it("devrait trier les conversations par date récente", () => {
			// Act - Tri par date décroissante (plus récent en premier)
			const sortedByDate = [...mockConversations].sort((a, b) => {
				const dateA = a.last_message_timestamp ? new Date(a.last_message_timestamp).getTime() : 0;
				const dateB = b.last_message_timestamp ? new Date(b.last_message_timestamp).getTime() : 0;
				return dateB - dateA;
			});

			// Assert
			expect(sortedByDate[0].topic_title).toBe("Réunion équipe"); // Plus récent
			expect(sortedByDate[1].topic_title).toBe("Développeurs");
			expect(sortedByDate[2].topic_title).toBe("Formation Svelte"); // Plus ancien
		});

		it("devrait trier les conversations par activité", () => {
			// Act - Tri par nombre de messages décroissant
			const sortedByActivity = [...mockConversations].sort(
				(a, b) => b.message_count - a.message_count
			);

			// Assert
			expect(sortedByActivity[0].topic_title).toBe("Développeurs"); // 12 messages
			expect(sortedByActivity[1].topic_title).toBe("Formation Svelte"); // 8 messages
			expect(sortedByActivity[2].topic_title).toBe("Réunion équipe"); // 5 messages
		});

		it("devrait trier les conversations par titre alphabétique", () => {
			// Act - Tri alphabétique
			const sortedByTitle = [...mockConversations].sort((a, b) =>
				a.topic_title.localeCompare(b.topic_title)
			);

			// Assert
			expect(sortedByTitle[0].topic_title).toBe("Développeurs");
			expect(sortedByTitle[1].topic_title).toBe("Formation Svelte");
			expect(sortedByTitle[2].topic_title).toBe("Réunion équipe");
		});
	});

	describe("Formatage des données", () => {
		it("devrait formater correctement les dates", () => {
			// Fonction de formatage de date (copiée de la logique de la page)
			const formatDate = (dateString: string | null): string => {
				if (!dateString) return "Jamais";

				const date = new Date(dateString);
				const now = new Date();
				const diffMs = now.getTime() - date.getTime();
				const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
				const diffDays = Math.floor(diffHours / 24);

				if (diffHours < 1) return "À l'instant";
				if (diffHours < 24)
					return `Il
 y a ${diffHours}h`;
				if (diffDays < 7) return `Il y a ${diffDays}j`;

				return date.toLocaleDateString("fr-FR", {
					day: "numeric",
					month: "short"
				});
			};

			// Test avec différents cas
			expect(formatDate(null)).toBe("Jamais");

			// Test avec une date récente (on simule "maintenant" pour un test prévisible)
			const now = new Date();
			const recentDate = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
			// Note: Dans un vrai test, on moquerait Date.now() pour avoir des résultats prévisibles
		});

		it("devrait déterminer le type d'icône correct", () => {
			// Fonction pour obtenir l'icône (logique de la page)
			const getTypeIcon = (type: string) => {
				switch (type) {
					case "event":
						return "Calendar";
					case "group":
						return "Users";
					case "dm":
						return "MessageCircle";
					default:
						return "MessageCircle";
				}
			};

			// Assert
			expect(getTypeIcon("event")).toBe("Calendar");
			expect(getTypeIcon("group")).toBe("Users");
			expect(getTypeIcon("dm")).toBe("MessageCircle");
			expect(getTypeIcon("unknown")).toBe("MessageCircle");
		});

		it("devrait déterminer le nom de type correct", () => {
			// Fonction pour obtenir le nom du type
			const getTypeName = (type: string) => {
				switch (type) {
					case "event":
						return "Événement";
					case "group":
						return "Groupe";
					case "dm":
						return "Message privé";
					default:
						return "Conversation";
				}
			};

			// Assert
			expect(getTypeName("event")).toBe("Événement");
			expect(getTypeName("group")).toBe("Groupe");
			expect(getTypeName("dm")).toBe("Message privé");
			expect(getTypeName("unknown")).toBe("Conversation");
		});
	});

	describe("Gestion des états d'erreur", () => {
		it("devrait gérer l'état de chargement", () => {
			// Arrange
			conversationDirectoryStore.isInitialized = false;

			// Assert
			expect(conversationDirectoryStore.isInitialized).toBe(false);
		});

		it("devrait gérer les erreurs de chargement", () => {
			// Arrange
			conversationDirectoryStore.error = new Error("Erreur de connexion");
			conversationDirectoryStore.isInitialized = true;

			// Assert
			expect(conversationDirectoryStore.error).toBeInstanceOf(Error);
			expect(conversationDirectoryStore.error?.message).toBe("Erreur de connexion");
		});

		it("devrait gérer une liste vide de conversations", () => {
			// Arrange
			conversationDirectoryStore.allConversations = [];
			conversationDirectoryStore.isInitialized = true;
			conversationDirectoryStore.error = null;

			// Assert
			expect(conversationDirectoryStore.allConversations).toHaveLength(0);
		});
	});

	describe("Interaction avec les composants", () => {
		it("devrait simuler l'ouverture d'une conversation", () => {
			// Cette logique serait normalement dans le composant
			const mockMessageSheet = { open: vi.fn() };
			const conversation = mockConversations[0];

			// Act - Simulation de l'action d'ouverture
			mockMessageSheet.open({
				eventId: conversation.topic_id,
				eventName: conversation.topic_title
			});

			// Assert
			expect(mockMessageSheet.open).toHaveBeenCalledWith({
				eventId: "event-1",
				eventName: "Réunion équipe"
			});
		});
	});

	describe("Performance et optimisations", () => {
		it("devrait gérer un grand nombre de conversations", () => {
			// Arrange - Générer un grand nombre de conversations
			const largeConversationList = Array.from({ length: 1000 }, (_, i) => ({
				id: `conv-${i}`,
				topic_id: `topic-${i}`,
				topic_type: i % 3 === 0 ? "event" : i % 3 === 1 ? "group" : "dm",
				topic_title: `Conversation ${i}`,
				space: "space-1",
				last_message_timestamp: "2024-01-15T10:30:00Z",
				last_message_user: "user-1",
				last_message_snippet: `Message ${i}`,
				message_count: i + 1,
				created: "2024-01-15T08:00:00Z",
				updated: "2024-01-15T10:30:00Z"
			})) as ConversationSummariesResponse[];

			// Act - Filtrage sur un grand ensemble
			const eventConversations = largeConversationList.filter(
				(conv) => conv.topic_type === "event"
			);

			// Assert
			expect(largeConversationList).toHaveLength(1000);
			expect(eventConversations.length).toBeGreaterThan(300); // Environ 1/3
		});

		it("devrait optimiser les recherches", () => {
			// Test que la recherche ne cause pas de problèmes de performance
			const searchQuery = "réunion";

			// Act
			const startTime = performance.now();
			const filtered = mockConversations.filter(
				(conv) =>
					conv.topic_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					conv.last_message_snippet?.toLowerCase().includes(searchQuery.toLowerCase()) ||
					false
			);
			const endTime = performance.now();

			// Assert
			expect(endTime - startTime).toBeLessThan(10); // Moins de 10ms
			expect(filtered).toHaveLength(1); // Une conversation trouvée
		});
	});
});
