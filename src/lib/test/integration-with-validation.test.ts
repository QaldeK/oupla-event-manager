/**
 * COMMANDES POUR EXÉCUTER CES TESTS :
 *
 * # Exécuter tous les tests de ce fichier
 * bun run test integration-with-validation.test.ts
 *
 * # Exécuter tous les tests
 * bun run test
 *
 * # Exécuter un test spécifique par nom
 * bun run test:unit -- -t "should validate and create a complete atelier event"
 * bun run test:unit -- -t "should validate and create a paid concert event"
 * bun run test:unit -- -t "should reject invalid event missing required fields"
 * bun run test:unit -- -t "should validate draft event with minimal requirements"
 * bun run test:unit -- -t "should validate and create sondage event"
 *
 * # Exécuter avec watch mode
 * bun run test --watch integration-with-validation.test.ts
 *
 * # ⚠️ ATTENTION: Ces tests créent de vrais événements dans PocketBase
 * # Assurez-vous d'être connecté avec les bons identifiants de test
 */

import { describe, test, expect, beforeAll, afterEach } from "vitest";
import { createEventForTest, updateEvent, pb } from "../pocketbase.svelte";
import { validateEventStatic, type ValidationProfile } from "../validation/event-validator.svelte";
import {
	createBaseEvent,
	createMofoTask,
	createMofoOrganizer,
	createDateProposed,
	createCompleteEvent
} from "./test-utils";
import type { EventType } from "$lib/types/types";

// Variables pour stocker les IDs des événements créés pendant les tests
const createdEventIds: string[] = [];

// Fonction helper pour créer un événement avec validation
async function createValidatedEvent(
	event: EventType,
	profile: ValidationProfile = "STANDARD_EVENT"
) {
	const validation = validateEventStatic(event, profile);

	if (!validation.isValid) {
		const errors = validation.getErrors();
		throw new Error(`Validation échouée pour le profil ${profile}: ${errors.join(", ")}`);
	}

	return await createEventForTest(event);
}

describe("Tests d'intégration PocketBase avec validation préalable", () => {
	beforeAll(async () => {
		console.log("🚀 Début des tests d'intégration avec validation");
		console.log("✅ Ces tests valident AVANT d'envoyer à PocketBase");

		// Authentification pour les tests
		console.log("🔐 Authentification pour les tests...");
		try {
			await pb
				.collection("users")
				.authWithPassword(
					import.meta.env.VITE_TEST_EMAIL_ZEO as string,
					import.meta.env.VITE_TEST_PASSWORD as string
				);
			console.log("✅ Authentifié:", pb.authStore.record?.username);
		} catch (error) {
			console.error("❌ Erreur d'authentification:", error);
			throw new Error("Impossible de s'authentifier pour les tests");
		}
	});

	afterEach(() => {
		console.log(`📝 Événements validés et créés: ${createdEventIds.length}`);
		if (createdEventIds.length > 0) {
			console.log("🗃️  IDs créés:", createdEventIds);
		}
	});

	test("should validate and create a complete atelier event", async () => {
		const atelierEvent = createCompleteEvent(
			"Atelier Validé - Test Intégration",
			"atelier",
			"2025-08-15",
			"14:00",
			"17:00",
			true,
			true
		);
		atelierEvent.desc_public = "Description publique complète pour l'atelier";
		atelierEvent.start_public = "14:45"; // Ouverture 15 min après l'ouverture du lieu
		atelierEvent.organizers = [
			createMofoOrganizer("aldek", ["présence", "animation"]),
			createMofoOrganizer("ghald", ["présence"])
		];
		atelierEvent.tasks = [
			createMofoTask("présence"),
			createMofoTask("animation"),
			createMofoTask("ménage")
		];

		// Validation avant création
		const validation = validateEventStatic(atelierEvent, "STANDARD_EVENT");
		if (!validation.isValid) {
			console.log("❌ Erreurs de validation:", validation.getErrors());
		}
		expect(validation.isValid).toBe(true);
		expect(validation.getErrors()).toHaveLength(0);

		const result = await createValidatedEvent(atelierEvent);

		expect(result).toBeDefined();
		expect(result.id).toBeTruthy();
		expect(result.event_title).toBe("Atelier Validé - Test Intégration");

		createdEventIds.push(result.id);
	});

	test("should validate complex multi-day event", async () => {
		const multiDayEvent = createBaseEvent();
		multiDayEvent.event_title = "Festival Multi-Jours Validé";
		multiDayEvent.description = "Festival sur plusieurs jours avec diverses activités";

		const validation = validateEventStatic(multiDayEvent);
		if (!validation.isValid) {
			console.log("❌ Erreurs de validation multi-jours:", validation.getErrors());
		}
		expect(validation.isValid).toBe(true);

		const result = await createValidatedEvent(multiDayEvent);
		expect(result.event_title).toBe("Festival Multi-Jours Validé");

		createdEventIds.push(result.id);
	});

	test("should validate and create a paid concert event", async () => {
		const concertEvent = createCompleteEvent(
			"Concert Validé - Test Intégration",
			"concert",
			"2025-08-20",
			"20:00",
			"23:00",
			true,
			true
		);
		concertEvent.desc_public = "Soirée jazz avec des musiciens locaux - événement payant";
		concertEvent.is_prix_libre = false;
		concertEvent.prix = "15€ / 10€ réduit";
		concertEvent.start_public = "19:45"; // Ouverture 15 min avant l'événement
		concertEvent.rooms = ["salle 3"];
		concertEvent.organizers = [
			createMofoOrganizer("pito", ["présence", "ouverture"]),
			createMofoOrganizer("zeo", ["com"])
		];
		concertEvent.tasks = [
			createMofoTask("présence"),
			createMofoTask("ouverture"),
			createMofoTask("com"),
			createMofoTask("ménage")
		];

		// Validation avant création
		const validation = validateEventStatic(concertEvent, "STANDARD_EVENT");
		if (!validation.isValid) {
			console.log("❌ Erreurs de validation:", validation.getErrors());
		}
		expect(validation.isValid).toBe(true);

		const result = await createValidatedEvent(concertEvent);

		expect(result.prix).toBe("15€ / 10€ réduit");
		expect(result.is_prix_libre).toBe(false);

		createdEventIds.push(result.id);
	});

	test("should validate and create event with age and mixite restrictions", async () => {
		const restrictedEvent = createCompleteEvent(
			"Atelier Restriction Validé - Test",
			"atelier",
			"2025-08-30",
			"15:00",
			"18:00",
			true,
			true
		);
		restrictedEvent.desc_public = "Atelier avec restrictions d'âge et de mixité";
		restrictedEvent.is_age_no_restriction = false;
		restrictedEvent.age_advice = 16;
		restrictedEvent.isMixiteChoisie = true;
		restrictedEvent.mixite = "non-mixte femmes";
		restrictedEvent.start_public = "15:45";
		restrictedEvent.organizers = [createMofoOrganizer("lila", ["présence", "animation"])];
		restrictedEvent.tasks = [createMofoTask("présence"), createMofoTask("animation")];

		// Validation avant création
		const validation = validateEventStatic(restrictedEvent, "STANDARD_EVENT");
		if (!validation.isValid) {
			console.log("❌ Erreurs de validation:", validation.getErrors());
		}
		expect(validation.isValid).toBe(true);

		const result = await createValidatedEvent(restrictedEvent);

		expect(result.age_advice).toBe(16);
		expect(result.mixite).toBe("non-mixte femmes");

		createdEventIds.push(result.id);
	});

	test("should reject invalid event missing required fields", async () => {
		const invalidEvent = createBaseEvent();
		invalidEvent.event_title = "Événement Invalide";
		// Manque: categories, rooms, tasks, date, time_start, time_end, organizers

		const validation = validateEventStatic(invalidEvent, "STANDARD_EVENT");
		expect(validation.isValid).toBe(false);

		const errors = validation.getErrors();
		expect(errors.length).toBeGreaterThan(0);
		expect(errors.some((e) => e.includes("catégorie"))).toBe(true);
		expect(errors.some((e) => e.includes("salle"))).toBe(true);
		expect(errors.some((e) => e.includes("tâche"))).toBe(true);

		// Ne doit pas pouvoir créer l'événement
		await expect(createValidatedEvent(invalidEvent)).rejects.toThrow();
	});

	test("should reject public event without public description", async () => {
		const publicEventNoDesc = createCompleteEvent(
			"Événement Public Sans Description",
			"atelier",
			"2025-09-01",
			"14:00",
			"16:00",
			true, // isPublic = true
			true
		);
		publicEventNoDesc.desc_public = ""; // Description publique vide
		publicEventNoDesc.start_public = "14:45";

		const validation = validateEventStatic(publicEventNoDesc, "STANDARD_EVENT");
		expect(validation.isValid).toBe(false);

		const errors = validation.getErrors();
		expect(errors.some((e) => e.includes("description"))).toBe(true);

		await expect(createValidatedEvent(publicEventNoDesc)).rejects.toThrow();
	});

	test("should reject event with prix not libre but no price", async () => {
		const noPriceEvent = createCompleteEvent(
			"Événement Payant Sans Prix",
			"concert",
			"2025-09-05",
			"20:00",
			"22:00",
			true,
			true
		);
		noPriceEvent.desc_public = "Concert payant mais prix non défini";
		noPriceEvent.is_prix_libre = false;
		noPriceEvent.prix = ""; // Prix vide
		noPriceEvent.start_public = "20:45"; // Ouverture 15 min avant l'événement

		const validation = validateEventStatic(noPriceEvent, "STANDARD_EVENT");
		expect(validation.isValid).toBe(false);

		const errors = validation.getErrors();
		expect(errors.some((e) => e.includes("prix"))).toBe(true);

		await expect(createValidatedEvent(noPriceEvent)).rejects.toThrow();
	});

	test("should validate draft event with minimal requirements", async () => {
		const draftEvent = createBaseEvent();
		draftEvent.event_title = "Brouillon Événement";
		// Un brouillon n'a besoin que du titre

		const validation = validateEventStatic(draftEvent, "DRAFT");
		expect(validation.isValid).toBe(true);

		const result = await createValidatedEvent(draftEvent, "DRAFT");
		expect(result.event_title).toBe("Brouillon Événement");

		createdEventIds.push(result.id);
	});

	test("should reject draft with empty title", async () => {
		const invalidDraft = createBaseEvent();
		invalidDraft.event_title = ""; // Titre vide

		const validation = validateEventStatic(invalidDraft, "DRAFT");
		expect(validation.isValid).toBe(false);

		const errors = validation.getErrors();
		expect(errors.some((e) => e.includes("titre"))).toBe(true);

		await expect(createValidatedEvent(invalidDraft, "DRAFT")).rejects.toThrow();
	});

	test("should validate and create sondage event", async () => {
		const sondageEvent = createBaseEvent();
		sondageEvent.event_title = "Sondage Validé - Test";
		sondageEvent.description = "Réunion mensuelle de l'association";
		sondageEvent.isSondage = true;
		sondageEvent.isPublic = false;
		sondageEvent.isConfirmed = false;
		sondageEvent.categories = ["réunion"];
		sondageEvent.rooms = ["bibli"];
		sondageEvent.organizers = [createMofoOrganizer("aldek", ["présence"])];
		sondageEvent.tasks = [createMofoTask("présence")];
		sondageEvent.dates_proposed = [
			createDateProposed("2025-08-25T18:00:00.000Z", "2025-08-25T20:00:00.000Z"),
			createDateProposed("2025-08-26T18:00:00.000Z", "2025-08-26T20:00:00.000Z")
		];
		// Pour un sondage, on ajoute une date temporaire pour la validation
		sondageEvent.date_event = "2025-08-25";
		sondageEvent.time_start = "18:00";
		sondageEvent.time_end = "20:00";

		const validation = validateEventStatic(sondageEvent, "STANDARD_EVENT");
		if (!validation.isValid) {
			console.log("❌ Erreurs de validation sondage:", validation.getErrors());
		}
		expect(validation.isValid).toBe(true);

		const result = await createValidatedEvent(sondageEvent);
		expect(result.isSondage).toBe(true);
		expect(result.dates_proposed).toHaveLength(2);

		createdEventIds.push(result.id);
	});

	test("should validate complex multi-day event", async () => {
		const multiDayEvent = createBaseEvent();
		multiDayEvent.event_title = "Festival Multi-Jours Validé";
		multiDayEvent.description = "Festival sur plusieurs jours avec diverses activités";
		multiDayEvent.desc_public = "Festival culturel ouvert à tous - événement exceptionnel";
		multiDayEvent.date_event = "2025-09-05";
		multiDayEvent.time_start = "18:00";
		multiDayEvent.time_end = "14:00"; // Le lendemain
		multiDayEvent.start_public = "18:45";
		multiDayEvent.isPublic = true;
		multiDayEvent.isConfirmed = true;
		multiDayEvent.is_prix_libre = false;
		multiDayEvent.prix = "30€ / 20€ réduit";
		multiDayEvent.categories = ["spectacle", "concert", "atelier"];
		multiDayEvent.rooms = ["salle 3", "salle-2"];
		multiDayEvent.organizers = [
			createMofoOrganizer("aldek", ["présence", "contact"]),
			createMofoOrganizer("pito", ["animation"]),
			createMofoOrganizer("ghald", ["com", "course"])
		];
		multiDayEvent.tasks = [
			createMofoTask("présence"),
			createMofoTask("contact"),
			createMofoTask("animation"),
			createMofoTask("com"),
			createMofoTask("course"),
			createMofoTask("ouverture"),
			createMofoTask("ménage")
		];

		const validation = validateEventStatic(multiDayEvent, "STANDARD_EVENT");
		if (!validation.isValid) {
			console.log("❌ Erreurs de validation multi-day:", validation.getErrors());
		}
		expect(validation.isValid).toBe(true);

		const result = await createValidatedEvent(multiDayEvent);
		expect(result.categories).toHaveLength(3);
		expect(result.rooms).toHaveLength(2);
		expect(result.organizers).toHaveLength(3);
		expect(result.tasks).toHaveLength(7);

		createdEventIds.push(result.id);
	});

	test("should validate and update existing event", async () => {
		// Créer un événement valide
		const originalEvent = createCompleteEvent(
			"Événement à Modifier Validé",
			"discussion",
			"2025-09-10",
			"19:00",
			"21:00",
			false,
			true
		);
		originalEvent.description = "Événement à modifier avec validation";
		originalEvent.organizers = [createMofoOrganizer("aldek", ["présence"])];
		originalEvent.tasks = [createMofoTask("présence")];

		const validation = validateEventStatic(originalEvent, "STANDARD_EVENT");
		expect(validation.isValid).toBe(true);

		const createdEvent = await createValidatedEvent(originalEvent);
		createdEventIds.push(createdEvent.id);

		// Modifier avec des données valides
		const updatedData = {
			event_title: "Événement Modifié Validé",
			description: "Description mise à jour avec validation",
			isPublic: true,
			desc_public: "Description publique ajoutée pour rendre l'événement public",
			categories: ["atelier", "discussion"]
		};

		// Note: Pour un update partiel, on ne peut pas facilement valider
		// car on n'a pas l'objet complet. Dans une vraie app, il faudrait
		// récupérer l'événement complet, appliquer les modifications, puis valider.

		const updatedEvent = await updateEvent(createdEvent.id, updatedData);
		expect(updatedEvent.event_title).toBe("Événement Modifié Validé");
		expect(updatedEvent.isPublic).toBe(true);
	});
});
