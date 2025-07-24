import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { PocketBaseSyncer } from "$lib/shared/pocketbaseSyncer.svelte";
import type { StoreRecord, SyncOptions } from "$lib/types/syncState.types";
import type { RecordService } from "pocketbase";

// Mock de l'objet collection de PocketBase
const mockCollection: RecordService<TestRecord> = {
	getFullList: vi.fn(),
	getList: vi.fn(),
	getOne: vi.fn(),
	subscribe: vi.fn(),
	unsubscribe: vi.fn(),
	getFirstListItem: vi.fn()
} as unknown as RecordService<TestRecord>;

interface TestRecord extends StoreRecord {
	name: string;
}

describe("PocketBaseSyncer", () => {
	let syncer: PocketBaseSyncer<TestRecord>;

	const onRecordsReceived = vi.fn();
	const onRecordDeleted = vi.fn();
	const onSyncComplete = vi.fn();
	const onError = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		onRecordsReceived.mockClear();
		onSyncComplete.mockClear();
		onError.mockClear();
	});

	it("devrait construire un filtre correct sans date de synchro", async () => {
		const syncOptions: SyncOptions = { mode: "manual", filter: "status = 'active'" };
		syncer = new PocketBaseSyncer<TestRecord>(syncOptions, "testCollection");
		syncer.onSyncComplete = onSyncComplete;
		(mockCollection.getFullList as Mock).mockResolvedValue([]);

		await syncer.start(mockCollection, null); // Pas de date de synchro

		expect(mockCollection.getFullList).toHaveBeenCalledWith({
			filter: "status = 'active'", // Juste le filtre de base
			sort: "",
			expand: undefined
		});
	});

	it("devrait construire un filtre correct avec une date de synchro", async () => {
		const syncOptions: SyncOptions = { mode: "manual", filter: "status = 'active'" };
		syncer = new PocketBaseSyncer<TestRecord>(syncOptions, "testCollection");
		syncer.onSyncComplete = onSyncComplete;
		(mockCollection.getFullList as Mock).mockResolvedValue([]);

		const lastSync = new Date("2024-05-20T10:00:00.000Z");
		await syncer.start(mockCollection, lastSync);

		const expectedDateString = lastSync.toISOString().replace("T", " ");
		expect(mockCollection.getFullList).toHaveBeenCalledWith({
			filter: `(status = 'active') && updated > "${expectedDateString}"`,
			sort: "",
			expand: undefined
		});
	});

	it("devrait construire un filtre correct avec juste une date de synchro", async () => {
		const syncOptions: SyncOptions = { mode: "manual" };
		syncer = new PocketBaseSyncer<TestRecord>(syncOptions, "testCollection");
		(mockCollection.getFullList as Mock).mockResolvedValue([]);

		const lastSync = new Date("2024-05-20T10:00:00.000Z");
		await syncer.start(mockCollection, lastSync);

		const expectedDateString = lastSync.toISOString().replace("T", " ");
		expect(mockCollection.getFullList).toHaveBeenCalledWith({
			filter: `updated > "${expectedDateString}"`,
			sort: "",
			expand: undefined
		});
	});

	it("devrait appeler onRecordsReceived avec les données et onSyncComplete à la fin", async () => {
		const syncOptions: SyncOptions = { mode: "manual" };
		syncer = new PocketBaseSyncer<TestRecord>(syncOptions, "testCollection");
		syncer.onRecordsReceived = onRecordsReceived;
		syncer.onSyncComplete = onSyncComplete;

		const fakeData: TestRecord[] = [
			{ id: "1", name: "new", created: "", updated: "", collectionId: "", collectionName: "" }
		];
		(mockCollection.getFullList as Mock).mockResolvedValue(fakeData);

		await syncer.start(mockCollection, null);

		expect(onRecordsReceived).toHaveBeenCalledWith(fakeData);
		expect(onSyncComplete).toHaveBeenCalled();
		expect(onSyncComplete).toHaveBeenCalledWith(expect.any(Date)); // Le callback est appelé avec une date
	});

	it("devrait appeler onError en cas d'échec de la requête", async () => {
		const syncOptions: SyncOptions = { mode: "manual" };
		syncer = new PocketBaseSyncer<TestRecord>(syncOptions, "testCollection");
		syncer.onError = onError;
		syncer.onSyncComplete = onSyncComplete;

		const error = new Error("Network failed");
		(mockCollection.getFullList as Mock).mockRejectedValue(error);

		await syncer.start(mockCollection, null);

		expect(onError).toHaveBeenCalledWith(error, "sync-fetch");
		expect(onSyncComplete).not.toHaveBeenCalled(); // Ne doit pas être appelé en cas d'erreur
	});

	it("devrait forcer un refresh en ignorant la date de synchro", async () => {
		const syncOptions: SyncOptions = { mode: "manual", filter: "status = 'active'" };
		syncer = new PocketBaseSyncer<TestRecord>(syncOptions, "testCollection");
		syncer.onSyncComplete = onSyncComplete;
		(mockCollection.getFullList as Mock).mockResolvedValue([]);

		const lastSync = new Date("2024-05-20T10:00:00.000Z");
		await syncer.start(mockCollection, lastSync);

		const expectedDateString = lastSync.toISOString().replace("T", " ");
		expect(mockCollection.getFullList).toHaveBeenLastCalledWith(
			expect.objectContaining({
				filter: `(status = 'active') && updated > "${expectedDateString}"`
			})
		);

		// Appel de forceRefresh (sans date)
		await syncer.forceRefresh();
		expect(mockCollection.getFullList).toHaveBeenLastCalledWith(
			expect.objectContaining({
				filter: `status = 'active'`
			})
		);
	});

	it("devrait appeler onPruneNeeded avec la liste des IDs distants", async () => {
		const syncOptions: SyncOptions = { mode: "manual" };
		syncer = new PocketBaseSyncer<TestRecord>(syncOptions, "testCollection");

		const onPruneNeeded = vi.fn();
		syncer.onPruneNeeded = onPruneNeeded;
		syncer.onSyncComplete = vi.fn();

		// Mock getFullList pour ne retourner que des IDs
		(mockCollection.getFullList as Mock).mockImplementation(({ fields }) => {
			if (fields === "id") {
				return Promise.resolve([{ id: "1" }, { id: "2" }]);
			}
			return Promise.resolve([]);
		});

		await syncer.start(mockCollection, null);

		// Vérifie que le callback a été appelé avec la bonne liste
		expect(onPruneNeeded).toHaveBeenCalledWith(["1", "2"]);
	});
});
