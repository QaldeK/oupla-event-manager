// src/lib/test/notificationSystem.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { notificationSystem } from "$lib/shared/notificationSystem.svelte";
import type { LogsResponse, MessagesResponse } from "$lib/types/pocketbase";

// Mock des dépendances
vi.mock("$lib/shared/globalLogsStore.svelte", () => ({
	globalLogsStore: {
		init: vi.fn().mockResolvedValue(undefined),
		reset: vi.fn().mockResolvedValue(undefined),
		allLogs: [],
		myInvitations: [],
		recentActivity: [],
		getMyLogsBySpace: vi.fn().mockReturnValue([]),
		isLoading: false,
		error: null
	}
}));

vi.mock("$lib/shared/globalMessagesStore.svelte", () => ({
	globalMessagesStore: {
		fetchMessages: vi.fn().mockResolvedValue(undefined),
		reset: vi.fn(),
		unreadMessages: [],
		recentMessages: [],
		getMessagesForSpace: vi.fn().mockReturnValue([]),
		isLoading: false,
		error: null
	}
}));

vi.mock("$lib/shared/userDb.svelte", () => ({
	userDb: {
		id: "user123"
	}
}));

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		})
	};
})();

Object.defineProperty(window, "localStorage", {
	value: localStorageMock
});

// Données de test
const mockLogs: LogsResponse[] = [
	{
		id: "log1",
		action: "sondage_proposed",
		collection_target: "events",
		record_target_id: "event1",
		user_actor_id: "user456",
		space: "space1",
		users_concerned: ["user123", "user456"],
		details: {
			event_title: "Événement Test",
			message: 'Nouvelles dates proposées pour "Événement Test"'
		},
		created: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
		updated: new Date().toISOString(),
		collectionId: "logs_id",
		collectionName: "logs" as any,
		expand: {
			user_actor_id: {
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
			}
		}
	},
	{
		id: "log2",
		action: "event_confirmed",
		collection_target: "events",
		record_target_id: "event2",
		user_actor_id: "user789",
		space: "space1",
		users_concerned: ["user123", "user789"],
		details: {
			event_title: "Événement Confirmé",
			message: 'L\'événement "Événement Confirmé" a été confirmé'
		},
		created: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
		updated: new Date().toISOString(),
		collectionId: "logs_id",
		collectionName: "logs" as any,
		expand: {}
	}
];

const mockMessages: MessagesResponse[] = [
	{
		id: "msg1",
		content: "Message de test",
		created: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
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
	}
];

describe("NotificationSystem", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		localStorageMock.clear();
		notificationSystem.reset();

		// Import et reset des mocks
		const { globalLogsStore } = await import("$lib/shared/globalLogsStore.svelte");
		const { globalMessagesStore } = await import("$lib/shared/globalMessagesStore.svelte");

		// Reset mocks to default values
		vi.mocked(globalLogsStore).allLogs = [];
		vi.mocked(globalLogsStore).myInvitations = [];
		vi.mocked(globalLogsStore).recentActivity = [];
		vi.mocked(globalLogsStore).isLoading = false;
		vi.mocked(globalLogsStore).error = null;

		vi.mocked(globalMessagesStore).unreadMessages = [];
		vi.mocked(globalMessagesStore).recentMessages = [];
		vi.mocked(globalMessagesStore).isLoading = false;
		vi.mocked(globalMessagesStore).error = null;
	});

	afterEach(() => {
		notificationSystem.reset();
	});

	describe("Initialisation", () => {
		it("devrait s'initialiser correctement", async () => {
			const { globalLogsStore } = await import("$lib/shared/globalLogsStore.svelte");
			const { globalMessagesStore } = await import("$lib/shared/globalMessagesStore.svelte");

			await notificationSystem.init();

			expect(globalLogsStore.init).toHaveBeenCalled();
			expect(globalMessagesStore.messages).toHaveBeenCalled();
			expect(notificationSystem.isInitialized).toBe(true);
		});

		it("ne devrait pas se réinitialiser si déjà initialisé", async () => {
			const { globalLogsStore } = await import("$lib/shared/globalLogsStore.svelte");
			const { globalMessagesStore } = await import("$lib/shared/globalMessagesStore.svelte");

			await notificationSystem.init();
			await notificationSystem.init(); // Deuxième appel

			expect(globalLogsStore.init).toHaveBeenCalledTimes(1);
			expect(globalMessagesStore.messages).toHaveBeenCalledTimes(1);
		});

		it("devrait gérer les erreurs d'initialisation", async () => {
			const { globalLogsStore } = await import("$lib/shared/globalLogsStore.svelte");

			vi.mocked(globalLogsStore.init).mockRejectedValue(new Error("Erreur de connexion"));

			await expect(notificationSystem.init()).rejects.toThrow("Erreur de connexion");
			expect(notificationSystem.isInitialized).toBe(false);
		});
	});

	describe("Données de notification", () => {
		beforeEach(async () => {
			const { globalLogsStore } = await import("$lib/shared/globalLogsStore.svelte");
			const { globalMessagesStore } = await import("$lib/shared/globalMessagesStore.svelte");

			vi.mocked(globalLogsStore).myInvitations = mockLogs;
			vi.mocked(globalLogsStore).recentActivity = mockLogs;
			vi.mocked(globalMessagesStore).unreadMessages = mockMessages;
			vi.mocked(globalMessagesStore).recentMessages = mockMessages;

			await notificationSystem.init();
		});

		it("devrait retourner les logs de notification", () => {
			expect(notificationSystem.notificationLogs).toEqual(mockLogs);
		});

		it("devrait retourner les messages non lus", () => {
			expect(notificationSystem.unreadMessages).toEqual(mockMessages);
		});

		it("devrait combiner l'activité récente", () => {
			const recentActivity = notificationSystem.recentActivity;

			expect(recentActivity).toHaveLength(3); // 2 logs + 1 message
			expect(recentActivity).toEqual(expect.arrayContaining([...mockLogs, ...mockMessages]));
		});

		it("devrait calculer le nombre d'éléments non lus", () => {
			expect(notificationSystem.unreadCount).toBe(3); // 2 logs + 1 message
		});

		it("devrait retourner 0 si non initialisé", () => {
			notificationSystem.reset();
			expect(notificationSystem.unreadCount).toBe(0);
			expect(notificationSystem.notificationLogs).toEqual([]);
		});
	});

	describe("États système", () => {
		it("devrait retourner l'état de chargement", async () => {
			const { globalLogsStore } = await import("$lib/shared/globalLogsStore.svelte");

			vi.mocked(globalLogsStore).isLoading = true;
			await notificationSystem.init();

			expect(notificationSystem.isLoading).toBe(true);
		});

		it("devrait retourner les erreurs", async () => {
			const { globalLogsStore } = await import("$lib/shared/globalLogsStore.svelte");

			vi.mocked(globalLogsStore).error = "Erreur de réseau";
			await notificationSystem.init();

			expect(notificationSystem.error).toBe("Erreur de réseau");
		});

		it("devrait prioriser l'erreur des logs", async () => {
			const { globalLogsStore } = await import("$lib/shared/globalLogsStore.svelte");
			const { globalMessagesStore } = await import("$lib/shared/globalMessagesStore.svelte");

			vi.mocked(globalLogsStore).error = "Erreur logs";
			vi.mocked(globalMessagesStore).error = "Erreur messages";
			await notificationSystem.init();

			expect(notificationSystem.error).toBe("Erreur logs");
		});
	});

	describe("Gestion de la lecture", () => {
		beforeEach(async () => {
			await notificationSystem.init();
		});

		it("devrait marquer les notifications comme lues", () => {
			notificationSystem.markAsRead();

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"notification_last_read_user123",
				expect.any(String)
			);
		});

		it("devrait charger la dernière date de lecture", async () => {
			const testDate = new Date().toISOString();
			localStorageMock.setItem("notification_last_read_user123", testDate);

			// Reset et réinitialise pour charger depuis localStorage
			notificationSystem.reset();
			await notificationSystem.init();

			expect(localStorageMock.getItem).toHaveBeenCalledWith("notification_last_read_user123");
		});

		it("devrait nettoyer la date de lecture lors du reset", () => {
			notificationSystem.markAsRead();
			notificationSystem.reset();

			expect(localStorageMock.removeItem).toHaveBeenCalledWith("notification_last_read_user123");
		});
	});

	describe("Génération de messages", () => {
		it("devrait générer un message pour un log avec détails", () => {
			const message = notificationSystem.generateLogMessage(mockLogs[0]);
			expect(message).toBe('Nouvelles dates proposées pour "Événement Test"');
		});

		it("devrait générer un message de fallback pour un log sans détails", () => {
			const logWithoutDetails = {
				...mockLogs[0],
				details: null,
				expand: {
					user_actor_id: {
						username: "testuser"
					}
				}
			};

			const message = notificationSystem.generateLogMessage(logWithoutDetails as any);
			expect(message).toContain("testuser");
			expect(message).toContain("sondage_proposed");
		});

		it("devrait générer un message pour différents types d'actions", () => {
			const testCases = [
				{ action: "create_event", expected: "a créé l'événement" },
				{ action: "event_confirmed", expected: "a été confirmé" },
				{ action: "create_pad", expected: "a créé le pad" },
				{ action: "delete_event", expected: "a été supprimé" }
			];

			testCases.forEach(({ action, expected }) => {
				const log = {
					...mockLogs[0],
					action,
					details: { event_title: "Test Event" },
					expand: { user_actor_id: { username: "testuser" } }
				};

				const message = notificationSystem.generateLogMessage(log as any);
				expect(message).toContain(expected);
			});
		});

		it("devrait générer un message de notification pour un message", () => {
			const notification = notificationSystem.generateMessageNotification(mockMessages[0]);
			expect(notification).toBe('testuser a écrit dans "Événement Test"');
		});

		it("devrait gérer un message sans événement lié", () => {
			const messageWithoutEvent = {
				...mockMessages[0],
				event: null,
				expand: {
					user: { username: "testuser" }
				}
			};

			const notification = notificationSystem.generateMessageNotification(
				messageWithoutEvent as any
			);
			expect(notification).toBe("testuser a écrit un message");
		});
	});

	describe("Formatage du temps", () => {
		it("devrait formater les temps récents", () => {
			const now = new Date();

			// À l'instant
			const justNow = new Date(now.getTime() - 30 * 1000).toISOString();
			expect(notificationSystem.formatRelativeTime(justNow)).toBe("À l'instant");

			// Minutes
			const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
			expect(notificationSystem.formatRelativeTime(fiveMinutesAgo)).toBe("Il y a 5 minutes");

			// Heures
			const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
			expect(notificationSystem.formatRelativeTime(twoHoursAgo)).toBe("Il y a 2 heures");

			// Jours
			const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
			expect(notificationSystem.formatRelativeTime(threeDaysAgo)).toBe("Il y a 3 jours");
		});

		it("devrait formater les dates anciennes", () => {
			const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
			const formatted = notificationSystem.formatRelativeTime(oldDate);

			// Devrait être au format JJ MMM
			expect(formatted).toMatch(/\d{1,2}\s\w{3,4}/);
		});
	});

	describe("Filtrage par espace", () => {
		beforeEach(async () => {
			mockglobalMessagesStore.getMessagesForSpace.mockImplementation((spaceId: string) => {
				return mockMessages.filter((msg) => msg.space === spaceId);
			});

			await notificationSystem.init();
		});

		it("devrait retourner les notifications pour un espace spécifique", async () => {
			const { globalLogsStore } = await import("$lib/shared/globalLogsStore.svelte");

			// Mock du comportement de globalLogsStore.getMyLogsBySpace
			vi.mocked(globalLogsStore.getMyLogsBySpace).mockReturnValue(
				mockLogs.filter((log) => log.space === "space1")
			);

			const notifications = notificationSystem.getNotificationsForSpace("space1");

			expect(notifications.logs).toHaveLength(2);
			expect(notifications.messages).toHaveLength(1);
			expect(notifications.count).toBe(3);
		});
	});

	describe("Rafraîchissement", () => {
		beforeEach(async () => {
			await notificationSystem.init();
		});

		it("devrait rafraîchir les données", async () => {
			const { globalMessagesStore } = await import("$lib/shared/globalMessagesStore.svelte");

			await notificationSystem.refresh();

			expect(globalMessagesStore.messages).toHaveBeenCalledWith(true);
		});

		it("devrait gérer les erreurs de rafraîchissement", async () => {
			const { globalMessagesStore } = await import("$lib/shared/globalMessagesStore.svelte");

			vi.mocked(globalMessagesStore.messages).mockRejectedValue(new Error("Erreur réseau"));

			// Ne devrait pas lever d'erreur
			await expect(notificationSystem.refresh()).resolves.toBeUndefined();
		});
	});

	describe("Détection des éléments non lus", () => {
		beforeEach(async () => {
			await notificationSystem.init();
		});

		it("devrait considérer tous les éléments comme non lus par défaut", () => {
			expect(notificationSystem.isUnread(mockLogs[0])).toBe(true);
			expect(notificationSystem.isUnread(mockMessages[0])).toBe(true);
		});

		it("devrait respecter la date de dernière lecture", () => {
			// Marquer comme lu maintenant
			notificationSystem.markAsRead();

			// Un élément ancien devrait être considéré comme lu
			const oldItem = {
				...mockLogs[0],
				created: new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 heure avant
			};

			// Un élément récent devrait être considéré comme non lu
			const newItem = {
				...mockLogs[0],
				created: new Date(Date.now() + 1000 * 60).toISOString() // 1 minute après
			};

			expect(notificationSystem.isUnread(oldItem)).toBe(false);
			expect(notificationSystem.isUnread(newItem)).toBe(true);
		});
	});

	describe("Compatibilité", () => {
		it("devrait exporter les fonctions de compatibilité", async () => {
			const { markNotificationsAsRead, generateNotificationMessage } =
				await import("$lib/shared/notificationSystem.svelte");

			expect(typeof markNotificationsAsRead).toBe("function");
			expect(typeof generateNotificationMessage).toBe("function");
		});
	});
});
