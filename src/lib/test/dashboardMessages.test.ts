// src/lib/test/globalMessagesStore.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { globalMessagesStore } from "$lib/shared/globalMessagesStore.svelte";
import type { MessagesResponse } from "$lib/types/pocketbase";

// Mock des dépendances
const mockGetFullList = vi.fn();

vi.mock("$lib/shared/userDb.svelte", () => ({
	pb: {
		collection: vi.fn(() => ({
			getFullList: mockGetFullList
		}))
	},
	userDb: {
		id: "user123"
	}
}));

// Mock des messages de test
const mockMessages: MessagesResponse[] = [
	{
		id: "msg1",
		content: "Premier message de test",
		created: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
		updated: new Date().toISOString(),
		user: "user456",
		event: "event1",
		replyingTo: null,
		space: "space1",
		isEdited: false,
		users_concerned: ["user123", "user456"],
		collectionId: "messages_id",
		collectionName: "messages" as any,
		expand: {
			user: {
				id: "user456",
				username: "testuser",
				email: "test@example.com",
				created: "",
				updated: "",
				emailVisibility: false,
				verified: false,
				collectionId: "",
				collectionName: "users" as any,
				expand: {}
			},
			event: {
				id: "event1",
				event_title: "Événement Test",
				created: "",
				updated: "",
				collectionId: "",
				collectionName: "events" as any,
				expand: {}
			}
		}
	},
	{
		id: "msg2",
		content: "Deuxième message de test",
		created: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
		updated: new Date().toISOString(),
		user: "user789",
		event: "event2",
		replyingTo: "msg1",
		space: "space2",
		isEdited: false,
		users_concerned: ["user123", "user789"],
		collectionId: "messages_id",
		collectionName: "messages" as any,
		expand: {}
	},
	{
		id: "msg3",
		content: "Message récent",
		created: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(), // 1.5 hours ago
		updated: new Date().toISOString(),
		user: "user456",
		event: null,
		replyingTo: null,
		space: "space1",
		isEdited: false,
		users_concerned: ["user123", "user456"],
		collectionId: "messages_id",
		collectionName: "messages" as any,
		expand: {}
	},
	{
		id: "msg4",
		content: "Message ancien",
		created: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), // 25 hours ago
		updated: new Date().toISOString(),
		user: "user456",
		event: "event3",
		replyingTo: null,
		space: "space1",
		isEdited: false,
		users_concerned: ["user123", "user456"],
		collectionId: "messages_id",
		collectionName: "messages" as any,
		expand: {}
	}
];

describe("globalMessagesStore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		globalMessagesStore.reset();
	});

	afterEach(() => {
		globalMessagesStore.reset();
	});

	describe("État initial", () => {
		it("devrait avoir un état initial correct", () => {
			expect(globalMessagesStore.messages).toEqual([]);
			expect(globalMessagesStore.isLoading).toBe(false);
			expect(globalMessagesStore.error).toBeNull();
			expect(globalMessagesStore.isDataFresh).toBe(false);
		});
	});

	describe("Récupération des messages", () => {
		it("devrait récupérer les messages avec succès", async () => {
			mockGetFullList.mockResolvedValue(mockMessages);

			await globalMessagesStore.messages();

			expect(mockGetFullList).toHaveBeenCalledWith({
				filter: 'users_concerned ~ "user123"',
				sort: "-created",
				expand: "user,event",
				fields:
					"id,content,created,user,event,replyingTo,space,expand.user.username,expand.event.event_title"
			});

			expect(globalMessagesStore.messages).toEqual(mockMessages);
			expect(globalMessagesStore.isLoading).toBe(false);
			expect(globalMessagesStore.error).toBeNull();
			expect(globalMessagesStore.isDataFresh).toBe(true);
		});

		it("devrait gérer les erreurs de récupération", async () => {
			const errorMessage = "Erreur de réseau";
			mockGetFullList.mockRejectedValue(new Error(errorMessage));

			await globalMessagesStore.messages();

			expect(globalMessagesStore.messages).toEqual([]);
			expect(globalMessagesStore.isLoading).toBe(false);
			expect(globalMessagesStore.error).toBe(errorMessage);
		});

		it("devrait gérer les erreurs non-Error", async () => {
			mockGetFullList.mockRejectedValue("String error");

			await globalMessagesStore.messages();

			expect(globalMessagesStore.error).toBe("Erreur lors du chargement des messages");
		});

		it("ne devrait pas refetch si les données sont fraîches", async () => {
			mockGetFullList.mockResolvedValue(mockMessages);

			// Premier fetch
			await globalMessagesStore.messages();
			expect(mockGetFullList).toHaveBeenCalledTimes(1);

			// Deuxième fetch sans forceRefresh
			await globalMessagesStore.messages();
			expect(mockGetFullList).toHaveBeenCalledTimes(1); // Pas d'appel supplémentaire
		});

		it("devrait refetch si forceRefresh est true", async () => {
			mockGetFullList.mockResolvedValue(mockMessages);

			// Premier fetch
			await globalMessagesStore.messages();
			expect(mockGetFullList).toHaveBeenCalledTimes(1);

			// Deuxième fetch avec forceRefresh
			await globalMessagesStore.messages(true);
			expect(mockGetFullList).toHaveBeenCalledTimes(2);
		});

		it("ne devrait pas fetch si pas d'ID utilisateur", async () => {
			// Mock userDb sans ID
			const { userDb } = await import("$lib/shared/userDb.svelte");
			vi.mocked(userDb).id = "";

			await globalMessagesStore.messages();

			expect(mockGetFullList).not.toHaveBeenCalled();
			expect(globalMessagesStore.messages).toEqual([]);
		});

		it("devrait mettre l'état de chargement pendant le fetch", async () => {
			let resolvePromise: (value: any) => void;
			const promise = new Promise((resolve) => {
				resolvePromise = resolve;
			});
			mockGetFullList.mockReturnValue(promise);

			const fetchPromise = globalMessagesStore.messages();

			// Pendant le chargement
			expect(globalMessagesStore.isLoading).toBe(true);

			// Résoudre la promesse
			resolvePromise!(mockMessages);
			await fetchPromise;

			// Après le chargement
			expect(globalMessagesStore.isLoading).toBe(false);
		});
	});

	describe("Filtrage et groupement des messages", () => {
		beforeEach(async () => {
			mockGetFullList.mockResolvedValue(mockMessages);
			await globalMessagesStore.messages();
		});

		it("devrait grouper les messages par espace", () => {
			const messagesBySpace = globalMessagesStore.messagesBySpace;

			expect(messagesBySpace).toHaveProperty("space1");
			expect(messagesBySpace).toHaveProperty("space2");
			expect(messagesBySpace.space1).toHaveLength(3); // msg1, msg3, msg4
			expect(messagesBySpace.space2).toHaveLength(1); // msg2
		});

		it("devrait retourner les messages pour un espace donné", () => {
			const space1Messages = globalMessagesStore.getMessagesForSpace("space1");
			const space2Messages = globalMessagesStore.getMessagesForSpace("space2");

			expect(space1Messages).toHaveLength(3);
			expect(space2Messages).toHaveLength(1);
			expect(space1Messages.map((m) => m.id)).toEqual(["msg1", "msg3", "msg4"]);
			expect(space2Messages.map((m) => m.id)).toEqual(["msg2"]);
		});

		it("devrait retourner les messages récents (24h)", () => {
			const recentMessages = globalMessagesStore.recentMessages;

			// Seuls msg1, msg2, et msg3 sont dans les dernières 24h
			expect(recentMessages).toHaveLength(3);
			expect(recentMessages.map((m) => m.id)).toEqual(
				expect.arrayContaining(["msg1", "msg2", "msg3"])
			);
		});

		it("devrait retourner les messages non lus (approximation)", () => {
			const unreadMessages = globalMessagesStore.unreadMessages;

			// Messages créés dans les 2 dernières heures et pas par user123
			expect(unreadMessages).toHaveLength(3); // msg1, msg2, msg3 (tous créés par d'autres utilisateurs)
			expect(unreadMessages.map((m) => m.id)).toEqual(
				expect.arrayContaining(["msg1", "msg2", "msg3"])
			);
		});

		it("devrait exclure les messages de l'utilisateur des non lus", async () => {
			const messagesWithUserMessage = [
				...mockMessages,
				{
					...mockMessages[0],
					id: "msg5",
					user: "user123", // Message de l'utilisateur
					created: new Date(Date.now() - 1000 * 60 * 30).toISOString()
				}
			];

			mockGetFullList.mockResolvedValue(messagesWithUserMessage);
			await globalMessagesStore.messages(true);

			const unreadMessages = globalMessagesStore.unreadMessages;

			// Ne devrait pas inclure msg5 car c'est un message de user123
			expect(unreadMessages.map((m) => m.id)).not.toContain("msg5");
		});
	});

	describe("Gestion de la fraîcheur des données", () => {
		it("devrait considérer les données comme fraîches après un fetch", async () => {
			mockGetFullList.mockResolvedValue(mockMessages);

			expect(globalMessagesStore.isDataFresh).toBe(false);

			await globalMessagesStore.messages();

			expect(globalMessagesStore.isDataFresh).toBe(true);
		});

		it("devrait considérer les données comme non fraîches après reset", async () => {
			mockGetFullList.mockResolvedValue(mockMessages);
			await globalMessagesStore.messages();

			expect(globalMessagesStore.isDataFresh).toBe(true);

			globalMessagesStore.reset();

			expect(globalMessagesStore.isDataFresh).toBe(false);
		});
	});

	describe("Manipulation des messages", () => {
		beforeEach(async () => {
			mockGetFullList.mockResolvedValue(mockMessages);
			await globalMessagesStore.messages();
		});

		it("devrait ajouter un nouveau message si l'utilisateur est concerné", () => {
			const newMessage: MessagesResponse = {
				id: "msg_new",
				content: "Nouveau message",
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
				user: "user456",
				event: "event1",
				replyingTo: null,
				space: "space1",
				isEdited: false,
				users_concerned: ["user123", "user456"], // Utilisateur concerné
				collectionId: "messages_id",
				collectionName: "messages" as any,
				expand: {}
			};

			const initialCount = globalMessagesStore.messages.length;
			globalMessagesStore.addMessage(newMessage);

			expect(globalMessagesStore.messages).toHaveLength(initialCount + 1);
			expect(globalMessagesStore.messages[0]).toEqual(newMessage); // Ajouté en premier
		});

		it("ne devrait pas ajouter un message si l'utilisateur n'est pas concerné", () => {
			const newMessage: MessagesResponse = {
				id: "msg_new",
				content: "Nouveau message",
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
				user: "user456",
				event: "event1",
				replyingTo: null,
				space: "space1",
				isEdited: false,
				users_concerned: ["user456", "user789"], // Utilisateur non concerné
				collectionId: "messages_id",
				collectionName: "messages" as any,
				expand: {}
			};

			const initialCount = globalMessagesStore.messages.length;
			globalMessagesStore.addMessage(newMessage);

			expect(globalMessagesStore.messages).toHaveLength(initialCount); // Pas d'ajout
		});

		it("devrait mettre à jour un message existant", () => {
			const updatedMessage: MessagesResponse = {
				...mockMessages[0],
				content: "Message modifié",
				isEdited: true
			};

			globalMessagesStore.updateMessage("msg1", updatedMessage);

			const message = globalMessagesStore.messages.find((m) => m.id === "msg1");
			expect(message?.content).toBe("Message modifié");
			expect(message?.isEdited).toBe(true);
		});

		it("ne devrait pas lever d'erreur lors de la mise à jour d'un message inexistant", () => {
			const updatedMessage: MessagesResponse = {
				...mockMessages[0],
				id: "nonexistent",
				content: "Message modifié"
			};

			expect(() => {
				globalMessagesStore.updateMessage("nonexistent", updatedMessage);
			}).not.toThrow();

			// Le nombre de messages ne devrait pas changer
			expect(globalMessagesStore.messages).toHaveLength(mockMessages.length);
		});

		it("devrait supprimer un message", () => {
			const initialCount = globalMessagesStore.messages.length;
			globalMessagesStore.removeMessage("msg1");

			expect(globalMessagesStore.messages).toHaveLength(initialCount - 1);
			expect(globalMessagesStore.messages.find((m) => m.id === "msg1")).toBeUndefined();
		});

		it("ne devrait pas lever d'erreur lors de la suppression d'un message inexistant", () => {
			const initialCount = globalMessagesStore.messages.length;

			expect(() => {
				globalMessagesStore.removeMessage("nonexistent");
			}).not.toThrow();

			expect(globalMessagesStore.messages).toHaveLength(initialCount);
		});
	});

	describe("Reset", () => {
		it("devrait remettre à zéro toutes les données", async () => {
			mockGetFullList.mockResolvedValue(mockMessages);
			await globalMessagesStore.messages();

			// Vérifier que les données sont présentes
			expect(globalMessagesStore.messages).toHaveLength(mockMessages.length);
			expect(globalMessagesStore.error).toBeNull();

			// Reset
			globalMessagesStore.reset();

			// Vérifier que tout est remis à zéro
			expect(globalMessagesStore.messages).toEqual([]);
			expect(globalMessagesStore.error).toBeNull();
			expect(globalMessagesStore.isDataFresh).toBe(false);
		});
	});

	describe("Cas limites", () => {
		it("devrait gérer une liste vide de messages", async () => {
			mockGetFullList.mockResolvedValue([]);

			await globalMessagesStore.messages();

			expect(globalMessagesStore.messages).toEqual([]);
			expect(globalMessagesStore.messagesBySpace).toEqual({});
			expect(globalMessagesStore.recentMessages).toEqual([]);
			expect(globalMessagesStore.unreadMessages).toEqual([]);
		});

		it("devrait gérer les messages sans users_concerned", () => {
			const messagesWithoutUsersConcerned = mockMessages.map((msg) => ({
				...msg,
				users_concerned: undefined
			}));

			// Ne devrait pas lever d'erreur
			expect(() => {
				globalMessagesStore.addMessage(messagesWithoutUsersConcerned[0]);
			}).not.toThrow();

			// Le message ne devrait pas être ajouté car users_concerned est undefined
			expect(globalMessagesStore.messages).toHaveLength(mockMessages.length);
		});

		it("devrait gérer les dates invalides gracieusement", async () => {
			const messagesWithInvalidDates = [
				{
					...mockMessages[0],
					created: "invalid-date"
				}
			];

			mockGetFullList.mockResolvedValue(messagesWithInvalidDates);
			await globalMessagesStore.messages();

			// Ne devrait pas lever d'erreur lors de l'accès aux messages récents
			expect(() => {
				const _ = globalMessagesStore.recentMessages;
			}).not.toThrow();
		});
	});
});
