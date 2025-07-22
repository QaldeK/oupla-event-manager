import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SyncStore } from "$lib/shared/syncState.svelte";
import type { StoreRecord, StoreConfig } from "$lib/types/syncState.types";

// --- MOCKING AREA ---
// Nous créons des objets qui contiendront nos fonctions mockées.
// Cela nous permet de les réinitialiser et de les espionner facilement dans nos tests.
const mockDbManager = {
	init: vi.fn().mockResolvedValue(undefined),
	loadAll: vi.fn().mockResolvedValue([]),
	save: vi.fn().mockResolvedValue(undefined),
	clear: vi.fn().mockResolvedValue(undefined),
	close: vi.fn()
};

const mockSyncer = {
	start: vi.fn().mockResolvedValue(undefined),
	stop: vi.fn(),
	forceRefresh: vi.fn().mockResolvedValue(undefined),
	// Ces placeholders seront remplacés par les vrais callbacks du SyncStore
	onRecordsReceived: (records: StoreRecord[]) => {},
	onRecordDeleted: (id: string) => {},
	onSyncComplete: (date: Date) => {},
	onError: (err: any, ctx: string) => {}
};

// Ici, on dit à Vitest : "chaque fois que le code importe ces modules,
// utilise nos versions mockées à la place".
vi.mock("$lib/shared/indexedDbManager.svelte", () => ({
	// Le constructeur de la classe mockée retourne notre objet mocké.
	IndexedDbManager: vi.fn().mockImplementation(() => mockDbManager)
}));

vi.mock("$lib/shared/pocketbaseSyncer.svelte", () => ({
	// Idem pour le PocketBaseSyncer. On utilise un setter pour capturer les callbacks.
	PocketBaseSyncer: vi.fn().mockImplementation(() => {
		return new Proxy(mockSyncer, {
			set: (target, property, value) => {
				// Permet au SyncStore d'assigner ses callbacks à notre mock
				target[property as keyof typeof mockSyncer] = value;
				return true;
			}
		});
	})
}));

// Mock minimal pour pb.svelte, car il est encore importé pour subscribe/unsubscribe
vi.mock("$lib/pocketbase.svelte", () => ({
	pb: {
		collection: vi.fn(() => ({
			subscribe: vi.fn(() => () => {}), // Retourne une fonction de désinscription
			unsubscribe: vi.fn()
		}))
	}
}));

// --- TEST DATA ---
interface TestRecord extends StoreRecord {
	name: string;
	category: string;
}
const testRecords: TestRecord[] = [
	{
		id: "1",
		created: "2024-01-01T00:00:00Z",
		updated: "2024-01-01T01:00:00Z",
		collectionId: "test",
		collectionName: "test",
		name: "Événement A",
		category: "conference"
	},
	{
		id: "2",
		created: "2024-01-02T00:00:00Z",
		updated: "2024-01-02T01:00:00Z",
		collectionId: "test",
		collectionName: "test",
		name: "Événement B",
		category: "workshop"
	},
	{
		id: "3",
		created: "2024-01-03T00:00:00Z",
		updated: "2024-01-03T01:00:00Z",
		collectionId: "test",
		collectionName: "test",
		name: "Événement C",
		category: "conference"
	}
];

// --- TEST SUITE ---
describe("SyncStore - Refactored", () => {
	let store: SyncStore<TestRecord>;
	const dbName = "testStoreRefactored";

	beforeEach(async () => {
		// Réinitialise tous les mocks avant chaque test pour un état propre
		vi.clearAllMocks();
		localStorage.clear();

		// C'est une bonne pratique de s'assurer que la base de données de test est propre
		await new Promise<void>((resolve) => {
			const request = indexedDB.deleteDatabase(dbName);
			request.onsuccess = () => resolve();
			request.onerror = () => resolve(); // On continue même en cas d'erreur
			request.onblocked = () => resolve();
		});

		const config: StoreConfig<TestRecord> = {
			name: dbName,
			version: 1,
			indexes: { byCategory: { path: "category" } },
			sync: { mode: "realtime" } // Mode realtime pour que le syncer soit bien créé
		};
		store = new SyncStore<TestRecord>(config);
	});

	afterEach(async () => {
		if (store) {
			await store.destroy();
		}
	});

	it("devrait initialiser depuis une source distante quand le cache local est vide", async () => {
		// --- ARRANGE ---
		// 1. Simuler une DB vide au chargement
		mockDbManager.loadAll.mockResolvedValue([]);

		// 2. Simuler que le syncer va renvoyer nos données de test
		// On modifie l'implémentation de `start` pour ce test spécifique
		mockSyncer.start.mockImplementation(async () => {
			// Le syncer appelle le callback avec les données reçues
			await mockSyncer.onRecordsReceived(testRecords);
			// Et notifie la fin de la synchronisation
			mockSyncer.onSyncComplete(new Date("2024-01-04T00:00:00Z"));
		});

		// --- ACT ---
		await store.init("testRecords" as any);

		// --- ASSERT ---
		// Vérifier que le store est bien initialisé
		expect(store.isInitialized, "Le store doit être marqué comme initialisé").toBe(true);

		// Vérifier les interactions avec les dépendances
		expect(mockDbManager.init, "Doit initialiser la DB locale").toHaveBeenCalled();
		expect(mockDbManager.loadAll, "Doit essayer de charger depuis la DB locale").toHaveBeenCalled();
		expect(mockSyncer.start, "Doit démarrer le processus de synchronisation").toHaveBeenCalled();
		// L'argument `lastSync` doit être null car le cache est vide
		expect(mockSyncer.start).toHaveBeenCalledWith(expect.anything(), null);
		// Vérifier que les données reçues ont bien été sauvegardées
		expect(
			mockDbManager.save,
			"Doit sauvegarder les nouveaux enregistrements dans la DB"
		).toHaveBeenCalledWith(testRecords);

		// Vérifier l'état final du store
		expect(store.getAll(), "Le store doit contenir les 3 enregistrements").toHaveLength(3);
		expect(store.get("1")?.name).toBe("Événement A");

		// Vérifier que la date de synchro a été mise à jour dans localStorage
		expect(localStorage.getItem(`${dbName}_lastSync`)).toBe("2024-01-04T00:00:00.000Z");

		// Vérifier que les fonctionnalités (index) sont opérationnelles
		const conferenceEvents = store.getByIndex("byCategory", "conference");
		expect(conferenceEvents, "L'index 'byCategory' doit renvoyer 2 événements").toHaveLength(2);
		expect(conferenceEvents.map((e) => e.id)).toEqual(expect.arrayContaining(["1", "3"]));
	});

	it("devrait initialiser depuis le cache local puis synchroniser les nouveautés", async () => {
		// --- ARRANGE ---
		// 1. Simuler une DB locale qui contient déjà 2 enregistrements
		const localData = [testRecords[0], testRecords[1]];
		mockDbManager.loadAll.mockResolvedValue(localData);

		// 2. Simuler une date de dernière synchronisation dans localStorage
		const lastSyncDate = new Date("2024-01-02T12:00:00Z");
		localStorage.setItem(`${dbName}_lastSync`, lastSyncDate.toISOString());

		// 3. Simuler que le syncer ne renvoie que le 3ème enregistrement (le seul plus récent)
		const newData = [testRecords[2]];
		mockSyncer.start.mockImplementation(async () => {
			await mockSyncer.onRecordsReceived(newData);
			mockSyncer.onSyncComplete(new Date("2024-01-04T00:00:00Z"));
		});

		// --- ACT ---
		await store.init("testRecords" as any);

		// --- ASSERT ---

		expect(
			mockDbManager.loadAll,
			"Doit bien tenter de charger les données depuis la DB locale"
		).toHaveBeenCalled();
		// On vérifie que le syncer a été appelé avec la bonne date, ce qui prouve
		// que le store a bien pris en compte les données locales et la date de synchro.
		expect(
			mockSyncer.start,
			"Le syncer doit démarrer avec la date de dernière synchro"
		).toHaveBeenCalledWith(expect.anything(), lastSyncDate);

		// Vérifier que seules les nouvelles données ont été sauvegardées
		expect(
			mockDbManager.save,
			"Seuls les nouveaux enregistrements doivent être sauvegardés"
		).toHaveBeenCalledWith(newData);

		// Vérifier l'état final du store
		expect(store.isInitialized, "Le store doit être initialisé").toBe(true);
		expect(
			store.getAll(),
			"À la fin, le store doit contenir tous les enregistrements"
		).toHaveLength(3);
		expect(store.get("3")?.name).toBe("Événement C");
	});
});
