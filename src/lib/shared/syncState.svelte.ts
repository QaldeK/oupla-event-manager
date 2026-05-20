import { pb } from "$lib/pocketbase.svelte";
import { DbManagerFactory } from "$lib/shared/dbManager.interface";
import type { DbManagerInterface } from "$lib/shared/dbManager.interface";
import { IndexManager, QueryBuilder } from "$lib/shared/indexManager.svelte";
import { PocketBaseSyncer } from "$lib/shared/pocketbaseSyncer.svelte";
import type { Collections } from "$lib/types/pocketbase";
import type { Collection, StoreConfig, StoreRecord, SyncError } from "$lib/types/syncState.types";
import type { RecordService } from "pocketbase";
import { SvelteDate, SvelteMap, SvelteSet } from "svelte/reactivity";

export class SyncStore<T extends StoreRecord> {
	// L'état interne, utilisant les types réactifs de Svelte 5
	private store = $state({
		byId: new SvelteMap<string, T>(),
		error: null as SyncError | null,
		isSyncing: false,
		lastSync: null as Date | null,
		updatedRecords: new SvelteSet<string>(),
		isInitialized: false
	});

	// Getters réactifs publics pour l'extérieur
	readonly allRecords = $derived<T[]>(Array.from(this.store.byId.values()));
	readonly error = $derived<SyncError | null>(this.store.error);
	readonly isSyncing = $derived<boolean>(this.store.isSyncing);
	readonly isInitialized = $derived<boolean>(this.store.isInitialized);

	// Modules de gestion internes
	private readonly config: StoreConfig<T>;
	private readonly dbManager: DbManagerInterface<T>;
	private readonly indexManager: IndexManager<T>;
	private syncer: PocketBaseSyncer<T> | null = null;
	private collection: Collection | null = null;
	private collectionName: Collections | null = null;
	private initPromise: Promise<void> | null = null;

	// Clé pour le stockage local de la date de synchro
	private get LAST_SYNC_KEY(): string {
		return `${this.config.name}_lastSync`;
	}

	constructor(config: StoreConfig<T>) {
		this.config = this.normalizeConfig(config);

		// Utiliser la factory pour créer le bon type de gestionnaire
		const storageMode = this.config.storage || "indexedDB";
		this.dbManager = DbManagerFactory.create<T>(
			storageMode,
			this.config.dbName || this.config.name,
			this.config.name,
			this.config.version,
			this.config.primaryKey ?? "id"
		);

		this.indexManager = new IndexManager<T>(this.config.indexes);

		// Log du mode de stockage utilisé
		console.log(`📦 SyncStore "${this.config.name}" configuré en mode ${storageMode}`);
	}

	// --- Initialisation et Cycle de vie ---

	public async init(collectionName: Collections): Promise<void> {
		if (this.initPromise) return this.initPromise;

		this.initPromise = (async () => {
			try {
				this.collectionName = collectionName;
				await this.dbManager.init();

				// Charger les données locales pour un affichage immédiat
				const localRecords = await this.dbManager.loadAll();
				if (localRecords.length > 0) {
					this.processBatchUpdate(localRecords, false); // false pour ne pas réécrire dans la DB
				}

				// Créer l'objet 'collection' pour les appels à PocketBase
				const pbCollection = pb.collection(this.collectionName) as RecordService<T>;

				// Créer et configurer le syncer
				this.syncer = new PocketBaseSyncer<T>(
					this.config.sync || { mode: "manual" },
					collectionName
				);

				this.syncer.onPruneNeeded = (remoteIds) => this._pruneLocalRecords(remoteIds);
				this.syncer.onRecordsReceived = (records) => this.processBatchUpdate(records);
				this.syncer.onRecordDeleted = (recordId) => this.handleRecordDeletion(recordId);
				this.syncer.onSyncComplete = (syncDate) => this.saveLastSync(syncDate);
				this.syncer.onError = (error, context) => this.handleError(error, context);

				let lastSyncDate = this.loadLastSync();
				// Si le cache en mémoire est vide, on force une synchro complète en ignorant la date de la dernière synchro.
				if (this.store.byId.size === 0) {
					lastSyncDate = null;
				}

				if (this.syncer) {
					await this.syncer.start(pbCollection, lastSyncDate);
				}

				// Configurer la synchro par intervalle si nécessaire
				if (this.config.sync?.mode === "interval") {
					this.setupIntervalSync();
				}

				this.store.isInitialized = true;
				console.log(
					`✅ Store "${this.config.name}" initialisé avec ${this.store.byId.size} enregistrements.`
				);
			} catch (error) {
				this.handleError(error, `Initialisation de ${this.config.name}`);
				this.initPromise = null; // Permettre une nouvelle tentative
				throw error;
			}
		})();

		return this.initPromise;
	}

	public async forceRefresh(): Promise<void> {
		if (this.store.isSyncing) return;
		this.store.isSyncing = true;

		try {
			console.log(`🔄 Refresh forcé pour le store "${this.config.name}"`);
			// 1. Vider les données locales (mémoire et IndexedDB)
			await this.clearLocalData();

			// 2. Le syncer va chercher TOUTES les données sur PocketBase
			if (!this.syncer) {
				throw new Error("Syncer non initialisé, impossible de forcer le refresh.");
			}
			await this.syncer.forceRefresh();

			// 3. La nouvelle date de synchro est gérée par le syncer via `onSyncComplete`
			console.log(`✅ Refresh forcé de "${this.config.name}" terminé.`);
		} catch (error) {
			this.handleError(error, "Erreur lors du refresh forcé");
			throw error;
		} finally {
			this.store.isSyncing = false;
		}
	}

	// --- Accès et Manipulation des données ---

	public get(id: string): T | undefined {
		return this.store.byId.get(id);
	}

	public getAll(): T[] {
		return this.allRecords;
	}

	public getByIndex(indexName: string, value: string | number): T[] {
		return this.indexManager.getByIndex(indexName, value, this.store.byId);
	}

	public query(): QueryBuilder<T> {
		if (!this.isInitialized) {
			throw new Error("Store non initialisé. Appelez init() d'abord.");
		}
		return this.indexManager.query(this.store.byId);
	}

	// --- Méthodes privées de gestion interne ---

	private async processBatchUpdate(records: T[], saveToDb: boolean = true): Promise<void> {
		if (records.length === 0) return;

		for (const record of records) {
			const id = record[this.config.primaryKey as keyof T] as string;
			const existing = this.store.byId.get(id);

			// Mark as updated only if it's new or the 'updated' field has changed
			if (!existing || existing.updated !== record.updated) {
				this.markAsUpdated(record);
			}

			this.store.byId.set(id, record);
			this.indexManager.addOrUpdate(record);
		}

		if (saveToDb) {
			await this.dbManager.save(records);
		}

		await this.enforceCacheLimit();
	}

	private async handleRecordDeletion(recordId: string): Promise<void> {
		const record = this.store.byId.get(recordId);
		if (!record) return;

		this.store.byId.delete(recordId);
		this.indexManager.remove(record);
		await this.dbManager.delete(recordId);
	}

	private async _pruneLocalRecords(remoteIds: string[]): Promise<void> {
		const localIds = await this.dbManager.getAllIds();

		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const remoteIdSet = new Set(remoteIds);

		const idsToDelete = localIds.filter((id) => !remoteIdSet.has(id));

		if (idsToDelete.length === 0) {
			return; // Pas de nettoyage nécessaire
		}

		console.log(
			`[SyncStore: ${this.config.name}] Nettoyage de ${idsToDelete.length} enregistrement(s) obsolète(s).`
		);

		// 1. Suppression optimisée de la base de données locale
		await this.dbManager.deleteMany(idsToDelete);

		// 2. Mise à jour de l'état en mémoire et des index
		for (const id of idsToDelete) {
			const recordToDelete = this.store.byId.get(id);
			if (recordToDelete) {
				this.store.byId.delete(id);
				this.indexManager.remove(recordToDelete);
			}
		}
	}

	private async clearLocalData(): Promise<void> {
		this.store.byId.clear();
		this.indexManager.clear();
		this.store.updatedRecords.clear();
		this.store.lastSync = null;
		localStorage.removeItem(this.LAST_SYNC_KEY);
		await this.dbManager.clear();
	}

	private setupIntervalSync(): void {
		const interval = this.config.sync?.interval ?? 60000;
		setInterval(async () => {
			if (this.store.isSyncing) return;
			this.store.isSyncing = true;
			try {
				await this.syncer?.sync();
			} catch (error) {
				this.handleError(error, "Interval sync");
			} finally {
				this.store.isSyncing = false;
			}
		}, interval);
	}

	private loadLastSync(): Date | null {
		const lastSyncStr = localStorage.getItem(this.LAST_SYNC_KEY);
		if (lastSyncStr) {
			const date = new SvelteDate(lastSyncStr);
			this.store.lastSync = date;
			return date;
		}
		return null;
	}

	private saveLastSync(date?: Date): void {
		const dateToSave = date || new SvelteDate();
		this.store.lastSync = dateToSave;
		localStorage.setItem(this.LAST_SYNC_KEY, dateToSave.toISOString());
	}

	private handleError(error: unknown, context: string): void {
		const syncError: SyncError = {
			message: `${context}: ${error instanceof Error ? error.message : String(error)}`,
			timestamp: new SvelteDate(),
			details: error
		};
		console.error(`❌ Erreur dans SyncStore [${context}]`, syncError);
		this.store.error = syncError;
	}

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

	private async enforceCacheLimit(): Promise<void> {
		if (!this.config.cache?.maxRecords) return;

		const excess = this.store.byId.size - this.config.cache.maxRecords;
		if (excess <= 0) return;

		const recordsToRemove = Array.from(this.store.byId.values())
			.sort((a, b) => new SvelteDate(a.updated).getTime() - new SvelteDate(b.updated).getTime())
			.slice(0, excess);

		for (const record of recordsToRemove) {
			await this.handleRecordDeletion(record.id);
		}
	}

	private markAsUpdated(record: T): void {
		if (this.config.trackUpdates) {
			this.store.updatedRecords.add(record.id);
		}
	}

	// --- Pagination Locale ---

	#pagination = $state({
		pageSize: 20,
		currentPage: 1
	});

	// Propriétés publiques et réactives pour l'état de la pagination
	readonly totalRecords = $derived(this.allRecords.length);
	readonly totalPages = $derived(Math.ceil(this.totalRecords / this.#pagination.pageSize));
	readonly currentPage = $derived(this.#pagination.currentPage);
	readonly pageSize = $derived(this.#pagination.pageSize);

	// Le tableau des enregistrements pour la page actuelle
	readonly paginatedRecords = $derived.by(() => {
		const start = (this.#pagination.currentPage - 1) * this.#pagination.pageSize;
		const end = start + this.#pagination.pageSize;
		return this.allRecords.slice(start, end);
	});

	// Méthodes publiques pour contrôler la pagination
	setPage(page: number): void {
		if (page > 0 && page <= this.totalPages) {
			this.#pagination.currentPage = page;
		}
	}

	nextPage(): void {
		this.setPage(this.#pagination.currentPage + 1);
	}

	previousPage(): void {
		this.setPage(this.#pagination.currentPage - 1);
	}

	setPageSize(size: number): void {
		if (size > 0) {
			this.#pagination.pageSize = size;
			this.#pagination.currentPage = 1; // Revenir à la première page
		}
	}

	// --- Lazy Loader Factory ---

	/**
	 * Crée une vue "lazy-loaded" et triée des données du store.
	 * @param options - Configuration pour le tri et la taille des lots.
	 * @returns Un objet réactif pour contrôler et afficher les données lazy-loadées.
	 */
	createLazyLoader(options: { sortFn: (a: T, b: T) => number; batchSize?: number }) {
		const { sortFn, batchSize = 20 } = options;

		// 1. L'état interne du loader, spécifique à CETTE instance
		const loaderState = $state({
			loadedCount: batchSize
		});

		// 2. Un signal dérivé qui contient TOUS les enregistrements, mais triés selon la fonction fournie.
		const sortedSource = $derived.by(() => {
			// On crée une copie pour ne pas muter `allRecords`
			return [...this.allRecords].sort(sortFn);
		});

		// 3. Les enregistrements actuellement visibles, basés sur le tri et le `loadedCount`
		const records = $derived.by(() => {
			return sortedSource.slice(0, loaderState.loadedCount);
		});

		// 4. Un booléen pour savoir s'il y a plus à charger
		const hasMore = $derived(loaderState.loadedCount < sortedSource.length);

		// 5. Les méthodes pour interagir avec ce loader
		const loadMore = () => {
			if (hasMore) {
				loaderState.loadedCount = Math.min(
					loaderState.loadedCount + batchSize,
					sortedSource.length
				);
			}
		};

		const reset = () => {
			loaderState.loadedCount = batchSize;
		};

		// On retourne l'API publique de ce loader
		return {
			records: records,
			hasMore: hasMore,
			loadMore,
			reset
		};
	}

	// --- Nettoyage et Destruction ---

	/**
	 * Détruit complètement l'instance SyncStore et libère toutes les ressources
	 * Utile pour les stores temporaires en mode mémoire
	 */
	async destroy(): Promise<void> {
		try {
			// 1. Arrêter la synchronisation
			if (this.syncer) {
				await this.syncer.stop();
				this.syncer = null;
			}

			// 2. Nettoyer les données en mémoire
			this.store.byId.clear();
			this.store.updatedRecords.clear();
			this.indexManager.clear();

			// 3. Fermer et nettoyer le gestionnaire de base de données
			await this.dbManager.close();

			// 4. Nettoyer le localStorage si nécessaire
			localStorage.removeItem(this.LAST_SYNC_KEY);

			// 5. Réinitialiser l'état
			this.store.isInitialized = false;
			this.store.isSyncing = false;
			this.store.error = null;
			this.store.lastSync = null;
			this.collection = null;
			this.collectionName = null;
			this.initPromise = null;

			console.log(`🗑️ SyncStore "${this.config.name}" détruit et nettoyé`);
		} catch (error) {
			console.error(`❌ Erreur lors de la destruction de SyncStore "${this.config.name}":`, error);
			throw error;
		}
	}
}
