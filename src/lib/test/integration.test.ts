/**
 * COMMANDES POUR EXÉCUTER CES TESTS :
 *
 * # Exécuter tous les tests de ce fichier
 * bun run test integration.test.ts
 *
 * # Exécuter tous les tests
 * bun run test
 *
 * # Exécuter un test spécifique par nom
 bun run test:unit -- -t "should create a real concert event in PocketBase"
 bun run test:unit -- -t "should create a real atelier event in PocketBase"
 bun run test:unit -- -t "should create a real sondage event in PocketBase"
 bun run test:unit -- -t "should update an existing event in PocketBase"
 bun run test:unit -- -t "should create a complex multi-day event in PocketBase"
 bun run test:unit -- -t "should create events with different member roles"
 bun run test:unit -- -t "should create 8 diverse events for testing purposes"
 bun run test:unit -- -t "should create 5 random sondages with beforeEvent tasks only"

 * # Exécuter avec watch mode
 * bun run test --watch integration.test.ts
 *
 * # ⚠️ ATTENTION: Ces tests créent de vrais événements dans PocketBase
 * # Assurez-vous d'être connecté avec les bons identifiants de test
 * # Authentification requise: ***REMOVED*** / ***REMOVED***
 */

import { describe, test, expect, beforeAll, afterEach } from "vitest";
import { createEventForTest, updateEvent, deleteRecord, getOne, pb } from "../pocketbase.svelte";
import { Collections } from "$lib/types/pocketbase";
import {
	createBaseEvent,
	createMofoTask,
	createMofoOrganizer,
	createDateProposed,
	createExternalProposal,
	createCompleteEvent,
	MOFO_SPACE_CONFIG
} from "./test-utils";

// Variables pour stocker les IDs des événements créés pendant les tests
let createdEventIds: string[] = [];

describe("Tests d'intégration PocketBase - Création d'événements réels", () => {
	beforeAll(async () => {
		console.log("🚀 Début des tests d'intégration PocketBase");
		console.log("⚠️  Ces tests créent de vrais événements dans PocketBase");

		// Authentification pour les tests
		console.log("🔐 Authentification pour les tests...");
		try {
			await pb.collection("users").authWithPassword("***REMOVED***", "***REMOVED***");
			console.log("✅ Authentifié:", pb.authStore.record?.username);
		} catch (error) {
			console.error("❌ Erreur d'authentification:", error);
			throw new Error("Impossible de s'authentifier pour les tests");
		}
	});

	afterEach(() => {
		console.log(`📝 Événements créés dans ce test: ${createdEventIds.length}`);
		if (createdEventIds.length > 0) {
			console.log("🗃️  IDs créés:", createdEventIds);
		}
	});

	test("should create a real atelier event in PocketBase", async () => {
		const atelierEvent = createCompleteEvent(
			"Atelier Numérique - Test Intégration",
			"atelier",
			"2025-08-15",
			"14:00",
			"17:00",
			true,
			true
		);
		// 🤔 Ajout des champs requis pour événement confirmé public
		atelierEvent.desc_public = "Atelier d'initiation au numérique ouvert à tous";
		atelierEvent.start_public = "14:00"; // >= timeStart
		atelierEvent.organizers = [
			createMofoOrganizer("aldek", ["présence", "animation"]),
			createMofoOrganizer("ghald", ["présence"])
		];
		atelierEvent.tasks = [
			createMofoTask("présence"),
			createMofoTask("animation"),
			createMofoTask("ménage")
		];

		const result = await createEventForTest(atelierEvent);

		expect(result).toBeDefined();
		expect(result.id).toBeTruthy();
		expect(result.event_title).toBe("Atelier Numérique - Test Intégration");
		expect(result.categories).toContain("atelier");
		expect(result.isPublic).toBe(true);
		expect(result.isConfirmed).toBe(true);

		createdEventIds.push(result.id);

		// Vérifier que l'événement existe vraiment en base
		const retrievedEvent = await getOne(Collections.Events, result.id);
		expect(retrievedEvent).toBeDefined();
		expect(retrievedEvent.event_title).toBe("Atelier Numérique - Test Intégration");
	});

	test("should create a real concert event in PocketBase", async () => {
		const concertEvent = createCompleteEvent(
			"Concert Jazz - Test Intégration",
			"concert",
			"2025-08-20",
			"20:00",
			"23:00",
			true,
			true
		);
		concertEvent.desc_public = "Soirée jazz avec des musiciens locaux";
		concertEvent.is_prix_libre = false;
		concertEvent.prix = "12€";
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

		const result = await createEventForTest(concertEvent);

		expect(result).toBeDefined();
		expect(result.id).toBeTruthy();
		expect(result.event_title).toBe("Concert Jazz - Test Intégration");
		expect(result.categories).toContain("concert");
		expect(result.prix).toBe("12€");
		expect(result.is_prix_libre).toBe(false);

		createdEventIds.push(result.id);

		// Vérifier que l'événement existe vraiment en base
		const retrievedEvent = await getOne(Collections.Events, result.id);
		expect(retrievedEvent).toBeDefined();
		expect(retrievedEvent.event_title).toBe("Concert Jazz - Test Intégration");
	});

	test("should create a real sondage event in PocketBase", async () => {
		const sondageEvent = createBaseEvent();
		sondageEvent.event_title = "Sondage Réunion - Test Intégration";
		sondageEvent.description = "Réunion mensuelle de l'association";
		sondageEvent.isSondage = true;
		sondageEvent.isPublic = false;
		sondageEvent.isConfirmed = false; // 🤔 Sondage reste en draft pour respecter le validator
		sondageEvent.categories = ["réunion"];
		sondageEvent.rooms = ["bibli"];
		sondageEvent.organizers = [createMofoOrganizer("aldek", ["présence"])];
		sondageEvent.tasks = [createMofoTask("présence")];
		sondageEvent.dates_proposed = [
			createDateProposed("2025-08-25T18:00:00.000Z", "2025-08-25T20:00:00.000Z"),
			createDateProposed("2025-08-26T18:00:00.000Z", "2025-08-26T20:00:00.000Z")
		];

		const result = await createEventForTest(sondageEvent);

		expect(result).toBeDefined();
		expect(result.id).toBeTruthy();
		expect(result.event_title).toBe("Sondage Réunion - Test Intégration");
		expect(result.isSondage).toBe(true);
		expect(result.isConfirmed).toBe(false);
		expect(result.dates_proposed).toHaveLength(2);

		createdEventIds.push(result.id);
	});

	test("should create an event with external proposals in PocketBase", async () => {
		const externalEvent = createBaseEvent();
		externalEvent.event_title = "Événement Externe - Test Intégration";
		externalEvent.description = "Événement proposé par un intervenant externe";
		externalEvent.categories = ["spectacle"];
		externalEvent.rooms = ["salle 3"];
		externalEvent.organizers = [createMofoOrganizer("qko", ["contact"])];
		externalEvent.external_proposal = createExternalProposal();

		const result = await createEventForTest(externalEvent);

		expect(result).toBeDefined();
		expect(result.id).toBeTruthy();
		expect(result.event_title).toBe("Événement Externe - Test Intégration");
		expect(result.external_proposal).toBeDefined();
		expect(result.external_proposal.proposals).toHaveLength(2);

		createdEventIds.push(result.id);
	});

	test("should create an event with age and mixite restrictions in PocketBase", async () => {
		const restrictedEvent = createCompleteEvent(
			"Atelier Sensible - Test Intégration",
			"atelier",
			"2025-08-30",
			"15:00",
			"18:00",
			true,
			true
		);
		// 🤔 Événement confirmé public avec restrictions - tous champs requis
		restrictedEvent.description = "Atelier avec restrictions d'âge et mixité";
		restrictedEvent.desc_public = "Atelier créatif en non-mixité, à partir de 16 ans";
		restrictedEvent.start_public = "15:00"; // >= timeStart
		restrictedEvent.is_age_no_restriction = false;
		restrictedEvent.age_advice = 16;
		restrictedEvent.isMixiteChoisie = true;
		restrictedEvent.mixite = "non-mixte femmes";
		restrictedEvent.organizers = [createMofoOrganizer("lila", ["présence", "animation"])];
		restrictedEvent.tasks = [
			createMofoTask("présence"),
			createMofoTask("animation"),
			createMofoTask("ménage")
		];

		const result = await createEventForTest(restrictedEvent);

		expect(result).toBeDefined();
		expect(result.id).toBeTruthy();
		expect(result.event_title).toBe("Atelier Sensible - Test Intégration");
		expect(result.is_age_no_restriction).toBe(false);
		expect(result.age_advice).toBe(16);
		expect(result.isMixiteChoisie).toBe(true);
		expect(result.mixite).toBe("non-mixte femmes");

		createdEventIds.push(result.id);
	});

	test("should update an existing event in PocketBase", async () => {
		// D'abord créer un événement
		const originalEvent = createCompleteEvent(
			"Événement à Modifier - Test",
			"autre",
			"2025-09-01",
			"14:00",
			"16:00",
			false,
			false
		);
		originalEvent.rooms = ["bibli"];

		const createdEvent = await createEventForTest(originalEvent);
		expect(createdEvent.id).toBeTruthy();
		createdEventIds.push(createdEvent.id);

		// Maintenant modifier l'événement
		const updatedData = {
			event_title: "Événement Modifié - Test Intégration",
			description: "Description mise à jour",
			isPublic: true,
			categories: ["atelier", "discussion"]
		};

		const updatedEvent = await updateEvent(createdEvent.id, updatedData);

		expect(updatedEvent).toBeDefined();
		expect(updatedEvent.event_title).toBe("Événement Modifié - Test Intégration");
		expect(updatedEvent.description).toBe("Description mise à jour");
		expect(updatedEvent.isPublic).toBe(true);
		expect(updatedEvent.categories).toContain("atelier");
		expect(updatedEvent.categories).toContain("discussion");

		// Vérifier la persistance en base
		const retrievedEvent = await getOne(Collections.Events, createdEvent.id);
		expect(retrievedEvent.event_title).toBe("Événement Modifié - Test Intégration");
	});

	test("should create a complex multi-day event in PocketBase", async () => {
		const multiDayEvent = createBaseEvent();
		multiDayEvent.event_title = "Festival Multi-Jours - Test Intégration";
		// 🤔 Événement confirmé multi-jours avec tous les champs requis
		multiDayEvent.description = "Un festival sur plusieurs jours avec diverses activités";
		multiDayEvent.desc_public = "Festival culturel ouvert à tous - programmation riche sur 2 jours";
		multiDayEvent.date_event = "2025-09-05";
		multiDayEvent.time_start = "18:00";
		multiDayEvent.time_end = "14:00"; // Le lendemain
		multiDayEvent.start_public = "18:00"; // >= timeStart
		multiDayEvent.isPublic = true;
		multiDayEvent.isConfirmed = true;
		multiDayEvent.is_prix_libre = false;
		multiDayEvent.prix = "25€ / 15€ réduit";
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

		const result = await createEventForTest(multiDayEvent);

		expect(result).toBeDefined();
		expect(result.id).toBeTruthy();
		expect(result.event_title).toBe("Festival Multi-Jours - Test Intégration");
		expect(result.categories).toHaveLength(3);
		expect(result.rooms).toHaveLength(2);
		expect(result.organizers).toHaveLength(3);
		expect(result.tasks).toHaveLength(7);
		expect(result.prix).toBe("25€ / 15€ réduit");

		createdEventIds.push(result.id);
	});

	test("should create events with different member roles", async () => {
		// Test avec différents rôles de membres - tous confirmés publics
		const adminEvent = createCompleteEvent(
			"Événement Admin - Test",
			"réunion",
			"2025-09-10",
			"19:00",
			"21:00"
		);
		// 🤔 Ajout des champs requis pour événement confirmé public
		adminEvent.desc_public = "Réunion organisée par un admin";
		adminEvent.start_public = "19:00"; // >= timeStart
		adminEvent.organizers = [createMofoOrganizer("aldek", ["présence"])]; // admin
		adminEvent.tasks = [createMofoTask("présence")];

		const helperEvent = createCompleteEvent(
			"Événement Helper - Test",
			"atelier",
			"2025-09-11",
			"15:00",
			"17:00"
		);
		helperEvent.desc_public = "Atelier organisé par un helper";
		helperEvent.start_public = "15:00"; // >= timeStart
		helperEvent.organizers = [createMofoOrganizer("ghald", ["présence"])]; // helpers
		helperEvent.tasks = [createMofoTask("présence")];

		const invitedEvent = createCompleteEvent(
			"Événement Invité - Test",
			"discussion",
			"2025-09-12",
			"18:00",
			"20:00"
		);
		invitedEvent.desc_public = "Discussion organisée par un membre invité";
		invitedEvent.start_public = "18:00"; // >= timeStart
		invitedEvent.organizers = [createMofoOrganizer("pati", ["présence"])]; // invited
		invitedEvent.tasks = [createMofoTask("présence")];

		const adminResult = await createEventForTest(adminEvent);
		const helperResult = await createEventForTest(helperEvent);
		const invitedResult = await createEventForTest(invitedEvent);

		expect(adminResult.id).toBeTruthy();
		expect(helperResult.id).toBeTruthy();
		expect(invitedResult.id).toBeTruthy();

		createdEventIds.push(adminResult.id, helperResult.id, invitedResult.id);

		// Vérifier les rôles
		expect(adminResult.organizers[0].role).toBe("admin");
		expect(helperResult.organizers[0].role).toBe("helpers");
		expect(invitedResult.organizers[0].role).toBe("invited");
	});

	test("should create 8 diverse events for testing purposes", async () => {
		console.log("🎲 Création de 8 événements diversifiés pour les tests (incluant des sondages)");

		// Fonction pour générer une date aléatoire dans les 2 prochains mois
		const getRandomDateInNext2Months = () => {
			const now = new Date();
			const twoMonthsLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 jours
			const randomTime = now.getTime() + Math.random() * (twoMonthsLater.getTime() - now.getTime());
			return new Date(randomTime);
		};

		// Fonction pour formater une date en string YYYY-MM-DD
		const formatDate = (date: Date) => {
			return date.toISOString().split("T")[0];
		};

		// Fonction pour formater l'heure en HH:MM
		const formatTime = (date: Date, addHours: number = 0) => {
			const newDate = new Date(date.getTime() + addHours * 60 * 60 * 1000);
			return newDate.toTimeString().slice(0, 5);
		};

		// Fonction pour générer un nombre aléatoire à 3 chiffres
		const getRandomThreeDigitNumber = () => {
			return Math.floor(Math.random() * 900) + 100; // Entre 100 et 999
		};

		// Fonction pour créer des dates_proposed aléatoires
		const createRandomDateProposals = (count: number = 3) => {
			const proposals = [];
			for (let i = 0; i < count; i++) {
				const date = getRandomDateInNext2Months();
				const startTime = Math.floor(Math.random() * 12) + 9; // Entre 9h et 20h
				const endTime = startTime + Math.floor(Math.random() * 3) + 1; // Durée de 1 à 3h

				const startISO = new Date(date);
				startISO.setHours(startTime, 0, 0, 0);

				const endISO = new Date(date);
				endISO.setHours(endTime, 0, 0, 0);

				proposals.push(createDateProposed(startISO.toISOString(), endISO.toISOString()));
			}
			return proposals;
		};

		// Générer une date de conflit pour les événements 4 et 5
		const conflictDate = getRandomDateInNext2Months();
		const conflictDateStr = formatDate(conflictDate);
		const conflictTimeStart = "14:00";
		const conflictTimeEnd = "17:00";

		// 1. Premier événement entièrement complété
		const event1 = createCompleteEvent(
			`${getRandomThreeDigitNumber()} Atelier Complet 1 - Test Diversifié`,
			"atelier",
			formatDate(getRandomDateInNext2Months()),
			"14:00",
			"22:00",
			true,
			true
		);
		// 🤔 Événement confirmé public avec tous les champs requis
		event1.desc_public = "Premier atelier entièrement configuré et accessible à tous";
		event1.start_public = "14:00"; // >= timeStart
		event1.organizers = [
			createMofoOrganizer("aldek", ["présence", "animation"]),
			createMofoOrganizer("ghald", ["com"])
		];
		event1.tasks = [
			createMofoTask("présence"),
			createMofoTask("animation"),
			createMofoTask("com"),
			createMofoTask("ménage")
		];

		// 2. Deuxième événement entièrement complété
		const event2 = createCompleteEvent(
			`${getRandomThreeDigitNumber()} Concert Complet - Test Diversifié`,
			"concert",
			formatDate(getRandomDateInNext2Months()),
			"17:00",
			"23:00",
			true,
			true
		);
		// 🤔 Concert confirmé public avec tous les champs requis
		event2.start_public = "17:00"; // >= timeStart
		event2.start_event = "21:00";
		event2.desc_public = "Concert avec tous les détails - soirée musicale complète";
		event2.prix = "15€";
		event2.is_prix_libre = false;
		event2.organizers = [
			createMofoOrganizer("ghald", ["présence", "ouverture"]),
			createMofoOrganizer("zeo", ["com", "course", "ménage"])
		];
		event2.tasks = [
			createMofoTask("présence"),
			createMofoTask("ouverture"),
			createMofoTask("com"),
			createMofoTask("course"),
			createMofoTask("ménage")
		];

		// 3. Événement avec des tâches non assignées
		const event3 = createCompleteEvent(
			`${getRandomThreeDigitNumber()} Réunion Tâches Non Assignées - Test`,
			"réunion",
			formatDate(getRandomDateInNext2Months()),
			"18:00",
			"20:00",
			false,
			false // 🤔 Reste en draft car tâches non assignées
		);
		event3.organizers = [
			createMofoOrganizer("lila", ["présence"]) // Seulement une tâche assignée
		];
		event3.tasks = [
			createMofoTask("présence"),
			createMofoTask("animation"), // Non assignée
			createMofoTask("com"), // Non assignée
			createMofoTask("course"), // Non assignée
			createMofoTask("ménage") // Non assignée
		];

		// 4. Premier événement en conflit
		const event4 = createCompleteEvent(
			`${getRandomThreeDigitNumber()} Événement Conflit 1 - Test`,
			"discussion",
			conflictDateStr,
			conflictTimeStart,
			conflictTimeEnd,
			true,
			false // 🤔 Reste en draft pour éviter conflit de validation
		);
		event4.rooms = ["salle 3"];
		event4.organizers = [createMofoOrganizer("pati", ["présence"])];
		event4.tasks = [createMofoTask("présence")];

		// 5. Deuxième événement en conflit (même date/heure que event4)
		const event5 = createCompleteEvent(
			`${getRandomThreeDigitNumber()} Événement Conflit 2 - Test`,
			"spectacle",
			conflictDateStr,
			conflictTimeStart,
			conflictTimeEnd,
			true,
			false // 🤔 Reste en draft pour éviter conflit de validation
		);
		event5.rooms = ["salle 3"]; // Même salle pour créer un vrai conflit
		event5.organizers = [createMofoOrganizer("zeo", ["animation"])];
		event5.tasks = [createMofoTask("animation")];

		// 6. Événement sans organisers assignés
		const event6 = createBaseEvent();
		event6.event_title = `${getRandomThreeDigitNumber()} Événement Sans Organisers - Test`;
		event6.description = "Événement qui n'a pas encore d'organisers assignés";
		event6.date_event = formatDate(getRandomDateInNext2Months());
		event6.time_start = "16:00";
		event6.time_end = "18:00";
		event6.categories = ["autre"];
		event6.rooms = ["bibli"];
		event6.isPublic = false;
		event6.isConfirmed = false; // 🤔 Reste en draft car sans organisateurs
		event6.organizers = []; // Aucun organiser
		event6.tasks = [
			createMofoTask("présence"),
			createMofoTask("animation"),
			createMofoTask("ménage")
		];

		// 7. Premier événement sondage sans organisateur
		const event7 = createBaseEvent();
		event7.event_title = `${getRandomThreeDigitNumber()} Sondage Atelier Créatif - Test`;
		event7.description = "Atelier de création à définir - sondage pour la date";
		event7.isSondage = true;
		event7.isPublic = false;
		event7.isConfirmed = false;
		event7.categories = ["atelier"];
		event7.rooms = ["atelier"];
		event7.organizers = []; // Pas d'organisateur défini
		event7.dates_proposed = createRandomDateProposals(6);
		event7.tasks = [createMofoTask("présence"), createMofoTask("animation")];

		// 8. Deuxième événement sondage sans organisateur
		const event8 = createBaseEvent();
		event8.event_title = `${getRandomThreeDigitNumber()} Sondage Réunion Mensuelle - Test`;
		event8.description = "Réunion mensuelle de coordination - date à confirmer";
		event8.isSondage = true;
		event8.isPublic = true;
		event8.isConfirmed = false;
		event8.categories = ["réunion"];
		event8.rooms = ["bibli"];
		event8.organizers = []; // Pas d'organisateur défini
		event8.dates_proposed = createRandomDateProposals(4);
		event8.tasks = [createMofoTask("présence"), createMofoTask("animation")];

		// Créer tous les événements
		const result1 = await createEventForTest(event1);
		const result2 = await createEventForTest(event2);
		const result3 = await createEventForTest(event3);
		const result4 = await createEventForTest(event4);
		const result5 = await createEventForTest(event5);
		const result6 = await createEventForTest(event6);
		const result7 = await createEventForTest(event7);
		const result8 = await createEventForTest(event8);

		// Vérifications
		expect(result1.id).toBeTruthy();
		expect(result2.id).toBeTruthy();
		expect(result3.id).toBeTruthy();
		expect(result4.id).toBeTruthy();
		expect(result5.id).toBeTruthy();
		expect(result6.id).toBeTruthy();
		expect(result7.id).toBeTruthy();
		expect(result8.id).toBeTruthy();

		// Vérifier les événements complets
		expect(result1.organizers).toHaveLength(2);
		expect(result1.tasks).toHaveLength(4);
		expect(result2.organizers).toHaveLength(2);
		expect(result2.tasks).toHaveLength(5);

		// Vérifier l'événement avec tâches non assignées
		expect(result3.organizers).toHaveLength(1);
		expect(result3.tasks).toHaveLength(5);
		expect(result3.organizers[0].tasks).toHaveLength(1); // Une seule tâche assignée

		// Vérifier les événements en conflit
		expect(result4.date_event).toBe(result5.date_event);
		expect(result4.time_start).toBe(result5.time_start);
		expect(result4.time_end).toBe(result5.time_end);
		expect(result4.rooms[0]).toBe(result5.rooms[0]);

		// Vérifier l'événement sans organisers
		expect(result6.organizers).toHaveLength(0);
		expect(result6.tasks).toHaveLength(3);

		// Vérifier les événements sondages
		expect(result7.isSondage).toBe(true);
		expect(result7.organizers).toHaveLength(0);
		expect(result7.dates_proposed).toHaveLength(6);
		expect(result8.isSondage).toBe(true);
		expect(result8.organizers).toHaveLength(0);
		expect(result8.dates_proposed).toHaveLength(4);

		// Vérifier que les titres commencent par des nombres à 3 chiffres
		expect(result1.event_title).toMatch(/^\d{3}/);
		expect(result2.event_title).toMatch(/^\d{3}/);
		expect(result3.event_title).toMatch(/^\d{3}/);
		expect(result4.event_title).toMatch(/^\d{3}/);
		expect(result5.event_title).toMatch(/^\d{3}/);
		expect(result6.event_title).toMatch(/^\d{3}/);
		expect(result7.event_title).toMatch(/^\d{3}/);
		expect(result8.event_title).toMatch(/^\d{3}/);

		// Ajouter tous les IDs créés
		createdEventIds.push(
			result1.id,
			result2.id,
			result3.id,
			result4.id,
			result5.id,
			result6.id,
			result7.id,
			result8.id
		);

		console.log("✅ 8 événements diversifiés créés avec succès");
		console.log(`📅 Événements en conflit: ${result4.id} et ${result5.id} le ${conflictDateStr}`);
		console.log(`🔧 Événement avec tâches non assignées: ${result3.id}`);
		console.log(`👤 Événement sans organisers: ${result6.id}`);
		console.log(`🗳️ Événements sondages sans organisateur: ${result7.id} et ${result8.id}`);
	});

	test("should create 5 random sondages with beforeEvent tasks only", async () => {
		console.log("🎲 Création de 5 sondages avec tâches beforeEvent uniquement");

		// Description publique commune pour tous les sondages de test
		const commonPublicDescription =
			"Cet événement fait l'objet d'un sondage pour déterminer la meilleure date qui conviendra au plus grand nombre. N'hésitez pas à vous inscrire sur les créneaux qui vous intéressent ! Nous vous tiendrons informés de la date définitive dès que le sondage sera clos. Cette activité s'inscrit dans notre programmation régulière d'ateliers participatifs ouverts à tous les membres de l'association.";

		const sondages = [];
		const today = new Date();
		const twoMonthsLater = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000); // +60 jours

		for (let i = 0; i < 5; i++) {
			const randomNumber = Math.floor(Math.random() * 1000);
			const randomDate = new Date(
				today.getTime() + Math.random() * (twoMonthsLater.getTime() - today.getTime())
			);

			const sondage = createBaseEvent();
			sondage.event_title = `${randomNumber} Sondage Test Event ${i + 1}`;
			sondage.isSondage = true;
			sondage.isConfirmed = false; // Les sondages sont des drafts
			sondage.isPublic = true; // Sondages publics avec description
			sondage.desc_public = commonPublicDescription;
			sondage.categories = ["atelier"];
			sondage.rooms = ["salle-2"];

			// Créer plusieurs dates proposées (2 à 5)
			const numProposals = Math.floor(Math.random() * 4) + 2; // Entre 2 et 5
			const proposals = [];

			for (let p = 0; p < numProposals; p++) {
				const proposalDate = new Date(randomDate);
				proposalDate.setDate(proposalDate.getDate() + p); // Dates consécutives

				const startHour = 14 + p * 2; // Heures différentes : 14h, 16h, 18h, etc.
				const endHour = startHour + 3; // Durée de 3h

				proposals.push(
					createDateProposed(
						proposalDate.toISOString().split("T")[0] +
							`T${startHour.toString().padStart(2, "0")}:00:00.000Z`,
						proposalDate.toISOString().split("T")[0] +
							`T${endHour.toString().padStart(2, "0")}:00:00.000Z`
					)
				);
			}

			sondage.dates_proposed = proposals;

			// Créer différents types de configurations pour les sondages
			const configType = i % 3; // Rotation entre 3 types de configuration

			if (configType === 0) {
				// Type 1: Aucune tâche, donc aucun organisateur (33% des sondages)
				sondage.tasks = [];
				sondage.organizers = [];
			} else if (configType === 1) {
				// Type 2: Tâches disponibles mais sans organisateurs assignés (33% des sondages)
				const tasksToAdd = ["com", "contact", "course"].map((taskName) => createMofoTask(taskName));
				sondage.tasks = tasksToAdd;
				sondage.organizers = [];
			} else {
				// Type 3: Tâches avec organisateurs assignés (33% des sondages)
				const allowedTasks = ["com", "contact", "course"];
				const numOrganizers = Math.floor(Math.random() * 3) + 1; // 1-3 organisateurs
				const availableMembers = ["aldek", "ghald", "pito"];

				for (let j = 0; j < numOrganizers && j < availableMembers.length; j++) {
					const selectedTask = allowedTasks[Math.floor(Math.random() * allowedTasks.length)];
					const organizer = createMofoOrganizer(availableMembers[j], [selectedTask]);
					sondage.organizers?.push(organizer);
				}

				// Ajouter les tâches correspondantes dans l'événement
				const tasksToAdd = ["com", "contact", "course"].map((taskName) => createMofoTask(taskName));
				sondage.tasks = tasksToAdd;
			}

			sondages.push(sondage);
		}

		// Créer tous les sondages en PocketBase
		const results = [];
		for (const sondage of sondages) {
			const result = await createEventForTest(sondage);
			results.push(result);
			createdEventIds.push(result.id);
		}

		// Vérifications
		expect(results).toHaveLength(5);

		results.forEach((result, index) => {
			// Vérifier le titre avec le nombre aléatoire
			expect(result.event_title).toMatch(/^\d+ Sondage Test Event \d+$/);
			expect(result.isSondage).toBe(true);
			expect(result.isConfirmed).toBe(false);
			expect(result.isPublic).toBe(true);
			expect(result.desc_public).toBe(commonPublicDescription);

			// Vérifier qu'il y a entre 2 et 5 dates proposées
			expect(result.dates_proposed.length).toBeGreaterThanOrEqual(2);
			expect(result.dates_proposed.length).toBeLessThanOrEqual(5);

			// Vérifier les différentes configurations selon l'index
			const configType = index % 3;

			if (configType === 0) {
				// Type 1: Aucune tâche, aucun organisateur
				expect(result.tasks).toHaveLength(0);
				expect(result.organizers).toHaveLength(0);
			} else if (configType === 1) {
				// Type 2: Tâches disponibles mais sans organisateurs
				expect(result.tasks.length).toBeGreaterThan(0);
				expect(result.organizers).toHaveLength(0);
				// Vérifier que les tâches sont de type beforeEvent
				result.tasks.forEach((task: any) => {
					expect(["com", "contact", "course"]).toContain(task.name);
					const taskConfig = MOFO_SPACE_CONFIG.tasks.find((t) => t.name === task.name);
					expect(taskConfig?.type).toBe("beforeEvent");
				});
			} else {
				// Type 3: Tâches avec organisateurs assignés
				expect(result.tasks.length).toBeGreaterThan(0);
				expect(result.organizers.length).toBeGreaterThan(0);

				// Vérifier que les organisateurs n'ont que des tâches autorisées
				result.organizers.forEach((organizer: any) => {
					organizer.tasks.forEach((task: string) => {
						expect(["com", "contact", "course"]).toContain(task);
					});
				});

				// Vérifier que les tâches sont de type beforeEvent
				result.tasks.forEach((task: any) => {
					expect(["com", "contact", "course"]).toContain(task.name);
					const taskConfig = MOFO_SPACE_CONFIG.tasks.find((t) => t.name === task.name);
					expect(taskConfig?.type).toBe("beforeEvent");
				});
			}
		});

		console.log("✅ 5 sondages avec différentes configurations créés avec succès");
		console.log(`🗳️ IDs des sondages créés: ${results.map((r) => r.id).join(", ")}`);
		console.log("📋 Configurations créées:");
		console.log(
			"  - Sondages sans tâches: ",
			results.filter((_, i) => i % 3 === 0).map((r) => r.id)
		);
		console.log(
			"  - Sondages avec tâches sans organisateurs: ",
			results.filter((_, i) => i % 3 === 1).map((r) => r.id)
		);
		console.log(
			"  - Sondages avec tâches et organisateurs: ",
			results.filter((_, i) => i % 3 === 2).map((r) => r.id)
		);
	});
});
