// src/lib/test/globalLogsStore.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { globalLogsStore } from "$lib/shared/globalLogsStore.svelte";
import type { LogsResponse } from "$lib/types/pocketbase";

// Mock des dépendances
vi.mock("$lib/shared/syncState.svelte", () => ({
	SyncStore: vi.fn().mockImplementation(() => ({
		init: vi.fn().mockResolvedValue(undefined),
		destroy: vi.fn().mockResolvedValue(undefined),
		allRecords: [],
		isSyncing: false,
		error: null
	}))
}));

vi.mock("$lib/shared/userDb.svelte", () => ({
	userDb: {
		memberOf: [
			{ id: "space1", name: "space1", public_name: "Space 1" },
			{ id: "space2", name: "space2", public_name: "Space 2" }
		],
		id: "user123"
	}
}));

// Mock des logs de test
const mockLogs: LogsResponse[] = [
	{
		id: "log1",
		action: "create_event",
		collection_target: "events",
		record_target_id: "event1",
		user_actor_id: "user123",
		space: "space1",
		users_concerned: ["user123", "user456"],
		details: {
			event_title: "Événement Test",
			message: "Nouvel événement créé"
		},
		created: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
		updated: new Date().toISOString(),
		collectionId: "logs_id",
		collectionName: "logs" as any,
		expand: {}
	},
	{
		id: "log2",
		action: "sondage_proposed",
		collection_target: "events",
		record_target_id: "event2",
		user_actor_id: "user456",
		space: "space1",
		users_concerned: ["user123", "user789"],
		details: {
			event_title: "Sondage Test",
			message: "Nouvelles dates proposées"
		},
		created: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
		updated: new Date().toISOString(),
		collectionId: "logs_id",
		collectionName: "logs" as any,
		expand: {}
	},
	{
		id: "log3",
		action: "create_pad",
		collection_target: "pads",
		record_target_id: "pad1",
		user_actor_id: "user789",
		space: "space2",
		users_concerned: ["user789"],
		details: {
			pad_title: "Pad Test",
			message: "Nouveau pad créé"
		},
		created: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), // 25 hours ago (not recent)
		updated: new Date().toISOString(),
		collectionId: "logs_id",
		collectionName: "logs" as any,
		expand: {}
	},
	{
		id: "log4",
		action: "organizers_changed",
		collection_target: "events",
		record_target_id: "event3",
		user_actor_id: "user456",
		space: "space1",
		users_concerned: ["user123", "user456"],
		details: {
			event_title: "Événement Modifié",
			message: "Organisateurs modifiés"
		},
		created: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 minutes ago
		updated: new Date().toISOString(),
		collectionId: "logs_id",
		collectionName: "logs" as any,
		expand: {}
	}
];

describe("GlobalLogsStore", () => {
	beforeEach(async () => {
		// Reset du store avant chaque test
		await globalLogsStore.reset();
		vi.clearAllMocks();
	});

	afterEach(async () => {
		await globalLogsStore.reset();
	});

	describe("Initialisation", () => {
		it("devrait s'initialiser correctement", async () => {
			const mockSyncStore = {
				init: vi.fn().mockResolvedValue(undefined),
				destroy: vi.fn().mockResolvedValue(undefined),
				allRecords: mockLogs,
				isSyncing: false,
				error: null
			};

			// Mock de la classe SyncStore pour retourner notre mock
			const { SyncStore } = await import("$lib/shared/syncState.svelte");
			vi.mocked(SyncStore).mockImplementation(() => mockSyncStore as any);

			await globalLogsStore.init();

			expect(SyncStore).toHaveBeenCalledWith({
				name: "globalLogs",
				version: 1,
				dbName: "globalLogs",
				sync: {
					mode: "realtime",
					filter: 'space.id ?~ {"space1","space2"}',
					sort: "-created",
					expand: "user_actor_id"
				}
			});

			expect(mockSyncStore.init).toHaveBeenCalledWith("logs");
		});

		it("ne devrait pas se réinitialiser si déjà initialisé", async () => {
			const { SyncStore } = await import("$lib/shared/syncState.svelte");
			const mockInit = vi.fn().mockResolvedValue(undefined);
			vi.mocked(SyncStore).mockImplementation(
				() =>
					({
						init: mockInit,
						destroy: vi.fn(),
						allRecords: [],
						isSyncing: false,
						error: null
					}) as any
			);

			await globalLogsStore.init();
			await globalLogsStore.init(); // Deuxième appel

			expect(mockInit).toHaveBeenCalledTimes(1);
		});

		it("ne devrait pas s'initialiser si l'utilisateur n'a pas d'espaces", async () => {
			// Mock userDb sans espaces
			const originalUserDb = await import("$lib/shared/userDb.svelte");
			vi.mocked(originalUserDb.userDb).memberOf = [];

			const { SyncStore } = await import("$lib/shared/syncState.svelte");
			const mockInit = vi.fn();
			vi.mocked(SyncStore).mockImplementation(
				() =>
					({
						init: mockInit,
						destroy: vi.fn(),
						allRecords: [],
						isSyncing: false,
						error: null
					}) as any
			);

			await globalLogsStore.init();

			expect(mockInit).not.toHaveBeenCalled();
		});
	});

	describe("Accès aux données", () => {
		beforeEach(async () => {
			const mockSyncStore = {
				init: vi.fn().mockResolvedValue(undefined),
				destroy: vi.fn().mockResolvedValue(undefined),
				allRecords: mockLogs,
				isSyncing: false,
				error: null
			};

			const { SyncStore } = await import("$lib/shared/syncState.svelte");
			vi.mocked(SyncStore).mockImplementation(() => mockSyncStore as any);

			await globalLogsStore.init();
		});

		it("devrait retourner tous les logs", () => {
			const allLogs = globalLogsStore.allLogs;
			expect(allLogs).toEqual(mockLogs);
		});

		it("devrait retourner les logs personnels de l'utilisateur", () => {
			const myLogs = globalLogsStore.myLogs;

			// Devrait inclure les logs où user123 est concerné ou est l'acteur
			const expectedLogs = mockLogs.filter(
				(log) => log.users_concerned?.includes("user123") || log.user_actor_id === "user123"
			);

			expect(myLogs).toEqual(expectedLogs);
			expect(myLogs).toHaveLength(3); // log1, log2, log4
		});

		it("devrait retourner l'activité récente (24h)", () => {
			const recentActivity = globalLogsStore.recentActivity;

			// Seuls log1 et log4 sont dans les dernières 24h ET concernent l'utilisateur
			expect(recentActivity).toHaveLength(2);
			expect(recentActivity.map((log) => log.id)).toEqual(["log1", "log4"]);
		});

		it("devrait retourner les invitations/sollicitations", () => {
			const invitations = globalLogsStore.myInvitations;

			// log2 et log4 sont des actions d'invitation et ne proviennent pas de user123
			expect(invitations).toHaveLength(2);
			expect(invitations.map((log) => log.id)).toEqual(expect.arrayContaining(["log2", "log4"]));
		});

		it("devrait retourner les logs par espace", () => {
			const space1Logs = globalLogsStore.getLogsBySpace("space1");
			const space2Logs = globalLogsStore.getLogsBySpace("space2");

			expect(space1Logs).toHaveLength(3); // log1, log2, log4
			expect(space2Logs).toHaveLength(1); // log3
		});

		it("devrait retourner les logs personnels par espace", () => {
			const mySpace1Logs = globalLogsStore.getMyLogsBySpace("space1");
			const mySpace2Logs = globalLogsStore.getMyLogsBySpace("space2");

			expect(mySpace1Logs).toHaveLength(3); // log1, log2, log4 (tous concernent user123)
			expect(mySpace2Logs).toHaveLength(0); // log3 ne concerne pas user123
		});

		it("devrait retourner l'activité générale d'un espace", () => {
			const generalActivity = globalLogsStore.getSpaceGeneralActivity("space1");

			// Aucun log car tous les logs de space1 concernent user123
			expect(generalActivity).toHaveLength(0);

			const space2GeneralActivity = globalLogsStore.getSpaceGeneralActivity("space2");
			expect(space2GeneralActivity).toHaveLength(1); // log3
		});
	});

	describe("États de chargement et erreurs", () => {
		it("devrait retourner l'état de chargement", async () => {
			const mockSyncStore = {
				init: vi.fn().mockResolvedValue(undefined),
				destroy: vi.fn().mockResolvedValue(undefined),
				allRecords: [],
				isSyncing: true,
				error: null
			};

			const { SyncStore } = await import("$lib/shared/syncState.svelte");
			vi.mocked(SyncStore).mockImplementation(() => mockSyncStore as any);

			await globalLogsStore.init();

			expect(globalLogsStore.isLoading).toBe(true);
		});

		it("devrait retourner les erreurs de synchronisation", async () => {
			const mockError = {
				message: "Erreur de connexion",
				timestamp: new Date(),
				details: "Connection failed"
			};

			const mockSyncStore = {
				init: vi.fn().mockResolvedValue(undefined),
				destroy: vi.fn().mockResolvedValue(undefined),
				allRecords: [],
				isSyncing: false,
				error: mockError
			};

			const { SyncStore } = await import("$lib/shared/syncState.svelte");
			vi.mocked(SyncStore).mockImplementation(() => mockSyncStore as any);

			await globalLogsStore.init();

			expect(globalLogsStore.error).toBe("Erreur de connexion");
		});

		it("devrait gérer les erreurs sans message", async () => {
			const mockError = {
				message: "",
				timestamp: new Date()
			};

			const mockSyncStore = {
				init: vi.fn().mockResolvedValue(undefined),
				destroy: vi.fn().mockResolvedValue(undefined),
				allRecords: [],
				isSyncing: false,
				error: mockError
			};

			const { SyncStore } = await import("$lib/shared/syncState.svelte");
			vi.mocked(SyncStore).mockImplementation(() => mockSyncStore as any);

			await globalLogsStore.init();

			expect(globalLogsStore.error).toBe("Erreur de synchronisation");
		});
	});

	describe("Nettoyage", () => {
		it("devrait nettoyer le store correctement", async () => {
			const mockDestroy = vi.fn().mockResolvedValue(undefined);
			const mockSyncStore = {
				init: vi.fn().mockResolvedValue(undefined),
				destroy: mockDestroy,
				allRecords: mockLogs,
				isSyncing: false,
				error: null
			};

			const { SyncStore } = await import("$lib/shared/syncState.svelte");
			vi.mocked(SyncStore).mockImplementation(() => mockSyncStore as any);

			await globalLogsStore.init();
			await globalLogsStore.reset();

			expect(mockDestroy).toHaveBeenCalled();
			expect(globalLogsStore.allLogs).toEqual([]);
		});

		it("devrait gérer le reset même si le store n'est pas initialisé", async () => {
			// Ne devrait pas lever d'erreur
			await expect(globalLogsStore.reset()).resolves.toBeUndefined();
		});
	});

	describe("Cas limites", () => {
		it("devrait retourner des tableaux vides quand le store n'est pas initialisé", () => {
			expect(globalLogsStore.allLogs).toEqual([]);
			expect(globalLogsStore.myLogs).toEqual([]);
			expect(globalLogsStore.recentActivity).toEqual([]);
			expect(globalLogsStore.myInvitations).toEqual([]);
		});

		it("devrait gérer l'absence d'ID utilisateur", async () => {
			// Mock userDb sans ID
			const originalUserDb = await import("$lib/shared/userDb.svelte");
			vi.mocked(originalUserDb.userDb).id = "";

			const mockSyncStore = {
				init: vi.fn().mockResolvedValue(undefined),
				destroy: vi.fn().mockResolvedValue(undefined),
				allRecords: mockLogs,
				isSyncing: false,
				error: null
			};

			const { SyncStore } = await import("$lib/shared/syncState.svelte");
			vi.mocked(SyncStore).mockImplementation(() => mockSyncStore as any);

			await globalLogsStore.init();

			expect(globalLogsStore.myLogs).toEqual([]);
			expect(globalLogsStore.getMyLogsBySpace("space1")).toEqual([]);
		});

		it("devrait gérer les logs sans users_concerned", () => {
			const logsWithoutUsersConcerned = [
				{
					...mockLogs[0],
					users_concerned: undefined
				}
			];

			const mockSyncStore = {
				init: vi.fn().mockResolvedValue(undefined),
				destroy: vi.fn().mockResolvedValue(undefined),
				allRecords: logsWithoutUsersConcerned,
				isSyncing: false,
				error: null
			};

			const { SyncStore } = await import("$lib/shared/syncState.svelte");
			vi.mocked(SyncStore).mockImplementation(() => mockSyncStore as any);

			// Ne devrait pas lever d'erreur
			expect(() => globalLogsStore.myLogs).not.toThrow();
		});
	});
});
