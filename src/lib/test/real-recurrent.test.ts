// src/lib/test/real-recurrent-test.ts
/**
 * COMMANDES POUR EXÉCUTER CES TESTS :
 *
 * # Exécuter tous les tests de ce fichier
 * bun run test real-recurrent.test.ts
 *
 * # Exécuter tous les tests
 * bun run test
 *
 * # Exécuter un test spécifique par nom
 * bun run test:unit -- -t "Test réel des événements récurrents"
 * bun run test:unit -- -t "should create recurrent events and return event IDs"
 * bun run test:unit -- -t "should handle conflicts for newly created recurrent events"
 * bun run test:unit -- -t "should handle empty conflicts gracefully"
 * bun run test:unit -- -t "should show detailed debug information"
 *
 * # Exécuter avec watch mode
 * bun run test --watch real-recurrent.test.ts
 *
 * # ⚠️ ATTENTION: Ces tests créent de vrais événements récurrents dans PocketBase
 * # Ils utilisent de vraies données et peuvent modifier la base de données
 * # Assurez-vous d'être dans un environnement de test approprié
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRecurrentEvent } from "$lib/pocketbase.svelte";
import { handleEventConflictsAfterSave } from "$lib/services/eventActions";
import { getNewEvent, getDefaultRecurrence } from "$lib/services/eventActions";
import type { EventType } from "$lib/types/event.types";

describe("Test réel des événements récurrents", () => {
	let testEventData: Partial<EventType>;
	let createdEventIds: string[] = [];

	beforeEach(() => {
		// Configuration de base pour un événement récurrent
		testEventData = {
			...getNewEvent(),
			event_title: `Test Récurrent Real ${Date.now()}`,
			time_start: "14:00",
			time_end: "16:00",
			rooms: ["salle-test"],
			categories: ["test"],
			description: "Test de création d'événements récurrents avec conflits",
			isRecurrent: true,
			isPublic: false // Pour éviter les validations complexes
		};

		const recurrence = {
			...getDefaultRecurrence(),
			recurrenceDates: [
				"2024-12-16", // Lundi
				"2024-12-23", // Lundi suivant
				"2024-12-30" // Lundi d'après
			],
			recurrenceType: "WEEKLY" as const
		};

		testEventData.recurrence = recurrence;
		createdEventIds = [];
	});

	afterEach(async () => {
		// Nettoyage : supprimer les événements créés
		if (createdEventIds.length > 0) {
			console.log(`🧹 Nettoyage de ${createdEventIds.length} événements de test...`);
			// Note: Ici on pourrait ajouter la suppression si nécessaire
		}
	});

	it("should create recurrent events and return event IDs", async () => {
		console.log("🚀 Test de création d'événements récurrents...");
		console.log("📋 Données d'événement:", {
			title: testEventData.event_title,
			dates: testEventData.recurrence?.recurrenceDates,
			times: `${testEventData.time_start}-${testEventData.time_end}`
		});

		try {
			const result = await createRecurrentEvent(testEventData);

			console.log("✅ Résultat de createRecurrentEvent:", result);

			// Vérifications de base
			expect(result).toBeDefined();
			expect(result).toHaveProperty("masterEventId");
			expect(result).toHaveProperty("eventIds");

			if (result?.masterEventId) {
				console.log("📌 Master Event ID:", result.masterEventId);
				createdEventIds.push(result.masterEventId);
			}

			if (result?.eventIds && Array.isArray(result.eventIds)) {
				console.log("📋 Event IDs créés:", result.eventIds);
				expect(result.eventIds).toHaveLength(3); // 3 dates de récurrence
				createdEventIds.push(...result.eventIds);
			} else {
				console.error("❌ Aucun eventIds retourné ou format incorrect");
				expect(result?.eventIds).toBeDefined();
			}
		} catch (error) {
			console.error("❌ Erreur lors de la création des événements récurrents:", error);
			throw error;
		}
	});

	it("should handle conflicts for newly created recurrent events", async () => {
		console.log("🔍 Test de gestion des conflits pour événements récurrents...");

		// Simuler des conflits détectés
		const simulatedConflictIds = ["conflict-test-1", "conflict-test-2"];

		try {
			// Créer les événements récurrents
			const result = await createRecurrentEvent(testEventData);

			console.log("📋 Événements créés:", result);

			if (result?.eventIds && result.eventIds.length > 0) {
				if (result.masterEventId) {
					createdEventIds.push(result.masterEventId);
				}
				createdEventIds.push(...result.eventIds);

				console.log("🔧 Test de la gestion des conflits...");
				console.log("⚡ Conflits simulés:", simulatedConflictIds);
				console.log("📝 IDs d'événements à traiter:", result.eventIds);

				// Tester la gestion des conflits
				await handleEventConflictsAfterSave(
					"NEW_RECURRENT",
					testEventData as EventType,
					simulatedConflictIds,
					result.eventIds
				);

				console.log("✅ Gestion des conflits terminée sans erreur");
			} else {
				console.error("❌ Aucun événement créé pour tester les conflits");
				expect(result?.eventIds).toBeDefined();
				expect(result?.eventIds?.length).toBeGreaterThan(0);
			}
		} catch (error) {
			console.error("❌ Erreur lors du test de gestion des conflits:", error);
			throw error;
		}
	});

	it("should handle empty conflicts gracefully", async () => {
		console.log("🔍 Test avec aucun conflit...");

		try {
			const result = await createRecurrentEvent(testEventData);

			if (result?.eventIds && result.eventIds.length > 0) {
				if (result.masterEventId) {
					createdEventIds.push(result.masterEventId);
				}
				createdEventIds.push(...result.eventIds);

				console.log("🔧 Test sans conflits...");

				// Tester avec une liste de conflits vide
				await handleEventConflictsAfterSave(
					"NEW_RECURRENT",
					testEventData as EventType,
					[], // Aucun conflit
					result.eventIds
				);

				console.log("✅ Gestion sans conflits terminée");
			} else {
				expect(result?.eventIds).toBeDefined();
			}
		} catch (error) {
			console.error("❌ Erreur lors du test sans conflits:", error);
			throw error;
		}
	});

	it("should show detailed debug information", async () => {
		console.log("🔍 Test de debug détaillé...");

		console.log("📊 Configuration du test:");
		console.log("  - Titre:", testEventData.event_title);
		console.log("  - Horaires:", `${testEventData.time_start} - ${testEventData.time_end}`);
		console.log("  - Salles:", testEventData.rooms);
		console.log("  - Récurrence:", testEventData.recurrence);

		try {
			console.log("🚀 Appel de createRecurrentEvent...");
			const startTime = Date.now();

			const result = await createRecurrentEvent(testEventData);

			const endTime = Date.now();
			console.log(`⏱️ Durée d'exécution: ${endTime - startTime}ms`);

			console.log("📋 Résultat complet:", JSON.stringify(result, null, 2));

			if (result) {
				if (result.masterEventId) {
					createdEventIds.push(result.masterEventId);
				}
				if (result.eventIds) {
					createdEventIds.push(...result.eventIds);
				}
			}

			// Cette assertion ne devrait pas échouer si notre code fonctionne
			expect(result).toBeDefined();
		} catch (error) {
			console.error("❌ Erreur détaillée:", {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				name: error instanceof Error ? error.name : "Unknown"
			});
			throw error;
		}
	});
});
