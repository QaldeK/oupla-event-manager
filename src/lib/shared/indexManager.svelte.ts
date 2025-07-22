import type { StoreRecord, IndexConfig } from "$lib/types/syncState.types";

/**
 * Gère la création, la mise à jour et l'interrogation d'index en mémoire.
 * Classe TypeScript pure, découplée de l'état Svelte.
 */
export class IndexManager<T extends StoreRecord> {
	private indexedRecords: Map<string, Map<string | number, string[]>> = new Map();

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
					index.set(value, []);
				}
				const recordIds = index.get(value)!;
				if (!recordIds.includes(record.id)) {
					recordIds.push(record.id);
				}
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
		const index = this.indexedRecords.get(indexName);
		if (!index) return [];

		const recordIds = index.get(key) || [];
		return recordIds.map((id) => allRecordsMap.get(id)).filter(Boolean) as T[];
	}

	/**
	 * Renvoie une nouvelle instance de QueryBuilder pour des requêtes chaînées.
	 * @param allRecordsMap - La Map contenant tous les enregistrements pour la résolution des IDs.
	 */
	public query(allRecordsMap: Map<string, T>): QueryBuilder<T> {
		return new QueryBuilder<T>((indexName, key) => this.getByIndex(indexName, key, allRecordsMap));
	}

	/**
	 * Vide tous les index.
	 */
	public clear(): void {
		this.initializeIndexes();
	}

	// --- Méthodes privées (logique d'assistance extraite de SyncStore) ---

	/**
	 * Parcourt un index donné et supprime toutes les références à un recordId.
	 * Note : C'est une opération coûteuse car elle scanne toutes les clés de l'index.
	 */
	private cleanupIndexReferences(recordId: string, index: Map<string | number, string[]>): void {
		for (const [key, recordIds] of index.entries()) {
			const pos = recordIds.indexOf(recordId);
			if (pos > -1) {
				recordIds.splice(pos, 1);
			}
			// Si un index de clé devient vide, on le supprime
			if (recordIds.length === 0) {
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
 * Permet de construire des requêtes chaînées sur les index.
 */
export class QueryBuilder<T> {
	private results: T[] | null = null;

	constructor(private getByIndexFn: (indexName: string, key: string | number) => T[]) {}

	/**
	 * Filtre les résultats par un index et une clé.
	 * Si c'est le premier filtre, il définit le jeu de résultats initial.
	 * Si des filtres précédents existent, il effectue une intersection.
	 */
	public byIndex(indexName: string, key: string | number): this {
		const records = this.getByIndexFn(indexName, key);
		if (this.results === null) {
			this.results = records;
		} else {
			const newIds = new Set(records.map((r) => (r as any).id));
			this.results = this.results.filter((r) => newIds.has((r as any).id));
		}
		return this;
	}

	/**
	 * Trie le jeu de résultats actuel.
	 */
	public sort(compareFn: (a: T, b: T) => number): this {
		if (this.results) {
			this.results.sort(compareFn);
		}
		return this;
	}

	/**
	 * Garde seulement les N premiers résultats.
	 */
	public take(count: number): this {
		if (this.results) {
			this.results = this.results.slice(0, count);
		}
		return this;
	}

	/**
	 * Exécute la requête et retourne le tableau de résultats final.
	 */
	public exec(): T[] {
		return this.results || [];
	}
}
