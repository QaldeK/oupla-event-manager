import type { StoreRecord } from "$lib/types/syncState.types";

/**
 * Interface commune pour les gestionnaires de base de données
 * Permet d'utiliser IndexedDbManager ou MemoryDbManager de manière interchangeable
 */
export interface DbManagerInterface<T extends StoreRecord> {
	/**
	 * Initialise le gestionnaire de base de données
	 */
	init(): Promise<void>;

	/**
	 * Charge tous les enregistrements
	 */
	loadAll(): Promise<T[]>;

	/**
	 * Sauvegarde un ou plusieurs enregistrements
	 */
	save(records: T | T[]): Promise<void>;

	/**
	 * Supprime un enregistrement par son ID
	 */
	delete(id: string): Promise<void>;

	/**
	 * Supprime tous les enregistrements
	 */
	clear(): Promise<void>;

	/**
	 * Obtient un enregistrement par son ID
	 */
	get(id: string): Promise<T | undefined>;

	/**
	 * Vérifie si un enregistrement existe
	 */
	exists(id: string): Promise<boolean>;

	/**
	 * Retourne le nombre d'enregistrements
	 */
	count(): Promise<number>;

	/**
	 * Ferme le gestionnaire et libère les ressources
	 */
	close(): Promise<void>;

	/**
	 * Obtient tous les IDs (clés primaires) stockés
	 */
	getAllIds(): Promise<string[]>;

	/**
	 * Supprime plusieurs enregistrements par leurs IDs
	 */
	deleteMany(ids: string[]): Promise<void>;

	/**
	 * Indique si le gestionnaire est initialisé
	 */
	readonly isInitialized: boolean;
}

import { IndexedDbManager } from "./indexedDbManager.svelte";
import { MemoryDbManager } from "./memoryDbManager.svelte";

/**
 * Factory pour créer le bon type de gestionnaire selon la configuration
 */
export class DbManagerFactory {
	/**
	 * Crée un gestionnaire de base de données selon le mode spécifié
	 */
	static create<T extends StoreRecord>(
		mode: "indexedDB" | "memory",
		dbName: string,
		storeName: string,
		version: number,
		primaryKey: keyof T | "id"
	): DbManagerInterface<T> {
		switch (mode) {
			case "memory":
				return new MemoryDbManager<T>(dbName, storeName, version, primaryKey);

			case "indexedDB":
			default:
				return new IndexedDbManager<T>(dbName, storeName, version, primaryKey);
		}
	}
}
