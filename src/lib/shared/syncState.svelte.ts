import { getFirstListItem, getFullList, getList, getOne, pb } from "$lib/pocketbase.svelte";
import type { Collections, TypedPocketBase } from "$lib/types/pocketbase";
import type {
	Collection,
	IndexConfig,
	InfiniteScrollOptions,
	PaginationState,
	PocketBaseEventData,
	StoreConfig,
	StoreRecord,
	SyncError
} from "$lib/types/syncState.types";
import type { ListResult, RecordSubscription } from "pocketbase";

import { SvelteMap } from "svelte/reactivity";

const subscribe = <T extends StoreRecord>(
	collectionName: Collections,
	callback: (data: PocketBaseEventData<T>) => void,
	options?: { filter?: string }
): (() => void) => {
	pb.collection(collectionName).subscribe(
		"*",
		(data: RecordSubscription<T>) => {
			// Vérifier et convertir l'action
			if (["create", "update", "delete"].includes(data.action)) {
				callback(data as unknown as PocketBaseEventData<T>);
			}
		},
		options
	);

	return () => pb.collection(collectionName).unsubscribe("*");
};

// Interface pour les données internes du store (privées)
export interface SyncStoreState<T extends StoreRecord> {
	byId: SvelteMap<string, T>;
	indexes: SvelteMap<string, Map<string | number, Set<string>>>;
	error: SyncError | null;
	isSyncing: boolean;
	lastSync: Date | null;
	updatedRecords: Set<string>; // Pour trackUpdates
	isInitialized: boolean;
}

/**
 *  DESACTIVED
 * Store de synchronisation pour les données PocketBase avec stockage local IndexedDB.
 *
 * LIMITATION: Ce store ne détecte pas automatiquement les enregistrements supprimés côté serveur
 * pendant une période de déconnexion. Pour gérer ce cas, utilisez la fonction `cleanDeletedRecords`
 * du module spaceOptions.svelte, qui utilise le champ `deleted_records` de la collection spaces_options.
 */
export class SyncStore<T extends StoreRecord> {
	private store: SyncStoreState<T> = $state({
		byId: new SvelteMap<string, T>(),
		indexes: new SvelteMap<string, Map<string | number, Set<string>>>(),
		error: null as SyncError | null,
		isSyncing: false,
		lastSync: null as Date | null,
		updatedRecords: new Set<string>(), // FIXIT : SvelteSet ?
		isInitialized: false
	});

	// Exposer des getters réactifs avec $derived
	readonly allRecords = $derived<T[]>(Array.from(this.store.byId.values()));
	readonly indexedRecords = $derived.by(() => {
		// Créer une copie réactive des index
		const result = new Map();
		for (const [indexName, indexMap] of this.store.indexes.entries()) {
			result.set(indexName, new Map(indexMap));
		}
		return result;
	});
	readonly error = $derived<SyncError | null>(this.store.error);
	readonly isSyncing = $derived<boolean>(this.store.isSyncing);
	readonly isInitialized = $derived<boolean>(this.store.isInitialized);
	// TODO: a ajouter ? →
	// readonly updatedRecords = $derived<T[]>(
	// 		Array.from(this.store.updatedRecords)
	// 			.map((id) => this.store.byId.get(id))
	// 			.filter((record): record is T => record !== undefined)
	// 	);

	// private readonly config: StoreConfig<T>;
	// propriétés pour la gestion de la synchronisation
	private db: IDBDatabase | null = null;
	private collection: Collection | null = null;
	private unsubscribe?: () => void;
	private initPromise: Promise<void>;

	private normalizeConfig(config: StoreConfig<T>): StoreConfig<T> {
		return {
			...config,
			primaryKey: config.primaryKey ?? "id",
			indexes: config.indexes ?? {},
			sync: {
				mode: config.sync?.mode ?? "manual",
				filter: config.sync?.filter,
				interval: config.sync?.interval,
				expand: config.sync?.expand,
				sort: config.sync?.sort
			},
			trackUpdates: config.trackUpdates ?? false,
			cache: {
				maxRecords: config.cache?.maxRecords ?? 1000,
				strategy: config.cache?.strategy ?? "lru"
			}
		};
	}

	constructor(private config: StoreConfig<T>) {
		// console.log("🚀 Création du store:", config.name);
		this.config = this.normalizeConfig(config);
		this.initPromise = this.initDb();
	}

	private get LAST_SYNC_KEY(): string {
		return `${this.config.name}_lastSync`;
	}

	// Méthode pour charger lastSync depuis localStorage
	private loadLastSync(): void {
		const lastSyncStr = localStorage.getItem(this.LAST_SYNC_KEY);
		if (lastSyncStr) {
			this.store.lastSync = new Date(lastSyncStr);
		}
	}

	// Méthode pour sauvegarder lastSync dans localStorage
	private saveLastSync(): void {
		if (this.store.lastSync) {
			localStorage.setItem(this.LAST_SYNC_KEY, this.store.lastSync.toISOString());
		}
	}

	// Méthodes d'accès de base
	public get(id: string): T | undefined {
		return this.store.byId.get(id);
	}

	public getAll(): T[] {
		return Array.from(this.store.byId.values());
	}

	// Getter pour les mises à jour si activé
	public get updates(): T[] {
		if (!this.config.trackUpdates) return [];
		return Array.from(this.store.updatedRecords)
			.map((id) => this.store.byId.get(id))
			.filter((record): record is T => record !== undefined);
	}

	// Méthode pour marquer un record comme mis à jour
	private markAsUpdated(record: T): void {
		if (this.config.trackUpdates) {
			this.store.updatedRecords.add(record.id);
		}
	}

	// Méthode pour effacer les mises à jour
	public clearUpdates(): void {
		this.store.updatedRecords.clear();
	}

	// ---  Méthodes de manipulation des données
	private async set(record: T): Promise<void> {
		const id = record[this.config.primaryKey as keyof T] as string;

		// Vérifier si c'est une nouvelle entrée ou une mise à jour
		const existing = this.store.byId.get(id);
		if (!existing || existing.updated !== record.updated) {
			this.markAsUpdated(record);
		}

		// Mise à jour de la Map principale
		this.store.byId.set(id, record);

		// Mise à jour des index
		await this.updateIndexes(record);
	}

	private async delete(id: string): Promise<void> {
		const record = this.store.byId.get(id);
		if (!record) return;

		// Supprimer des index
		await this.removeFromIndexes(record);

		// Supprimer de la Map principale
		this.store.byId.delete(id);
	}

	// ---  Gestion des index
	private async updateIndexes(record: T): Promise<void> {
		const id = record[this.config.primaryKey as keyof T] as string;

		for (const [indexName, indexConfig] of Object.entries(this.config.indexes ?? {})) {
			const values = this.extractIndexValues(record, indexConfig);

			if (!this.store.indexes.has(indexName)) {
				this.store.indexes.set(indexName, new Map());
			}

			const indexMap = this.store.indexes.get(indexName)!;

			// Nettoyer les anciennes références
			this.cleanupIndexReferences(indexName, id);

			// Ajouter les nouvelles références
			for (const value of values) {
				if (!indexMap.has(value)) {
					indexMap.set(value, new Set());
				}
				indexMap.get(value)!.add(id);
			}
		}
	}

	private async removeFromIndexes(record: T): Promise<void> {
		const id = record[this.config.primaryKey as keyof T] as string;

		for (const indexName of Object.keys(this.config.indexes ?? {})) {
			this.cleanupIndexReferences(indexName, id);
		}
	}

	private cleanupIndexReferences(indexName: string, recordId: string): void {
		const indexMap = this.store.indexes.get(indexName);
		if (!indexMap) return;

		for (const [value, ids] of indexMap) {
			ids.delete(recordId);
			if (ids.size === 0) {
				indexMap.delete(value);
			}
		}
	}

	private extractIndexValues(record: T, indexConfig: IndexConfig): (string | number)[] {
		const path = Array.isArray(indexConfig.path) ? indexConfig.path : [indexConfig.path];
		let values = [this.getValueByPath(record, path)];

		if (indexConfig.transform) {
			values = indexConfig.transform(record);
		}

		return indexConfig.type === "array"
			? values.flat().filter((v): v is string | number => v !== undefined)
			: values.filter((v): v is string | number => v !== undefined);
	}

	private getValueByPath(obj: T, path: string[]): string | number | undefined {
		return path.reduce((current: any, key) => {
			if (key === "*" && Array.isArray(current)) {
				return current.flatMap((item) => item);
			}
			return (current as Record<string, unknown>)[key];
		}, obj as unknown);
	}

	// ---  API publique améliorée
	public getByIndex(indexName: string, value: string | number): T[] {
		const indexMap = this.store.indexes.get(indexName);
		if (!indexMap) return [];

		const ids = indexMap.get(value);
		if (!ids) return [];

		return Array.from(ids)
			.map((id) => this.store.byId.get(id))
			.filter((record): record is T => record !== undefined);
	}

	/**
	 * Retourne tous les enregistrements groupés par valeur d'index
	 * @param indexName Nom de l'index
	 * @returns Map des enregistrements groupés par valeur d'index
	 */
	public getAllByIndex(indexName: string): Map<string | number, T[]> {
		if (!this.store.isInitialized) {
			throw new Error("Store not initialized. Call init() first.");
		}

		const result = new Map<string | number, T[]>();
		const indexMap = this.store.indexes.get(indexName);

		if (!indexMap) {
			console.warn(`Index "${indexName}" not found`);
			return result;
		}

		indexMap.forEach((recordIds, indexValue) => {
			const records = Array.from(recordIds)
				.map((id) => this.store.byId.get(id))
				.filter((record): record is T => record !== undefined);

			if (records.length > 0) {
				result.set(indexValue, records);
			}
		});

		return result;
	}

	public query(): QueryBuilder<T> {
		if (!this.isInitialized) {
			throw new Error("Store not initialized. Call init() first.");
		}
		return new QueryBuilder(this);
	}

	/**
	 * Version optimisée avec mémoisation des résultats
	 * @param indexName Nom de l'index
	 * @returns Map des enregistrements groupés par valeur d'index
	 */
	private indexCaches = new Map<
		string,
		{
			timestamp: number;
			data: Map<string | number, T[]>;
		}
	>();

	public getAllByIndexCached(indexName: string): Map<string | number, T[]> {
		if (!this.store.isInitialized) {
			throw new Error("Store not initialized. Call init() first.");
		}

		const currentTimestamp = this.store.lastSync?.getTime() ?? Date.now();
		const cachedResult = this.indexCaches.get(indexName);

		// Retourner le cache si les données n'ont pas changé
		if (cachedResult && cachedResult.timestamp === currentTimestamp) {
			return cachedResult.data;
		}

		const result = this.getAllByIndex(indexName);

		// Mettre à jour le cache
		this.indexCaches.set(indexName, {
			timestamp: currentTimestamp,
			data: result
		});

		return result;
	}

	// Méthode utilitaire pour invalider le cache d'un index spécifique
	public invalidateIndexCache(indexName?: string): void {
		if (indexName) {
			this.indexCaches.delete(indexName);
		} else {
			this.indexCaches.clear();
		}
	}

	// PAGINATION
	private pagination = $state<PaginationState>({
		currentPage: 1,
		perPage: 20,
		totalItems: 0,
		totalPages: 1,
		hasNextPage: false,
		hasPreviousPage: false,
		loadedPages: new Set<number>()
	});
	// Exposer les propriétés de pagination via des getters réactifs
	readonly currentPage = $derived(this.pagination.currentPage);
	readonly perPage = $derived(this.pagination.perPage);
	readonly totalItems = $derived(this.pagination.totalItems);
	readonly totalPages = $derived(this.pagination.totalPages);
	readonly hasNextPage = $derived(this.pagination.hasNextPage);
	readonly hasPreviousPage = $derived(this.pagination.hasPreviousPage);

	// Méthode pour charger une page spécifique
	public async loadPage(pageNumber: number): Promise<T[]> {
		if (!this.collection) {
			throw new Error("Store not initialized");
		}

		try {
			this.store.isSyncing = true;

			// Vérifier si la page est déjà chargée
			if (this.pagination.loadedPages.has(pageNumber)) {
				this.pagination.currentPage = pageNumber;
				return this.getPageItems(pageNumber);
			}

			const result = await this.collection.getList<T>(pageNumber, this.pagination.perPage, {
				filter: this.config.sync?.filter,
				sort: "-created" // ou autre tri par défaut
			});

			// Mettre à jour l'état de pagination
			this.updatePaginationState(result, pageNumber);

			// Stocker les nouveaux enregistrements
			await this.processBatchUpdate(result.items);

			return result.items;
		} catch (error) {
			this.handleError(error, `Erreur lors du chargement de la page ${pageNumber}`);
			throw error;
		} finally {
			this.store.isSyncing = false;
		}
	}

	// Méthodes de navigation
	public async nextPage(): Promise<T[]> {
		if (!this.hasNextPage) return [];
		return this.loadPage(this.pagination.currentPage + 1);
	}

	public async previousPage(): Promise<T[]> {
		if (!this.hasPreviousPage) return [];
		return this.loadPage(this.pagination.currentPage - 1);
	}

	public async goToPage(page: number): Promise<T[]> {
		if (page < 1 || page > this.pagination.totalPages) return [];
		return this.loadPage(page);
	}

	// Méthode pour obtenir les éléments d'une page spécifique
	private getPageItems(page: number): T[] {
		const start = (page - 1) * this.pagination.perPage;
		const end = start + this.pagination.perPage;
		return this.allRecords.slice(start, end);
	}

	// Méthode pour mettre à jour l'état de pagination
	private updatePaginationState(result: ListResult<T>, currentPage: number): void {
		this.pagination.currentPage = currentPage;
		this.pagination.totalItems = result.totalItems;
		this.pagination.totalPages = result.totalPages;
		this.pagination.hasNextPage = currentPage < result.totalPages;
		this.pagination.hasPreviousPage = currentPage > 1;
		this.pagination.loadedPages.add(currentPage);
	}

	// Méthode pour réinitialiser la pagination
	public resetPagination(): void {
		this.pagination = {
			currentPage: 1,
			perPage: this.pagination.perPage,
			totalItems: 0,
			totalPages: 1,
			hasNextPage: false,
			hasPreviousPage: false,
			loadedPages: new Set<number>()
		};
	}

	// --- LAZY Loading methodes
	private infiniteScroll = $state({
		enabled: false,
		threshold: 80, // Déclencher à 80% du scroll
		batchSize: 20,
		isLoading: false,
		hasMore: true,
		loadedCount: 0
	});

	// Getters réactifs pour l'infinite scroll
	readonly isLoading = $derived(this.infiniteScroll.isLoading);
	readonly hasMore = $derived(this.infiniteScroll.hasMore);
	readonly loadedCount = $derived(this.infiniteScroll.loadedCount);

	// Méthode pour initialiser l'infinite scroll
	public initInfiniteScroll(options?: Partial<InfiniteScrollOptions>): void {
		this.infiniteScroll = {
			...this.infiniteScroll,
			enabled: true,
			threshold: options?.threshold ?? 80,
			batchSize: options?.batchSize ?? 20
		};
	}

	// Méthode pour charger plus de résultats
	public async loadMore(): Promise<T[]> {
		if (!this.collection || this.infiniteScroll.isLoading || !this.infiniteScroll.hasMore) {
			return [];
		}

		try {
			this.infiniteScroll.isLoading = true;

			const nextBatch = await this.collection.getList<T>(1, this.infiniteScroll.batchSize, {
				filter: this.config.sync?.filter,
				sort: "-created",
				skip: this.infiniteScroll.loadedCount // Ignorer les éléments déjà chargés
			});

			// Mettre à jour l'état
			this.infiniteScroll.loadedCount += nextBatch.items.length;
			this.infiniteScroll.hasMore = nextBatch.items.length === this.infiniteScroll.batchSize;

			// Stocker les nouveaux enregistrements
			await this.processBatchUpdate(nextBatch.items);

			return nextBatch.items;
		} catch (error) {
			this.handleError(error, "Erreur lors du chargement de données supplémentaires");
			throw error;
		} finally {
			this.infiniteScroll.isLoading = false;
		}
	}

	// Méthode pour réinitialiser l'infinite scroll
	public resetInfiniteScroll(): void {
		this.infiniteScroll = {
			...this.infiniteScroll,
			isLoading: false,
			hasMore: true,
			loadedCount: 0
		};
		this.store.byId.clear();
	}

	// ---  Initialisation et Configuration
	public async init(collectionName: Collections): Promise<void> {
		try {
			// console.log(
			// 	`\n🚀 Initialisation du store "${this.config.name}" (collection: ${collectionName})`
			// );

			// 1. Initialiser IndexedDB
			// console.log(`👉 ${this.config.name}: Initialisation de la base de données locale`);
			await this.initPromise;

			if (!this.db) {
				throw new Error("IndexedDB initialization failed");
			}

			// 2. Charger lastSync
			// console.log(`👉 ${this.config.name}: Chargement de lastSync`);
			this.loadLastSync();
			// console.log(`📅 ${this.config.name}: Dernière synchro:`, this.store.lastSync);

			// 3. Configurer la collection PocketBase
			// console.log(`👉 ${this.config.name}: Configuration de la collection PocketBase`);
			this.collection = {
				getList: (page, perPage, options) => getList(collectionName, page, perPage, options),
				getFirstListItem: (filter, options) => getFirstListItem(collectionName, filter, options),
				getFullList: (options) => getFullList(collectionName, options),
				getOne: (id, options) => getOne(collectionName, id, options),
				subscribe: (topic, callback, options) => subscribe(collectionName, callback, options),
				unsubscribe: (topic) => pb.collection(collectionName).unsubscribe(topic)
			} as Collection;

			// 4. Charger les données depuis IndexedDB
			// console.log(`📦 ${this.config.name}: Chargement des données depuis IndexedDB`);
			await this.loadFromIndexedDb();
			console.log(`📊 ${this.config.name}: ${this.store.byId.size} enregistrements chargés`);

			// 5. Configurer la synchronisation en temps réel si nécessaire
			if (this.config.sync?.mode === "realtime") {
				// console.log(`🔄 ${this.config.name}: Configuration du mode temps réel`);
				await this.setupRealtimeSync();
				// console.log(`✅ ${this.config.name}: Mode temps réel activé`);
			} else if (this.config.sync?.mode === "interval") {
				// console.log(`⏱️ ${this.config.name}: Configuration du mode intervalle (${this.config.sync.interval}ms)`);
				this.setupIntervalSync();
			}

			this.store.isInitialized = true;

			// 6. Première synchronisation
			// console.log(`↔️ ${this.config.name}: Première synchronisation avec PocketBase`);
			await this.syncWithPocketBase();

			// console.log(`✅ ${this.config.name}: Initialisation terminée\n`);
		} catch (error) {
			console.error(`⚠️ ${this.config.name}: Erreur d'initialisation:`, error);
			throw error;
		}
	}

	// :::  Synchronisation PocketBase

	private async setupRealtimeSync(): Promise<void> {
		if (!this.collection) return;

		// console.log(`👉 ${this.config.name}: Configuration des événements temps réel`);
		// console.log(`📡 ${this.config.name}: Filtre:`, this.config.sync?.filter);

		// Subscribe to all events
		this.collection.subscribe(
			"*",
			((data: RecordSubscription<T>) => {
				if (["create", "update", "delete"].includes(data.action)) {
					const typedData = data as unknown as PocketBaseEventData<T>;
					// console.log(
					// 	`📥 ${this.config.name}: Événement reçu:`,
					// 	typedData.action,
					// 	typedData.record?.id
					// );
					switch (typedData.action) {
						case "create":
						case "update":
							void this.handleRecordUpdate(typedData.record);
							break;
						case "delete":
							void this.handleRecordDeletion(typedData.record.id);
							break;
					}
				}
			}) as (data: RecordSubscription<T>) => void,
			{
				filter: this.config.sync?.filter,
				expand: this.config.sync?.expand
			}
		);

		// Store the unsubscribe function that will be called on cleanup
		this.unsubscribe = () => {
			// console.log(`🧹 ${this.config.name}: Nettoyage des souscriptions`);
			if (this.collection) {
				this.collection.unsubscribe();
			}
		};
	}

	private async handleRecordUpdate(record: T): Promise<void> {
		try {
			// console.log('Handling record update:', record); // Debug log

			// Mettre à jour le record dans la mémoire
			await this.set(record);

			// Sauvegarder dans IndexedDB
			await this.saveToIndexedDb(record);

			// Mise à jour des index si nécessaire
			await this.updateIndexes(record);

			// Appliquer la stratégie de cache si nécessaire
			await this.enforceCacheLimit();
			// console.log("Record update complete");
		} catch (error) {
			this.handleError(error, "Erreur lors de la mise à jour du record");
		}
	}

	private async handleRecordDeletion(recordId: string): Promise<void> {
		try {
			const record = this.store.byId.get(recordId);
			// Supprimer de la mémoire
			await this.delete(recordId);
			if (record) {
				await this.removeFromIndexes(record);
			}
			// Supprimer de IndexedDB
			await this.deleteFromIndexedDb(recordId);
		} catch (error) {
			this.handleError(error, "Erreur lors de la suppression du record");
		}
	}

	private setupIntervalSync(): void {
		const interval = this.config.sync?.interval ?? 30000;
		setInterval(() => this.syncWithPocketBase(), interval);
	}

	public async syncWithPocketBase(): Promise<void> {
		if (!this.collection || this.store.isSyncing) return;

		this.store.isSyncing = true;
		try {
			// console.log(`\n🔄 ${this.config.name}: Début de la synchronisation`);
			const filter = this.buildSyncFilter();
			const sort = this.buildSortString();
			const expand = this.config.sync?.expand;

			// console.log(`📋 ${this.config.name}: Paramètres de requête:`, {
			// 	filter,
			// 	sort,
			// 	lastSync: this.store.lastSync,
			// 	expand
			// });

			const records = await this.collection.getFullList({
				filter,
				sort,
				expand
			});

			console.log(`📥 ${this.config.name}: ${records.length} enregistrements reçus`);
			// if (records.length > 0) {
			// 	console.log(`📝 ${this.config.name}: Premier enregistrement:`, records[0]);
			// }

			await this.processBatchUpdate(records as T[]);

			this.store.lastSync = new Date();
			this.saveLastSync();

			console.log(
				`✅ ${this.config.name}: Synchronisation terminée. Cache size: ${this.store.byId.size}\n`
			);
		} catch (error) {
			console.error(`⚠️ ${this.config.name}: Erreur de synchronisation:`, error);
			this.handleError(error, "Erreur de synchronisation");
		} finally {
			this.store.isSyncing = false;
		}
	}

	// ---  IndexedDB
	private async initDb(): Promise<void> {
		if (this.db) {
			// console.log(`📦 ${this.config.name}: IndexedDB déjà initialisé`);
			return;
		}

		let retries = 0;
		const maxRetries = 3;

		while (retries < maxRetries) {
			try {
				await new Promise<void>((resolve, reject) => {
					// console.log(
					// 	`🗄️ ${this.config.name}: Initialisation IndexedDB (tentative ${retries + 1})...`
					// );

					const dbName = this.config.dbName || this.config.name;
					const request = indexedDB.open(dbName, this.config.version);

					request.onerror = () => {
						console.error(`⚠️ ${this.config.name}: Erreur d'ouverture IndexedDB:`, request.error);
						reject(request.error);
					};

					request.onblocked = () => {
						console.warn(`⚠️ ${this.config.name}: IndexedDB bloqué`);
						// Tenter de fermer toutes les connexions existantes
						if (this.db) {
							this.db.close();
							this.db = null;
						}
					};

					request.onsuccess = () => {
						this.db = request.result;

						// Vérifier que le store existe
						if (!this.db.objectStoreNames.contains(this.config.name)) {
							console.error(`⚠️ ${this.config.name}: Store non trouvé après initialisation`);
							this.db.close();
							this.db = null;
							reject(new Error(`Store ${this.config.name} non trouvé`));
							return;
						}

						// console.log(`✅ ${this.config.name}: IndexedDB initialisé avec succès`);
						resolve();
					};

					request.onupgradeneeded = (event) => {
						// console.log(`🔄 ${this.config.name}: Mise à jour/création du schéma IndexedDB`);
						const db = (event.target as IDBOpenDBRequest).result;

						// Supprimer l'ancien store s'il existe
						if (db.objectStoreNames.contains(this.config.name)) {
							db.deleteObjectStore(this.config.name);
						}

						// Créer le nouveau store
						// console.log(`📝 ${this.config.name}: Création du store`);
						const store = db.createObjectStore(this.config.name, {
							keyPath: this.config.primaryKey as string
						});

						// Créer les index
						if (this.config.indexes) {
							Object.entries(this.config.indexes).forEach(([name, config]) => {
								if (typeof config.path === "string") {
									store.createIndex(name, config.path, {
										multiEntry: config.type === "array"
									});
								}
							});
						}
					};
				});

				// Si on arrive ici, l'initialisation a réussi
				break;
			} catch (error) {
				retries++;
				if (retries >= maxRetries) {
					throw new Error(`Failed to initialize IndexedDB after ${maxRetries} attempts`);
				}
				// Attendre un peu avant de réessayer
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}
	}
	private async loadFromIndexedDb(): Promise<void> {
		if (!this.db) {
			throw new Error("Store not properly initialized");
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(this.config.name, "readonly");
			const store = transaction.objectStore(this.config.name);
			const request = store.getAll();

			request.onerror = () => reject(request.error);

			request.onsuccess = async () => {
				const records = request.result as T[];
				await this.processBatchUpdate(records, false);

				// Si IndexedDB est vide, on force lastSync à null
				// pour déclencher une synchronisation complète
				if (records.length === 0) {
					this.store.lastSync = null;
				}

				resolve();
			};
		});
	}

	private async deleteFromIndexedDb(recordId: string): Promise<void> {
		if (!this.db) {
			throw new Error("Store not properly initialized");
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(this.config.name, "readwrite");
			const store = transaction.objectStore(this.config.name);
			const request = store.delete(recordId);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	// ---  Gestion des mises à jour
	private async processBatchUpdate(records: T[], updateIndexedDb: boolean = true): Promise<void> {
		for (const record of records) {
			await this.set(record);
			if (updateIndexedDb) {
				await this.saveToIndexedDb(record);
			}
		}

		// Maintenir la limite du cache si nécessaire
		await this.enforceCacheLimit();
	}

	private async saveToIndexedDb(record: T): Promise<void> {
		if (!this.db || !this.store.isInitialized) {
			throw new Error("Store not properly initialized");
		}

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(this.config.name, "readwrite");
			const store = transaction.objectStore(this.config.name);
			const request = store.put(record);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	private async enforceCacheLimit(): Promise<void> {
		if (!this.config.cache?.maxRecords) return;

		const excess = this.store.byId.size - this.config.cache.maxRecords;
		if (excess <= 0) return;

		const recordsToRemove = Array.from(this.store.byId.values())
			.sort((a, b) => new Date(a.updated).getTime() - new Date(b.updated).getTime())
			.slice(0, excess);

		for (const record of recordsToRemove) {
			const id = record[this.config.primaryKey as keyof T] as string;
			await this.delete(id);
			await this.deleteFromIndexedDb(id);
		}
	}

	// ::: Utilitaires

	private buildSyncFilter(): string {
		const filters = [];

		// Ajouter le filtre de base s'il existes
		if (this.config.sync?.filter) {
			filters.push(this.config.sync.filter);
		}

		// Si une synchronisation précédente existe et qu'il y a des données en cache
		if (this.store.byId.size > 0 && this.store.lastSync) {
			filters.push(`updated > "${this.store.lastSync.toISOString()}"`);
		}

		// Debug logs
		// console.log(`🔍 ${this.config.name}: Construction du filtre:`, {
		// 	baseFilter: this.config.sync?.filter,
		// 	hasCache: this.store.byId.size > 0,
		// 	lastSync: this.store.lastSync,
		// 	finalFilter: filters.filter(Boolean).join(" && ") || ""
		// });

		return filters.filter(Boolean).join(" && ") || "";
	}

	private buildSortString(): string | undefined {
		const sort = this.config.sync?.sort;
		if (!sort) return undefined;

		if (Array.isArray(sort)) {
			return sort.join(",");
		}
		return sort;
	}

	private handleError(error: unknown, context: string): void {
		const syncError = {
			message: `${context}: ${error instanceof Error ? error.message : "Unknown error"}`,
			timestamp: new Date(),
			details: error
		};
		console.error(syncError);
		this.store.error = syncError;
	}

	/**
	 * Supprime un enregistrement spécifique à la fois de la mémoire et de IndexedDB
	 * Utile pour supprimer des enregistrements qui ont été supprimés côté serveur
	 *
	 * @param id Identifiant de l'enregistrement à supprimer
	 * @returns Promise<void>
	 */
	public async destroyRecord(id: string): Promise<void> {
		await this.delete(id);
		await this.deleteFromIndexedDb(id);
	}

	public async forceRefresh(): Promise<void> {
		if (!this.isInitialized) {
			// Si le store n'est pas initialisé, on réinitialise tout
			await this.initDb();
			await this.init(this.collection?.collectionName as Collections);
		}

		// console.log(`🔄 ${this.config.name}: Démarrage du forceRefresh`);

		try {
			this.store.isSyncing = true;

			// 1. Vider les données sans fermer les connexions
			await this.clearIndexedDb();
			this.store.byId.clear();
			this.store.indexes.clear();
			this.store.updatedRecords.clear();
			this.store.lastSync = null;

			// 2. Recharger depuis PocketBase
			const records = await this.collection!.getFullList<T>({
				filter: this.config.sync?.filter,
				sort: this.buildSortString(),
				expand: this.config.sync?.expand
			});

			// 3. Traiter les enregistrements
			await this.processBatchUpdate(records);

			// 4. Mettre à jour lastSync
			this.store.lastSync = new Date();
			this.saveLastSync();

			console.log(
				`✅ ${this.config.name}: Refresh forcé terminé. ${records.length} enregistrements chargés`
			);
		} catch (error) {
			console.error(`❌ ${this.config.name}: Erreur lors du refresh forcé:`, error);
			this.handleError(error, "Erreur lors du refresh forcé");
			throw error;
		} finally {
			this.store.isSyncing = false;
		}
	}

	public async clearAll(): Promise<void> {
		try {
			// 1. Désabonner des souscriptions realtime
			this.unsubscribe?.();

			// 2. Nettoyer les données en mémoire
			this.store.byId.clear();
			this.store.indexes.clear();
			this.store.updatedRecords.clear();
			this.store.lastSync = null;
			this.store.isInitialized = false;

			// 3. Nettoyer IndexedDB
			await this.clearIndexedDb();

			// 4. Fermer la connexion IndexedDB
			if (this.db) {
				this.db.close();
				this.db = null;
			}
		} catch (error) {
			console.error(`Error clearing store ${this.config.name}:`, error);
			throw error; // On relance l'erreur car c'est une méthode publique
		}
	}

	// Méthode privée pour effacer IndexedDB
	private async clearIndexedDb(): Promise<void> {
		if (!this.db) return;

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(this.config.name, "readwrite");
			const store = transaction.objectStore(this.config.name);
			const request = store.clear();

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}
	// Nettoyage
	public async destroy(): Promise<void> {
		await this.clearAll();
	}
}

// Classe auxiliaire pour les requêtes chainées
class QueryBuilder<T extends StoreRecord> {
	private results: T[];

	constructor(private store: SyncStore<T>) {
		this.results = store.getAll();
	}

	byIndex(indexName: string, value: string | number): this {
		this.results = this.store.getByIndex(indexName, value);
		return this;
	}

	sort(compareFn: (a: T, b: T) => number): this {
		this.results.sort(compareFn);
		return this;
	}

	take(n: number): this {
		this.results = this.results.slice(0, n);
		return this;
	}

	exec(): T[] {
		return this.results;
	}
}
