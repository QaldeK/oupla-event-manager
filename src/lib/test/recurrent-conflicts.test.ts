// src/lib/test/recurrent-conflicts.test.ts
/**
 * COMMANDES POUR EXÉCUTER CES TESTS :
 *
 * # Exécuter tous les tests de ce fichier
 * bun run test recurrent-conflicts.test.ts
 *
 * # Exécuter tous les tests
 * bun run test
 *
 * # Exécuter un test spécifique par nom
 * bun run test:unit -- -t "Événements récurrents avec conflits"
 * bun run test:unit -- -t "should create recurrent events and return correct IDs"
 * bun run test:unit -- -t "should handle conflicts for recurrent events"
 * bun run test:unit -- -t "should handle empty conflict list for recurrent events"
 * bun run test:unit -- -t "should handle errors gracefully during conflict update"
 * bun run test:unit -- -t "should handle recurrent events with different conflict patterns"
 *
 * # Exécuter avec watch mode
 * bun run test --watch recurrent-conflicts.test.ts
 *
 * # Note: Ces tests utilisent des mocks et ne touchent pas à la vraie base de données
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRecurrentEvent, pb } from "$lib/pocketbase.svelte";
import { handleEventConflictsAfterSave } from "$lib/services/eventActions";
import { getNewEvent, getDefaultRecurrence } from "$lib/services/eventActions";
import type { EventType } from "$lib/types/event.types";

// Mock des dépendances
vi.mock("$lib/pocketbase.svelte", () => ({
	pb: {
		collection: vi.fn(() => ({
			create: vi.fn(),
			getOne: vi.fn(),
			update: vi.fn()
		})),
		createBatch: vi.fn(() => ({
			collection: vi.fn(() => ({
				create: vi.fn()
			})),
			send: vi.fn()
		})),
		authStore: {
			record: { id: "test-user-id" }
		}
	},
	createRecurrentEvent: vi.fn(),
	updateEvent: vi.fn(),
	updateReciprocalConflicts: vi.fn()
}));

vi.mock("$lib/shared", () => ({
	showAlert: vi.fn(),
	getSpace: { id: "test-space-id" }
}));

vi.mock("$lib/utils", () => ({
	createEventDates: vi.fn((date, timeStart, timeEnd) => ({
		dateStart: `${date}T${timeStart}:00.000Z`,
		dateEnd: `${date}T${timeEnd}:00.000Z`
	}))
}));

describe("Événements récurrents avec conflits", () => {
	let mockEventData: Partial<EventType>;
	let mockRecurrence: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Configuration de base pour un événement récurrent
		mockEventData = {
			...getNewEvent(),
			event_title: "Atelier Test Récurrent",
			time_start: "14:00",
			time_end: "16:00",
			rooms: ["salle-1"],
			categories: ["atelier"],
			isRecurrent: true
		};

		mockRecurrence = {
			...getDefaultRecurrence(),
			recurrenceDates: ["2024-01-08", "2024-01-15", "2024-01-22"],
			recurrenceType: "WEEKLY"
		};

		mockEventData.recurrence = mockRecurrence;

		// Mock des réponses de PocketBase
		const mockMasterRecord = { id: "master-event-123" };
		const mockOccurrenceRecords = [
			{ id: "event-occurrence-1" },
			{ id: "event-occurrence-2" },
			{ id: "event-occurrence-3" }
		];

		// Mock de la création du master event
		const mockCollection = {
			create: vi.fn().mockResolvedValueOnce(mockMasterRecord),
			getOne: vi.fn(),
			update: vi.fn()
		};

		// Mock du batch
		const mockBatch = {
			collection: vi.fn(() => ({
				create: vi.fn()
			})),
			send: vi.fn().mockResolvedValue(mockOccurrenceRecords)
		};

		(pb.collection as any).mockReturnValue(mockCollection);
		(pb.createBatch as any).mockReturnValue(mockBatch);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should create recurrent events and return correct IDs", async () => {
		// Test de la fonction createRecurrentEvent
		const result = await createRecurrentEvent(mockEventData);

		expect(result).toBeDefined();
		expect(result.masterEventId).toBe("master-event-123");
		expect(result.eventIds).toHaveLength(3);
		expect(result.eventIds).toEqual([
			"event-occurrence-1",
			"event-occurrence-2",
			"event-occurrence-3"
		]);
	});

	it("should handle conflicts for recurrent events", async () => {
		// Simuler la création d'événements récurrents avec conflits
		const conflictIds = ["conflict-event-1", "conflict-event-2"];
		const createdEventIds = ["event-occurrence-1", "event-occurrence-2", "event-occurrence-3"];

		// Mock des fonctions de gestion des conflits
		const mockUpdateEvent = vi.fn().mockResolvedValue({});
		const mockUpdateReciprocalConflicts = vi.fn().mockResolvedValue({});

		vi.doMock("$lib/pocketbase.svelte", () => ({
			...vi.importActual("$lib/pocketbase.svelte"),
			updateEvent: mockUpdateEvent,
			updateReciprocalConflicts: mockUpdateReciprocalConflicts
		}));

		// Test de la gestion des conflits
		await handleEventConflictsAfterSave(
			"NEW_RECURRENT",
			mockEventData as EventType,
			conflictIds,
			createdEventIds
		);

		// Vérifier que chaque événement récurrent a ses conflits mis à jour
		expect(mockUpdateEvent).toHaveBeenCalledTimes(createdEventIds.length);

		createdEventIds.forEach((eventId) => {
			expect(mockUpdateEvent).toHaveBeenCalledWith(eventId, { inConflictWith: conflictIds });
		});

		// Vérifier que les conflits réciproques sont gérés
		expect(mockUpdateReciprocalConflicts).toHaveBeenCalledTimes(createdEventIds.length);

		createdEventIds.forEach((eventId) => {
			expect(mockUpdateReciprocalConflicts).toHaveBeenCalledWith(eventId, conflictIds);
		});
	});

	it("should handle empty conflict list for recurrent events", async () => {
		const conflictIds: string[] = [];
		const createdEventIds = ["event-occurrence-1", "event-occurrence-2"];

		const mockUpdateEvent = vi.fn().mockResolvedValue({});

		vi.doMock("$lib/pocketbase.svelte", () => ({
			...vi.importActual("$lib/pocketbase.svelte"),
			updateEvent: mockUpdateEvent
		}));

		await handleEventConflictsAfterSave(
			"NEW_RECURRENT",
			mockEventData as EventType,
			conflictIds,
			createdEventIds
		);

		// Vérifier que les conflits sont vidés
		createdEventIds.forEach((eventId) => {
			expect(mockUpdateEvent).toHaveBeenCalledWith(eventId, { inConflictWith: [] });
		});
	});

	it("should handle errors gracefully during conflict update", async () => {
		const conflictIds = ["conflict-event-1"];
		const createdEventIds = ["event-occurrence-1", "event-occurrence-2"];

		// Mock d'une erreur pour un événement
		const mockUpdateEvent = vi
			.fn()
			.mockResolvedValueOnce({}) // Premier événement OK
			.mockRejectedValueOnce(new Error("Update failed")); // Deuxième événement en erreur

		vi.doMock("$lib/pocketbase.svelte", () => ({
			...vi.importActual("$lib/pocketbase.svelte"),
			updateEvent: mockUpdateEvent
		}));

		// Ne doit pas lever d'exception même si un événement échoue
		await expect(
			handleEventConflictsAfterSave(
				"NEW_RECURRENT",
				mockEventData as EventType,
				conflictIds,
				createdEventIds
			)
		).resolves.not.toThrow();

		// Vérifier que la fonction a bien tenté de traiter tous les événements
		expect(mockUpdateEvent).toHaveBeenCalledTimes(2);
	});

	it("should not process conflicts if no event IDs provided", async () => {
		const conflictIds = ["conflict-event-1"];
		const createdEventIds: string[] = []; // Pas d'IDs

		const mockUpdateEvent = vi.fn();

		vi.doMock("$lib/pocketbase.svelte", () => ({
			...vi.importActual("$lib/pocketbase.svelte"),
			updateEvent: mockUpdateEvent
		}));

		await handleEventConflictsAfterSave(
			"NEW_RECURRENT",
			mockEventData as EventType,
			conflictIds,
			createdEventIds
		);

		// Aucune mise à jour ne doit avoir lieu
		expect(mockUpdateEvent).not.toHaveBeenCalled();
	});

	it("should handle recurrent events with different conflict patterns", async () => {
		// Test avec différents patterns de conflits par événement
		const createdEventIds = ["event-1", "event-2", "event-3"];

		// Fonction personnalisée qui retourne des conflits différents par événement
		const getConflictIds = (eventId: string) => {
			switch (eventId) {
				case "event-1":
					return ["conflict-A", "conflict-B"];
				case "event-2":
					return ["conflict-C"];
				case "event-3":
					return []; // Pas de conflit
				default:
					return [];
			}
		};

		const mockUpdateEvent = vi.fn().mockResolvedValue({});

		vi.doMock("$lib/pocketbase.svelte", () => ({
			...vi.importActual("$lib/pocketbase.svelte"),
			updateEvent: mockUpdateEvent
		}));

		// Utiliser updateMultipleEventConflicts directement pour ce test
		const { updateMultipleEventConflicts } = await import("$lib/services/eventActions");

		await updateMultipleEventConflicts(createdEventIds, getConflictIds);

		// Vérifier les appels avec les bons conflits
		expect(mockUpdateEvent).toHaveBeenNthCalledWith(1, "event-1", {
			inConflictWith: ["conflict-A", "conflict-B"]
		});
		expect(mockUpdateEvent).toHaveBeenNthCalledWith(2, "event-2", {
			inConflictWith: ["conflict-C"]
		});
		expect(mockUpdateEvent).toHaveBeenNthCalledWith(3, "event-3", { inConflictWith: [] });
	});
});
