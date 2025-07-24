import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { IndexedDbManager } from "$lib/shared/indexedDbManager.svelte";
import type { StoreRecord } from "$lib/types/syncState.types";
import "fake-indexeddb/auto"; // Importe un polyfill pour IndexedDB en environnement Node/JSDOM

interface TestRecord extends StoreRecord {
	name: string;
}

// Fonction utilitaire pour supprimer la base de données
const deleteDb = (dbName: string): Promise<void> => {
	return new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase(dbName);
		request.onsuccess = () => resolve();
		request.onerror = (e) => reject(request.error);
		request.onblocked = () => {
			console.warn("IndexedDB blocked, cannot delete.");
			resolve();
		};
	});
};

describe("IndexedDbManager", () => {
	const dbName = "TestDB";
	const storeName = "records";
	let dbManager: IndexedDbManager<TestRecord>;

	beforeEach(async () => {
		// On s'assure que la DB est propre avant chaque test
		await deleteDb(dbName);
		dbManager = new IndexedDbManager<TestRecord>(dbName, storeName, 1, "id");
		await dbManager.init();
	});

	afterEach(async () => {
		dbManager.close();
		await deleteDb(dbName);
	});

	it("devrait s'initialiser correctement", () => {
		expect(dbManager.isInitialized).toBe(true);
		expect(dbManager.databaseName).toBe(dbName);
		expect(dbManager.objectStoreName).toBe(storeName);
	});

	it("devrait sauvegarder et charger un enregistrement", async () => {
		const record: TestRecord = {
			id: "1",
			name: "Test 1",
			created: "",
			updated: "",
			collectionId: "",
			collectionName: ""
		};
		await dbManager.save(record);

		const allRecords = await dbManager.loadAll();
		expect(allRecords).toHaveLength(1);
		expect(allRecords[0]).toEqual(record);
	});

	it("devrait sauvegarder et charger plusieurs enregistrements", async () => {
		const records: TestRecord[] = [
			{ id: "1", name: "Test 1", created: "", updated: "", collectionId: "", collectionName: "" },
			{ id: "2", name: "Test 2", created: "", updated: "", collectionId: "", collectionName: "" }
		];
		await dbManager.save(records);

		const allRecords = await dbManager.loadAll();
		expect(allRecords).toHaveLength(2);
	});

	it("devrait mettre à jour un enregistrement existant (put)", async () => {
		const record1: TestRecord = {
			id: "1",
			name: "Original",
			created: "",
			updated: "",
			collectionId: "",
			collectionName: ""
		};
		await dbManager.save(record1);

		const record1Updated: TestRecord = {
			id: "1",
			name: "Updated",
			created: "",
			updated: "",
			collectionId: "",
			collectionName: ""
		};
		await dbManager.save(record1Updated);

		const allRecords = await dbManager.loadAll();
		expect(allRecords).toHaveLength(1);
		expect(allRecords[0].name).toBe("Updated");
	});

	it("devrait supprimer un enregistrement", async () => {
		const record: TestRecord = {
			id: "1",
			name: "To be deleted",
			created: "",
			updated: "",
			collectionId: "",
			collectionName: ""
		};
		await dbManager.save(record);
		let count = await dbManager.count();
		expect(count).toBe(1);

		await dbManager.delete("1");
		count = await dbManager.count();
		expect(count).toBe(0);
	});

	it("devrait vider le store", async () => {
		const records: TestRecord[] = [
			{ id: "1", name: "Test 1", created: "", updated: "", collectionId: "", collectionName: "" },
			{ id: "2", name: "Test 2", created: "", updated: "", collectionId: "", collectionName: "" }
		];
		await dbManager.save(records);
		let count = await dbManager.count();
		expect(count).toBe(2);

		await dbManager.clear();
		count = await dbManager.count();
		expect(count).toBe(0);
	});

	it("devrait supprimer plusieurs enregistrements avec deleteMany", async () => {
		const records: TestRecord[] = [
			{ id: "1", name: "A", created: "", updated: "", collectionId: "", collectionName: "" },
			{ id: "2", name: "B", created: "", updated: "", collectionId: "", collectionName: "" },
			{ id: "3", name: "C", created: "", updated: "", collectionId: "", collectionName: "" }
		];
		await dbManager.save(records);

		// Suppression multiple
		await dbManager.deleteMany(["1", "3"]);
		const all = await dbManager.loadAll();

		// On doit retrouver uniquement l'enregistrement "2"
		expect(all).toHaveLength(1);
		expect(all[0].id).toBe("2");
	});
});
