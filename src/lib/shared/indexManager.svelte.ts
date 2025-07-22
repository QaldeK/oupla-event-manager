import type { StoreRecord, IndexConfig } from "$lib/types/syncState.types";

/**
 * IndexManager
 * --------------
 * Objectif :
 *   Fournit une gestion efficace des index en mémoire pour des collections d'enregistrements,
 *   permettant des recherches rapides par clé, ainsi que la création, mise à jour et suppression d'index.
 *
 * Utilisation :
 *   1. Instancier IndexManager avec une configuration d'index :
 *        const manager = new IndexManager<MyRecordType>(indexesConfig);
 *
 *   2. Construire les index à partir d'une liste d'enregistrements :
 *        manager.buildFrom(recordsArray);
 *
 *   3. Ajouter ou mettre à jour un enregistrement dans les index :
 *        manager.addOrUpdate(record);
 *
 *   4. Supprimer un enregistrement des index :
 *        manager.remove(record);
 *
 *   5. Interroger les index pour retrouver des enregistrements :
 *        const results = manager.getByIndex("indexName", key, allRecordsMap);
 *
 *   6. Utiliser le QueryBuilder pour des requêtes chaînées :
 *        const results = manager.query(allRecordsMap)
 *                              .byIndex("indexA", keyA)
 *                              .byIndex("indexB", keyB)
 *                              .sort((a, b) => a.date - b.date)
 *                              .take(10)
 *                              .exec();
 */

/**
 * Gère la création, la mise à jour et l'interrogation d'index en mémoire.
 * Classe TypeScript pure, découplée de l'état Svelte.
 */
/**
 * Utilisation délibérée de Map/Set standards pour raisons de performance.
 * Ce fichier est un utilitaire pur, pas un store réactif.
 * La réactivité est gérée par le composant parent.
 */
/* eslint-disable svelte/prefer-svelte-reactivity */
export class IndexManager<T extends StoreRecord> {
	private indexedRecords: Map<string, Map<string | number, Set<string>>> = new Map();

	constructor(private indexesConfig: Record<string, IndexConfig> = {}) {
		this.initializeIndexes();
	}

	/**
	 * Initialise ou réinitialise les conteneurs d'index.
	 */
	private initializeIndexes(): void {
		this.indexedRecords.clear();
		for (const indexName in this.indexesConfig) {
			this.indexedRecords.set(indexName, new Map());
		}
	}

	/**
	 * Construit les index à partir d'une liste initiale d'enregistrements.
	 */
	public buildFrom(records: T[]): void {
		this.initializeIndexes();
		for (const record of records) {
			this.addOrUpdate(record);
		}
	}

	/**
	 * Met à jour les index pour un enregistrement donné (ajout ou modification).
	 * Réplique la logique originale : nettoie d'abord les anciennes références, puis ajoute les nouvelles.
	 */
	public addOrUpdate(record: T): void {
		for (const indexName in this.indexesConfig) {
			const indexConfig = this.indexesConfig[indexName];
			const index = this.indexedRecords.get(indexName);
			if (!index) continue;

			// 1. Supprime les anciennes références pour cet enregistrement pour éviter les doublons
			this.cleanupIndexReferences(record.id, index);

			// 2. Ajoute les nouvelles références basées sur les valeurs actuelles
			const values = this.extractIndexValues(record, indexConfig);
			for (const value of values) {
				if (value === undefined || value === null) continue;

				if (!index.has(value)) {
					index.set(value, new Set());
				}
				// L'utilisation d'un Set gère automatiquement les doublons et offre une insertion en O(1).
				index.get(value)!.add(record.id);
			}
		}
	}

	/**
	 * Supprime un enregistrement de tous les index.
	 */
	public remove(record: T): void {
		for (const indexName in this.indexesConfig) {
			const index = this.indexedRecords.get(indexName);
			if (index) {
				this.cleanupIndexReferences(record.id, index);
			}
		}
	}

	/**
	 * Interroge un index pour une clé spécifique.
	 * @param indexName - Le nom de l'index à interroger.
	 * @param key - La valeur à rechercher dans l'index.
	 * @param allRecordsMap - La Map contenant tous les enregistrements pour la résolution des IDs.
	 * @returns Un tableau d'enregistrements correspondants.
	 */
	public getByIndex(indexName: string, key: string | number, allRecordsMap: Map<string, T>): T[] {
		const recordIds = this.getIdsByIndex(indexName, key);
		return [...recordIds].map((id) => allRecordsMap.get(id)).filter(Boolean) as T[];
	}

	/**
	 * Renvoie une nouvelle instance de QueryBuilder pour des requêtes chaînées.
	 * @param allRecordsMap - La Map contenant tous les enregistrements pour la résolution des IDs.
	 */
	public query(allRecordsMap: Map<string, T>): QueryBuilder<T> {
		return new QueryBuilder<T>(allRecordsMap, (indexName, key) =>
			this.getIdsByIndex(indexName, key)
		);
	}

	/**
	 * Vide tous les index.
	 */
	public clear(): void {
		this.initializeIndexes();
	}

	private getIdsByIndex(indexName: string, key: string | number): Set<string> {
		const index = this.indexedRecords.get(indexName);
		if (!index) return new Set();
		return index.get(key) || new Set();
	}

	// --- Méthodes privées (logique d'assistance extraite de SyncStore) ---

	/**
	 * Parcourt un index donné et supprime toutes les références à un recordId.
	 * Note : C'est une opération coûteuse car elle scanne toutes les clés de l'index.
	 */
	private cleanupIndexReferences(recordId: string, index: Map<string | number, Set<string>>): void {
		for (const [key, recordIds] of index.entries()) {
			// La suppression dans un Set est en O(1), beaucoup plus rapide que indexOf + splice.
			recordIds.delete(recordId);

			// Si un index de clé devient vide, on le supprime
			if (recordIds.size === 0) {
				index.delete(key);
			}
		}
	}

	/**
	 * Extrait les valeurs d'un enregistrement à utiliser comme clés d'index.
	 */
	private extractIndexValues(record: T, config: IndexConfig): (string | number | undefined)[] {
		if (config.transform) {
			return config.transform(record);
		}
		if (typeof config.path === "string") {
			const value = this.getValueByPath(record, config.path);
			if (config.type === "array" && Array.isArray(value)) {
				return value;
			}
			return [value as string | number | undefined];
		}
		// Pour les chemins de type string[], non géré dans la logique originale, mais on pourrait l'ajouter ici.
		return [];
	}

	/**
	 * Récupère une valeur imbriquée dans un objet via un chemin de type "a.b.c".
	 */
	private getValueByPath(obj: Record<string, unknown>, path: string): unknown {
		return path.split(".").reduce((acc: any, part) => acc && acc[part], obj);
	}
}

/**
 * Permet de construire des requêtes chaînées sur les index, tout en préservant la réactivité de Svelte.
 */
export class QueryBuilder<T extends StoreRecord> {
	private allRecordsMap: Map<string, T>;
	private getIdsByIndexFn: (indexName: string, key: string | number) => Set<string>;

	private resultIds: Set<string> | null = null;
	private sortCompareFn: ((a: T, b: T) => number) | null = null;
	private takeCount: number | null = null;

	constructor(
		allRecordsMap: Map<string, T>,
		getIdsByIndexFn: (indexName: string, key: string | number) => Set<string>
	) {
		this.allRecordsMap = allRecordsMap;
		this.getIdsByIndexFn = getIdsByIndexFn;
	}

	/**
	 * Filtre les résultats par un index et une clé.
	 * Si c'est le premier filtre, il définit le jeu de résultats initial.
	 * Si des filtres précédents existent, il effectue une intersection des IDs.
	 */
	public byIndex(indexName: string, key: string | number): this {
		const ids = this.getIdsByIndexFn(indexName, key);
		if (this.resultIds === null) {
			this.resultIds = new Set(ids);
		} else {
			this.resultIds = new Set([...this.resultIds].filter((id) => ids.has(id)));
		}
		return this;
	}

	/**
	 * Définit une fonction de tri qui sera appliquée à l'exécution.
	 */
	public sort(compareFn: (a: T, b: T) => number): this {
		this.sortCompareFn = compareFn;
		return this;
	}

	/**
	 * Définit le nombre maximum de résultats à retourner.
	 */
	public take(count: number): this {
		this.takeCount = count;
		return this;
	}

	/**
	 * Exécute la requête :
	 * 1. Résout les IDs en enregistrements (crée la dépendance réactive avec la `Map` de Svelte).
	 * 2. Applique le tri.
	 * 3. Applique la limite.
	 * @returns Le tableau de résultats final.
	 */
	public exec(): T[] {
		let records: T[];

		if (this.resultIds === null) {
			// Si aucun filtre `byIndex` n'a été appliqué, on peut opérer sur tous les enregistrements.
			// La réactivité est alors dépendante de la collection entière.
			records = Array.from(this.allRecordsMap.values());
		} else {
			// La réactivité est déclenchée ici car on accède à `this.allRecordsMap.get()`,
			// qui est une méthode suivie par le SvelteMap réactif.
			records = [...this.resultIds].map((id) => this.allRecordsMap.get(id)).filter(Boolean) as T[];
		}

		// Appliquer le tri
		if (this.sortCompareFn) {
			records.sort(this.sortCompareFn);
		}

		// Appliquer la limite
		if (this.takeCount !== null) {
			records = records.slice(0, this.takeCount);
		}

		return records;
	}
}
