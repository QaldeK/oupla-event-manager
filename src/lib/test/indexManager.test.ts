import { describe, it, expect, beforeEach } from "vitest";
import { IndexManager } from "$lib/shared/indexManager.svelte";
import type { StoreRecord, IndexConfig } from "$lib/types/syncState.types";

interface TestRecord extends StoreRecord {
	name: string;
	category: string;
	tags?: string[];
	priority: number;
	nested: { value: string };
}

describe("IndexManager", () => {
	let indexManager: IndexManager<TestRecord>;
	const allRecordsMap = new Map<string, TestRecord>();

	const records: TestRecord[] = [
		{
			id: "1",
			name: "Rec A",
			category: "cat1",
			tags: ["tag1", "tag2"],
			priority: 1,
			nested: { value: "A" },
			created: "",
			updated: "",
			collectionId: "",
			collectionName: ""
		},
		{
			id: "2",
			name: "Rec B",
			category: "cat2",
			tags: ["tag2", "tag3"],
			priority: 2,
			nested: { value: "B" },
			created: "",
			updated: "",
			collectionId: "",
			collectionName: ""
		},
		{
			id: "3",
			name: "Rec C",
			category: "cat1",
			tags: ["tag3"],
			priority: 1,
			nested: { value: "C" },
			created: "",
			updated: "",
			collectionId: "",
			collectionName: ""
		}
	];

	const indexesConfig: Record<string, IndexConfig> = {
		byCategory: { path: "category" },
		byPriority: { path: "priority" },
		byTag: { path: "tags", type: "array" },
		byNestedValue: { path: "nested.value" } // Test de chemin imbriqué
	};

	beforeEach(() => {
		indexManager = new IndexManager<TestRecord>(indexesConfig);
		allRecordsMap.clear();
		records.forEach((rec) => allRecordsMap.set(rec.id, rec));
	});

	it("devrait être initialement vide", () => {
		const results = indexManager.getByIndex("byCategory", "cat1", allRecordsMap);
		expect(results).toHaveLength(0);
	});

	it("devrait construire les index à partir d'un tableau d'enregistrements", () => {
		indexManager.buildFrom(records);

		const cat1Results = indexManager.getByIndex("byCategory", "cat1", allRecordsMap);
		expect(cat1Results).toHaveLength(2);
		expect(cat1Results.map((r) => r.id)).toEqual(["1", "3"]);

		const prio1Results = indexManager.getByIndex("byPriority", 1, allRecordsMap);
		expect(prio1Results).toHaveLength(2);

		const nestedResults = indexManager.getByIndex("byNestedValue", "B", allRecordsMap);
		expect(nestedResults).toHaveLength(1);
		expect(nestedResults[0].id).toBe("2");
	});

	it("devrait gérer correctement les index de type 'array'", () => {
		indexManager.buildFrom(records);

		const tag2Results = indexManager.getByIndex("byTag", "tag2", allRecordsMap);
		expect(tag2Results).toHaveLength(2);
		expect(tag2Results.map((r) => r.id)).toEqual(["1", "2"]);

		const tag3Results = indexManager.getByIndex("byTag", "tag3", allRecordsMap);
		expect(tag3Results).toHaveLength(2);
		expect(tag3Results.map((r) => r.id)).toEqual(["2", "3"]);
	});

	it("devrait ajouter un nouvel enregistrement aux index", () => {
		indexManager.buildFrom(records);
		const newRecord: TestRecord = {
			id: "4",
			name: "Rec D",
			category: "cat2",
			priority: 2,
			nested: { value: "D" },
			created: "",
			updated: "",
			collectionId: "",
			collectionName: ""
		};
		allRecordsMap.set(newRecord.id, newRecord);

		indexManager.addOrUpdate(newRecord);

		const cat2Results = indexManager.getByIndex("byCategory", "cat2", allRecordsMap);
		expect(cat2Results).toHaveLength(2); // Initialement 1, maintenant 2
		expect(cat2Results.map((r) => r.id)).toEqual(["2", "4"]);
	});

	it("devrait mettre à jour un enregistrement existant dans les index", () => {
		indexManager.buildFrom(records);
		const updatedRecord = { ...records[0], category: "cat2" }; // Record 1 passe de cat1 à cat2
		allRecordsMap.set(updatedRecord.id, updatedRecord);

		indexManager.addOrUpdate(updatedRecord);

		const cat1Results = indexManager.getByIndex("byCategory", "cat1", allRecordsMap);
		expect(cat1Results).toHaveLength(1);
		expect(cat1Results[0].id).toBe("3");

		const cat2Results = indexManager.getByIndex("byCategory", "cat2", allRecordsMap);
		expect(cat2Results).toHaveLength(2);
		expect(cat2Results.map((r) => r.id).sort()).toEqual(["1", "2"].sort());
	});

	it("devrait supprimer un enregistrement des index", () => {
		indexManager.buildFrom(records);
		const recordToRemove = records[0];

		indexManager.remove(recordToRemove);

		const cat1Results = indexManager.getByIndex("byCategory", "cat1", allRecordsMap);
		expect(cat1Results).toHaveLength(1); // Un en moins
		expect(cat1Results[0].id).toBe("3");

		const tag2Results = indexManager.getByIndex("byTag", "tag2", allRecordsMap);
		expect(tag2Results).toHaveLength(1);
		expect(tag2Results[0].id).toBe("2");
	});

	it("devrait retourner un QueryBuilder qui fonctionne", () => {
		indexManager.buildFrom(records);
		const results = indexManager
			.query(allRecordsMap)
			.byIndex("byCategory", "cat1")
			.sort((a, b) => a.priority - b.priority) // Pas de changement d'ordre ici
			.exec();

		expect(results).toHaveLength(2);
		expect(results.map((r) => r.id)).toEqual(["1", "3"]);
	});
});
