import type { StoreRecord } from "$lib/types/syncState.types";
import type { DbManagerInterface } from "./dbManager.interface";

/**
 * Gestionnaire pour les opérations en mémoire uniquement
 * Alternative à IndexedDbManager pour les stores temporaires
 * Classe TypeScript pure sans dépendances Svelte ni IndexedDB
 */
export class MemoryDbManager<T extends StoreRecord> implements DbManagerInterface<T> {
	private records: Map<string, T> = new Map();
	private _isInitialized = false;

	constructor(
		private dbName: string,
		private storeName: string,
		private version: number,
		private primaryKey: keyof T | "id"
	) {}

	/**
	 * Initialise le gestionnaire mémoire (opération synchrone)
	 */
	public async init(): Promise<void> {
		if (this._isInitialized) {
			return;
		}

		// En mode mémoire, l'initialisation est immédiate
		this.records.clear();
		this._isInitialized = true;

		console.log(`✅ MemoryDbManager: Store '${this.storeName}' initialisé en mode mémoire`);
	}

	/**
	 * Charge tous les enregistrements depuis la mémoire
	 * Retourne toujours un tableau vide en mode mémoire au démarrage
	 */
	async loadAll(): Promise<T[]> {
		if (!this._isInitialized) {
			return [];
		}

		return Array.from(this.records.values());
	}

	/**
	 * Sauvegarde un ou plusieurs enregistrements en mémoire
	 */
	async save(records: T | T[]): Promise<void> {
		if (!this._isInitialized) {
			await this.init();
		}

		const recordsArray = Array.isArray(records) ? records : [records];
		if (recordsArray.length === 0) return;

		for (const record of recordsArray) {
			const id = record[this.primaryKey as keyof T] as string;
			this.records.set(id, record);
		}
	}

	/**
	 * Supprime un enregistrement de la mémoire
	 */
	async delete(id: string): Promise<void> {
		if (!this._isInitialized) {
			return;
		}

		this.records.delete(id);
	}

	/**
	 * Supprime tous les enregistrements de la mémoire
	 */
	async clear(): Promise<void> {
		if (!this._isInitialized) {
			return;
		}

		this.records.clear();
	}

	/**
	 * Obtient un enregistrement par son ID
	 */
	async get(id: string): Promise<T | undefined> {
		if (!this._isInitialized) {
			return undefined;
		}

		return this.records.get(id);
	}

	/**
	 * Vérifie si un enregistrement existe
	 */
	async exists(id: string): Promise<boolean> {
		if (!this._isInitialized) {
			return false;
		}

		return this.records.has(id);
	}

	/**
	 * Retourne le nombre d'enregistrements en mémoire
	 */
	async count(): Promise<number> {
		if (!this._isInitialized) {
			return 0;
		}

		return this.records.size;
	}

	/**
	 * Ferme le gestionnaire et libère la mémoire
	 */
	async close(): Promise<void> {
		this.records.clear();
		this._isInitialized = false;
		console.log(`🧹 MemoryDbManager: Store '${this.storeName}' fermé et mémoire libérée`);
	}

	/**
	 * Indique si le gestionnaire est initialisé
	 */
	get isInitialized(): boolean {
		return this._isInitialized;
	}

	/**
	 * Statistiques du gestionnaire mémoire (utile pour le debugging)
	 */
	/**
	 * Obtient tous les IDs (clés primaires) stockés
	 */
	async getAllIds(): Promise<string[]> {
		if (!this._isInitialized) {
			return [];
		}

		return Array.from(this.records.keys());
	}

	/**
	 * Supprime plusieurs enregistrements par leurs IDs
	 */
	async deleteMany(ids: string[]): Promise<void> {
		if (!this._isInitialized || ids.length === 0) {
			return;
		}

		for (const id of ids) {
			this.records.delete(id);
		}
	}

	getStats(): { storeName: string; recordCount: number; memoryMode: boolean } {
		return {
			storeName: this.storeName,
			recordCount: this.records.size,
			memoryMode: true
		};
	}
}
