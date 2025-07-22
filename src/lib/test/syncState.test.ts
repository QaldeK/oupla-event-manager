import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SyncStore } from "$lib/shared/syncState.svelte";
import type { StoreRecord, StoreConfig } from "$lib/types/syncState.types";
import * as pocketbase from "$lib/pocketbase.svelte";

// Type de test simple qui étend StoreRecord
interface TestRecord extends StoreRecord {
	id: string;
	created: string;
	updated: string;
	name: string;
	category: string;
	priority: number;
}

// Données de test
const testRecords: TestRecord[] = [
	{
		id: "1",
		created: "2024-01-01T00:00:00Z",
		updated: "2024-01-01T00:00:00Z",
		collectionId: "test",
		collectionName: "testRecords",
		name: "Événement A",
		category: "conference",
		priority: 1
	},
	{
		id: "2",
		created: "2024-01-02T00:00:00Z",
		updated: "2024-01-02T00:00:00Z",
		collectionId: "test",
		collectionName: "testRecords",
		name: "Événement B",
		category: "workshop",
		priority: 2
	},
	{
		id: "3",
		created: "2024-01-03T00:00:00Z",
		updated: "2024-01-03T00:00:00Z",
		collectionId: "test",
		collectionName: "testRecords",
		name: "Événement C",
		category: "conference",
		priority: 1
	}
];

// Mock des dépendances externes
vi.mock("$lib/pocketbase.svelte", () => ({
	// On simule la fonction que SyncStore appelle réellement
	getFullList: vi.fn().mockImplementation((collectionName: string) => {
		if (collectionName === "testRecords") {
			return Promise.resolve(testRecords);
		}
		return Promise.resolve([]);
	}),
	// On simule les autres fonctions pour éviter les erreurs, même si on ne les teste pas ici
	getList: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }),
	getOne: vi.fn().mockResolvedValue(null),
	subscribe: vi.fn(() => () => {}), // retourne une fonction de désinscription
	unsubscribe: vi.fn()
}));

describe("SyncStore - Scénario d'initialisation", () => {
	let store: SyncStore<TestRecord>;
	const dbName = "testStore";

	// Ce `beforeEach` s'exécutera AVANT chaque test `it()`
	beforeEach(async () => {
		// 1. Nettoyer les mocks et le localStorage, c'est une bonne pratique
		vi.clearAllMocks();
		localStorage.clear();

		// 2. Supprimer la base de données du test précédent. C'est l'étape CRUCIALE.
		// On attend que la suppression soit terminée pour garantir un état propre.
		await new Promise<void>((resolve, reject) => {
			const request = indexedDB.deleteDatabase(dbName);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
			request.onblocked = () => {
				console.warn(
					"La base de données IndexedDB est bloquée, impossible de la supprimer proprement."
				);
				resolve(); // On continue malgré tout
			};
		});

		// 3. Maintenant que l'environnement est propre, on crée l'instance pour le test
		const config: StoreConfig<TestRecord> = {
			name: dbName, // Utilisons notre variable pour être cohérents
			version: 1,
			indexes: {
				byCategory: { path: "category" },
				byPriority: { path: "priority" }
			},
			sync: { mode: "manual" }
		};
		store = new SyncStore<TestRecord>(config);
	});

	// `afterEach` est utile pour le nettoyage final si nécessaire
	afterEach(async () => {
		if (store) await store.destroy();
	});

	it("devrait partir d'un état vide, charger les données depuis la source, et les rendre accessibles", async () => {
		// **PHASE 1 : VÉRIFIER L'ÉTAT INITIAL**
		// On s'assure que notre nettoyage a fonctionné
		expect(store.isInitialized, "Le store ne doit pas être initialisé au départ").toBe(false);
		expect(store.getAll(), "Le store doit être vide au départ").toHaveLength(0);

		// **PHASE 2 : ACTION**
		// On lance l'initialisation qui doit déclencher la récupération des données
		await store.init("testRecords" as any);

		// **PHASE 3 : VÉRIFICATION DE L'ÉTAT FINAL**
		// Le store doit maintenant être initialisé et rempli
		expect(store.isInitialized, "Le store doit être marqué comme initialisé").toBe(true);
		expect(
			pocketbase.getFullList,
			"Le store doit appeler la source de données"
		).toHaveBeenCalledWith(
			"testRecords",
			expect.anything() // On ne se soucie pas des options passées, juste du nom de la collection
		);

		// On vérifie que les données sont maintenant bien stockées en interne
		expect(store.getAll(), "Le store doit contenir les enregistrements de la source").toHaveLength(
			3
		);

		// Et enfin, on vérifie que les index ont été construits correctement
		const conferenceEvents = store.getByIndex("byCategory", "conference");
		expect(conferenceEvents, "L'index 'byCategory' doit fonctionner").toHaveLength(2);
		expect(conferenceEvents.map((r) => r.name)).toEqual(
			expect.arrayContaining(["Événement A", "Événement C"])
		);

		const priority1Events = store.getByIndex("byPriority", 1);
		expect(priority1Events, "L'index 'byPriority' doit fonctionner avec des nombres").toHaveLength(
			2
		);
	});
});
