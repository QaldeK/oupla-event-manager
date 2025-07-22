import { getFullList, getList, getOne, pb } from "$lib/pocketbase.svelte";
import type { Collections } from "$lib/types/pocketbase";
import type {
	Collection,
	InfiniteScrollOptions,
	PaginationState,
	StoreConfig,
	StoreRecord,
	SyncError
} from "$lib/types/syncState.types";
import type { ListResult, RecordSubscription } from "pocketbase";

import { SvelteDate, SvelteMap, SvelteSet } from "svelte/reactivity";
import { IndexedDbManager } from "$lib/shared/indexedDbManager.svelte";
import { IndexManager, QueryBuilder } from "$lib/shared/indexManager.svelte";
import { PocketBaseSyncer } from "$lib/shared/pocketbaseSyncer.svelte";

const subscribe = <T extends StoreRecord>(
	collectionName: Collections,
	callback: (data: RecordSubscription<T>) => void,
	options?: { filter?: string }
): (() => void) => {
	pb.collection(collectionName).subscribe(
		"*",
		(data: RecordSubscription<T>) => {
			// Vérifier et convertir l'action
			if (["create", "update", "delete"].includes(data.action)) {
				callback(data);
			}
		},
		options
	);

	return () => pb.collection(collectionName).unsubscribe("*");
};

const unsubscribe = (collectionName: Collections, topic: string): void => {
	pb.collection(collectionName).unsubscribe(topic);
};

// Interface pour les données internes du store (privées)
export interface SyncStoreState<T extends StoreRecord> {
	byId: SvelteMap<string, T>;
	indexes: SvelteMap<string, Map<string | number, Set<string>>>;
	error: SyncError | null;
	isSyncing: boolean;
	lastSync: Date | null;
	updatedRecords: SvelteSet<string>; // Pour trackUpdates
	isInitialized: boolean;
}

export class SyncStore<T extends StoreRecord> {
	store: SyncStoreState<T> = $state({
		byId: new SvelteMap<string, T>(),
		indexes: new SvelteMap<string, SvelteMap<string | number, SvelteSet<string>>>(),
		error: null as SyncError | null,
		isSyncing: false,
		lastSync: null as SvelteDate | null,
		updatedRecords: new SvelteSet<string>(),
		isInitialized: false
	});

	// Exposer des getters réactifs avec $derived
	readonly allRecords = $derived<T[]>(Array.from(this.store.byId.values()));
	readonly indexedRecords = $derived.by(() => {
		// Créer une copie réactive des index
		const result = new SvelteMap();
		for (const [indexName, indexMap] of this.store.indexes.entries()) {
			result.set(indexName, new SvelteMap(indexMap));
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
	private collectionName: Collections | null = null;
	private initPromise: Promise<void> | null;
	private dbManager: IndexedDbManager<T>;
	private indexManager: IndexManager<T>;
	private syncer: PocketBaseSyncer<T> | null = null;
	private unsubscribe: (() => void) | null = null;

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
		this.dbManager = new IndexedDbManager<T>(
			this.config.dbName || this.config.name,
			this.config.name,
			this.config.version,
			this.config.primaryKey ?? "id"
		);
		this.indexManager = new IndexManager<T>(this.config.indexes);
		this.initPromise = null; // Important: on réinitialise initPromise
	}

	private get LAST_SYNC_KEY(): string {
		return `${this.config.name}_lastSync`;
	}

	// Méthode pour charger lastSync depuis localStorage
	private loadLastSync(): Date | null {
		const lastSyncStr = localStorage.getItem(this.LAST_SYNC_KEY);
		if (lastSyncStr) {
			this.store.lastSync = new SvelteDate(lastSyncStr);
			return new SvelteDate(lastSyncStr);
		}
		return null;
	}

	// Méthode pour sauvegarder lastSync dans localStorage
	private saveLastSync(date?: Date): void {
		const dateToSave = date || this.store.lastSync;
		if (dateToSave) {
			this.store.lastSync = new SvelteDate(dateToSave);
			localStorage.setItem(this.LAST_SYNC_KEY, dateToSave.toISOString());
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
		this.indexManager.addOrUpdate(record);
	}

	private async delete(id: string): Promise<void> {
		const record = this.store.byId.get(id);
		if (!record) return;

		// Supprimer de la Map principale
		this.store.byId.delete(id);

		// Supprimer des index
		this.indexManager.remove(record);
	}

	public getByIndex(indexName: string, value: string | number): T[] {
		return this.indexManager.getByIndex(indexName, value, this.store.byId);
	}

	/**
	 * Retourne tous les enregistrements groupés par valeur d'index
	 * @param indexName Nom de l'index
	 * @returns Map des enregistrements groupés par valeur d'index
	 */
	public getAllByIndex(): Map<string | number, T[]> {
		if (!this.store.isInitialized) {
			throw new Error("Store not initialized. Call init() first.");
		}

		// Pour l'instant, on retourne une Map vide car IndexManager n'a pas cette méthode
		// Il faudrait l'ajouter à IndexManager si nécessaire
		return new SvelteMap<string | number, T[]>();
	}

	public query(): QueryBuilder<T> {
		if (!this.isInitialized) {
			throw new Error("Store not initialized. Call init() first.");
		}
		return this.indexManager.query(this.store.byId);
	}

	/**
	 * Version optimisée avec mémoisation des résultats
	 * @param indexName Nom de l'index
	 * @returns Map des enregistrements groupés par valeur d'index
	 */
	private indexCaches = new SvelteMap<
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

		const result = this.getAllByIndex();

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
		loadedPages: new SvelteSet<number>()
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
			loadedPages: new SvelteSet<number>()
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
		if (this.initPromise) return this.initPromise;

		this.initPromise = (async () => {
			try {
				await this.dbManager.init();

				// 1. Créer l'objet collection pour PocketBase
				this.collectionName = collectionName;
				this.collection = {
					getFullList: (options) => getFullList<T>(collectionName, options),
					getList: (page, perPage, options) => getList<T>(collectionName, page, perPage, options),
					getOne: (id, options) => getOne(collectionName, id, options),
					getFirstListItem: () => Promise.resolve({} as T),
					subscribe: (topic, callback, options) => subscribe(collectionName, callback, options),
					unsubscribe: (topic) => unsubscribe(collectionName, topic)
				} as Collection;

				// Initialiser le syncer avec les callbacks
				this.syncer = new PocketBaseSyncer<T>(
					this.config.sync || { mode: "manual" },
					collectionName
				);
				this.syncer.onRecordsReceived = async (records: T[]) => {
					await this.processBatchUpdate(records);
				};
				this.syncer.onRecordDeleted = async (recordId: string) => {
					await this.delete(recordId);
				};
				this.syncer.onError = (error: Error | unknown, context: string) => {
					this.handleError(error, context);
				};

				// 2. Charger les données locales pour un affichage rapide
				const localRecords = await this.dbManager.loadAll();
				if (localRecords.length > 0) {
					this.store.byId = new SvelteMap(localRecords.map((r) => [r.id, r]));
					this.indexManager.buildFrom(localRecords);
				}

				// 3. Démarrer le syncer, qui s'occupe de la synchro initiale et du temps réel
				// On attend cette étape pour garantir que l'état initial est cohérent avant de continuer.
				if (this.syncer) {
					await this.syncer.start(this.collection, this.loadLastSync());
				}

				// 5. Configurer la synchro par intervalle si nécessaire (ne bloque pas l'init)
				if (this.config.sync?.mode === "interval") {
					this.setupIntervalSync();
				}

				this.store.isInitialized = true;
			} catch (error) {
				this.handleError(error, `Initialisation de ${this.config.name}`);
				this.initPromise = null;
				throw error;
			}
		})();

		return this.initPromise;
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
					// console.log(
					// 	`📥 ${this.config.name}: Événement reçu:`,
					// 	data.action,
					// 	data.record?.id
					// );
					switch (data.action) {
						case "create":
						case "update":
							this.handleRecordUpdate(data.record);
							break;
						case "delete":
							this.handleRecordDeletion(data.record.id);
							break;
					}
				}
			}) as (data: RecordSubscription<StoreRecord>) => void,
			{
				filter: this.config.sync?.filter,
				expand: this.config.sync?.expand || ""
			}
		);

		// Store the unsubscribe function that will be called on cleanup
		this.unsubscribe = () => {
			// console.log(`🧹 ${this.config.name}: Nettoyage des souscriptions`);
			if (this.collection) {
				this.collection.unsubscribe("*");
			}
		};
	}

	private async handleRecordUpdate(record: T): Promise<void> {
		try {
			// console.log('Handling record update:', record); // Debug log

			// Mettre à jour le record dans la mémoire
			await this.set(record);

			// Sauvegarder dans IndexedDB
			await this.dbManager.save(record);

			// Mise à jour des index si nécessaire
			this.indexManager.addOrUpdate(record);

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
				this.indexManager.remove(record);
			}
			// Supprimer de IndexedDB
			await this.dbManager.delete(recordId);
		} catch (error) {
			this.handleError(error, "Erreur lors de la suppression du record");
		}
	}

	private setupIntervalSync(): void {
		const interval = this.config.sync?.interval ?? 30000;
		setInterval(() => this.syncWithPocketBase(), interval);
	}

	public async syncWithPocketBase(): Promise<void> {
		if (this.store.isSyncing) return;
		this.store.isSyncing = true;
		try {
			if (!this.syncer) {
				throw new Error("Syncer not initialized");
			}
			const syncTime = await this.syncer.sync();
			if (syncTime) {
				this.saveLastSync(syncTime);
				console.log(
					`✅ ${this.config.name}: Synchronisation terminée. Cache size: ${this.store.byId.size}\n`
				);
			}
		} catch (error) {
			this.handleError(error, "syncWithPocketBase");
		} finally {
			this.store.isSyncing = false;
		}
	}

	// ---  Gestion des mises à jour
	private async processBatchUpdate(records: T[], updateIndexedDb: boolean = true): Promise<void> {
		for (const record of records) {
			await this.set(record);
			if (updateIndexedDb) {
				await this.dbManager.save(record);
			}
		}

		// Maintenir la limite du cache si nécessaire
		await this.enforceCacheLimit();
	}

	private async enforceCacheLimit(): Promise<void> {
		if (!this.config.cache?.maxRecords) return;

		const excess = this.store.byId.size - this.config.cache.maxRecords;
		if (excess <= 0) return;

		const recordsToRemove = Array.from(this.store.byId.values())
			.sort((a, b) => new SvelteDate(a.updated).getTime() - new SvelteDate(b.updated).getTime())
			.slice(0, excess);

		for (const record of recordsToRemove) {
			const id = record[this.config.primaryKey as keyof T] as string;
			await this.handleRecordDeletion(id);
		}
	}

	// ::: Utilitaires

	private buildSyncFilter(): string {
		const filters: string[] = [];

		// Ajouter le filtre de base s'il existes
		if (this.config.sync?.filter) {
			filters.push(this.config.sync.filter);
		}

		// Si une synchronisation précédente existe et qu'il y a des données en cache
		if (this.store.byId.size > 0 && this.store.lastSync) {
			const lastSyncISO = this.store.lastSync.toISOString();
			filters.push(`updated > "${lastSyncISO}"`);
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
			timestamp: new SvelteDate(),
			details: error
		};
		console.error(syncError);
		this.store.error = syncError;
	}

	public async forceRefresh(): Promise<void> {
		if (!this.isInitialized) {
			// Si le store n'est pas initialisé, on réinitialise tout
			await this.init(this.collectionName as Collections);
		}

		// console.log(`🔄 ${this.config.name}: Démarrage du forceRefresh`);

		try {
			this.store.isSyncing = true;

			// 1. Vider les données sans fermer les connexions
			await this.clearAll();

			// 2. Recharger depuis PocketBase
			// 3. Force refresh via syncer
			if (!this.syncer) {
				throw new Error("Syncer not initialized");
			}
			await this.syncer.forceRefresh();

			// 4. Recharger depuis la DB locale
			const records = await this.dbManager.loadAll();
			await this.processBatchUpdate(records);

			// 5. Mettre à jour lastSync
			this.store.lastSync = new SvelteDate();
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
			await this.dbManager.clear();
		} catch (error) {
			console.error(`Error clearing store ${this.config.name}:`, error);
			throw error; // On relance l'erreur car c'est une méthode publique
		}
	}

	// Nettoyage
	public async destroy(): Promise<void> {
		await this.clearAll();
		this.dbManager.close();
	}
}
