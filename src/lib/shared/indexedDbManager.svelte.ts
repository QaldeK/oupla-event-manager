import type { StoreRecord } from "$lib/types/syncState.types";

/**
 * Gestionnaire pour les opérations IndexedDB
 * Classe TypeScript pure sans dépendances Svelte
 */
export class IndexedDbManager<T extends StoreRecord> {
	private db: IDBDatabase | null = null;
	private initPromise: Promise<void> | null = null;

	constructor(
		private dbName: string,
		private storeName: string,
		private version: number,
		private primaryKey: keyof T | "id"
	) {}

	public init(): Promise<void> {
		if (this.initPromise) {
			return this.initPromise;
		}

		this.initPromise = new Promise<void>((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.version);

			request.onerror = () => {
				console.error(
					`IndexedDbManager: Erreur d'ouverture de la DB '${this.dbName}'`,
					request.error
				);
				reject(request.error);
			};

			request.onblocked = () => {
				console.warn(`IndexedDbManager: L'ouverture de la DB '${this.dbName}' est bloquée.`);
				reject(new Error("IndexedDB blocked"));
			};

			request.onsuccess = () => {
				this.db = request.result;
				resolve();
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				if (!db.objectStoreNames.contains(this.storeName)) {
					db.createObjectStore(this.storeName, { keyPath: this.primaryKey as string });
				}
			};
		});

		return this.initPromise;
	}

	/**
	 * Charge tous les enregistrements depuis IndexedDB
	 */
	async loadAll(): Promise<T[]> {
		if (!this.db) {
			// Retourner un tableau vide si pas initialisé
			return [];
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([this.storeName], "readonly");
			const objectStore = transaction.objectStore(this.storeName);
			const request = objectStore.getAll();

			request.onerror = () => {
				console.error(`⚠️ IndexedDbManager: Erreur de chargement:`, request.error);
				reject(request.error);
			};

			request.onsuccess = () => {
				resolve(request.result as T[]);
			};
		});
	}

	/**
	 * Sauvegarde un ou plusieurs enregistrements
	 */
	async save(records: T | T[]): Promise<void> {
		if (!this.db) {
			await this.init();
		}

		const recordsArray = Array.isArray(records) ? records : [records];
		if (recordsArray.length === 0) return;

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([this.storeName], "readwrite");
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);

			const store = transaction.objectStore(this.storeName);
			for (const record of recordsArray) {
				store.put(record);
			}
		});
	}

	/**
	 * Supprime un enregistrement par son ID
	 */
	async delete(recordId: string): Promise<void> {
		if (!this.db) {
			// Pas d'erreur si pas initialisé, juste ignorer
			return;
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([this.storeName], "readwrite");
			const objectStore = transaction.objectStore(this.storeName);
			const request = objectStore.delete(recordId);

			request.onerror = () => {
				console.error(
					`⚠️ IndexedDbManager: Erreur de suppression pour ${recordId}:`,
					request.error
				);
				reject(request.error);
			};

			request.onsuccess = () => {
				resolve();
			};
		});
	}

	/**
	 * Supprime plusieurs enregistrements par leurs IDs dans une seule transaction
	 */
	async deleteMany(recordIds: string[]): Promise<void> {
		if (!this.db || recordIds.length === 0) {
			return;
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([this.storeName], "readwrite");
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => {
				console.error(`⚠️ IndexedDbManager: Erreur de suppression multiple:`, transaction.error);
				reject(transaction.error);
			};

			const objectStore = transaction.objectStore(this.storeName);
			for (const recordId of recordIds) {
				objectStore.delete(recordId);
			}
		});
	}

	/**
	 * Vide complètement le store IndexedDB
	 */
	async clear(): Promise<void> {
		if (!this.db) {
			// Pas d'erreur si pas initialisé, juste ignorer
			return;
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([this.storeName], "readwrite");
			const objectStore = transaction.objectStore(this.storeName);
			const request = objectStore.clear();

			request.onerror = () => {
				console.error(`⚠️ IndexedDbManager: Erreur de vidage:`, request.error);
				reject(request.error);
			};

			request.onsuccess = () => {
				resolve();
			};
		});
	}

	/**
	 * Obtient le nombre total d'enregistrements
	 */
	async count(): Promise<number> {
		if (!this.db) {
			throw new Error("IndexedDB not initialized");
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([this.storeName], "readonly");
			const objectStore = transaction.objectStore(this.storeName);
			const request = objectStore.count();

			request.onerror = () => {
				console.error(`⚠️ IndexedDbManager: Erreur de comptage:`, request.error);
				reject(request.error);
			};

			request.onsuccess = () => {
				resolve(request.result);
			};
		});
	}

	/**
	 * Charge tous les IDs (clés primaires) depuis IndexedDB
	 */
	async getAllIds(): Promise<string[]> {
		if (!this.db) {
			await this.init();
		}
		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(this.storeName, "readonly");
			const store = transaction.objectStore(this.storeName);
			// getAllKeys est beaucoup plus performant que getAll
			const request = store.getAllKeys();
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result as string[]);
		});
	}

	/**
	 * Ferme la connexion à la base de données
	 */
	close(): void {
		if (this.db) {
			this.db.close();
			this.db = null;
		}
	}

	/**
	 * Vérifie si la base est initialisée
	 */
	get isInitialized(): boolean {
		return this.db !== null;
	}

	/**
	 * Obtient le nom de la base de données
	 */
	get databaseName(): string {
		return this.dbName;
	}

	/**
	 * Obtient le nom du store
	 */
	get objectStoreName(): string {
		return this.storeName;
	}
}
