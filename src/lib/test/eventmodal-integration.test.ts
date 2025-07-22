/**
 * COMMANDES POUR EXÉCUTER CES TESTS :
 *
 * # Exécuter tous les tests de ce fichier
 * bun run test eventmodal-integration.test.ts
 *
 * # Exécuter tous les tests
 * bun run test
 *
 * # Exécuter un test spécifique par nom
 * bun run test:unit -- -t "EventModal Integration Tests"
 * bun run test:unit -- -t "should show validation errors for incomplete event"
 * bun run test:unit -- -t "should validate successfully for complete draft event"
 * bun run test:unit -- -t "should determine correct profile for recurrent master"
 * bun run test:unit -- -t "should clear validation state properly"
 * bun run test eventmodal-integration.test.ts
 * # Exécuter avec watch mode
 * bun run test --watch eventmodal-integration.test.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	validator,
	validateEventManually,
	clearCurrentEventValidation
} from "$lib/shared/states.svelte";
import { getNewEvent } from "$lib/services/eventActions";
import type { EventType } from "$lib/types/event.types";

// Mock des fonctions PocketBase
vi.mock("$lib/pocketbase.svelte", () => ({
	createEvent: vi.fn().mockResolvedValue({ id: "test-event-id" }),
	updateEvent: vi.fn().mockResolvedValue({ id: "test-event-id" }),
	createRecurrentEvent: vi.fn().mockResolvedValue({ id: "test-master-id" })
}));

describe("EventModal Integration Tests", () => {
	let testEvent: EventType;

	beforeEach(() => {
		testEvent = getNewEvent() as EventType;
		clearCurrentEventValidation();
	});

	it("should show validation errors for incomplete event", () => {
		// Événement incomplet (titre vide)
		testEvent.event_title = "";
		testEvent.isConfirmed = true;

		// Déclencher la validation manuelle
		validateEventManually(testEvent);

		// Vérifier que l'état de validation contient des erreurs
		expect(validator.state.isValid).toBe(false);
		expect(validator.state.errors.title).toBeTruthy();
		expect(validator.state.profile).toBe("STANDARD_EVENT");
	});

	it("should validate successfully for complete draft event", () => {
		// Événement draft minimal valide
		testEvent.event_title = "Test Event";
		testEvent.isConfirmed = false;

		// Déclencher la validation manuelle
		validateEventManually(testEvent);

		// Vérifier que la validation réussit
		expect(validator.state.isValid).toBe(true);
		expect(Object.keys(validator.state.errors)).toHaveLength(0);
		expect(validator.state.profile).toBe("DRAFT");
	});

	it("should determine correct profile for recurrent master", () => {
		// Événement récurrent master
		testEvent.event_title = "Recurrent Event";
		testEvent.isMasterRecurrent = true;
		testEvent.isConfirmed = true;

		// Déclencher la validation manuelle
		validateEventManually(testEvent);

		// Vérifier le profil de validation
		expect(validator.state.profile).toBe("RECURRENT_MASTER");
	});

	it("should clear validation state properly", () => {
		// Créer un état de validation avec des erreurs
		testEvent.event_title = "";
		validateEventManually(testEvent);

		// Vérifier qu'il y a des erreurs
		expect(validator.state.isValid).toBe(false);
		expect(Object.keys(validator.state.errors).length).toBeGreaterThan(0);

		// Nettoyer l'état
		clearCurrentEventValidation();

		// Vérifier que l'état est propre
		expect(validator.state.isValid).toBe(true);
		expect(Object.keys(validator.state.errors)).toHaveLength(0);
		expect(validator.state.profile).toBe(null);
	});

	it("should handle existing event validation correctly", () => {
		// Événement existant non confirmé
		testEvent.id = "existing-event-id";
		testEvent.event_title = "Existing Event";
		testEvent.isConfirmed = false;

		// Déclencher la validation manuelle
		validateEventManually(testEvent);

		// Vérifier que le profil est DRAFT pour un événement existant non confirmé
		expect(validator.state.profile).toBe("DRAFT");
		expect(validator.state.isValid).toBe(true);
	});

	it("should show multiple validation errors for incomplete confirmed event", () => {
		// Événement confirmé avec plusieurs champs manquants (respectant le profil STANDARD_EVENT)
		testEvent.event_title = "Test Event";
		testEvent.isConfirmed = true;
		testEvent.categories = [];
		testEvent.rooms = [];
		testEvent.tasks = [];
		testEvent.date_event = ""; // Requis pour STANDARD_EVENT
		testEvent.time_start = ""; // Requis pour STANDARD_EVENT
		testEvent.time_end = ""; // Requis pour STANDARD_EVENT
		testEvent.organizers = []; // Requis pour STANDARD_EVENT
		testEvent.isPublic = true;
		testEvent.desc_public = ""; // Requis pour événement public
		testEvent.start_public = ""; // Requis pour événement public
		testEvent.is_prix_libre = false;
		testEvent.prix = ""; // Requis quand prix n'est pas libre
		testEvent.is_age_no_restriction = false;
		testEvent.age_advice = 0; // Requis quand âge est restreint

		// Déclencher la validation manuelle
		validateEventManually(testEvent);

		// Vérifier qu'il y a plusieurs erreurs (profil STANDARD_EVENT)
		expect(validator.state.isValid).toBe(false);
		expect(validator.state.errors.categories).toBeTruthy();
		expect(validator.state.errors.rooms).toBeTruthy();
		expect(validator.state.errors.tasks).toBeTruthy();
		expect(validator.state.errors.date).toBeTruthy();
		expect(validator.state.errors.timeStart).toBeTruthy();
		expect(validator.state.errors.timeEnd).toBeTruthy();
		expect(validator.state.errors.organizers).toBeTruthy();
		expect(validator.state.errors.price).toBeTruthy();
		expect(validator.state.errors.age).toBeTruthy();
		expect(validator.state.errors.publicDescription).toBeTruthy();
		expect(validator.state.errors.publicStartTime).toBeTruthy();
	});
});
