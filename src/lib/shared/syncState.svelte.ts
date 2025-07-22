import { getFullList, getList, getOne } from "$lib/pocketbase.svelte";
import type { Collections } from "$lib/types/pocketbase";
import type { Collection, StoreConfig, StoreRecord, SyncError } from "$lib/types/syncState.types";
import type { RecordSubscription } from "pocketbase";
import { SvelteMap, SvelteSet } from "svelte/reactivity";
import { IndexedDbManager } from "$lib/shared/indexedDbManager.svelte";
import { IndexManager, QueryBuilder } from "$lib/shared/indexManager.svelte";
import { PocketBaseSyncer } from "$lib/shared/pocketbaseSyncer.svelte";
import { pb } from "$lib/pocketbase.svelte";

// NOTE: J'ai remis les fonctions subscribe/unsubscribe ici pour garder les dépendances PB centralisées
// dans ce fichier, comme dans l'original.
const subscribe = <T extends StoreRecord>(
	collectionName: Collections,
	callback: (data: RecordSubscription<T>) => void,
	options?: { filter?: string; expand?: string }
): (() => void) => {
	pb.collection(collectionName).subscribe(
		"*",
		(data: RecordSubscription<T>) => {
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
	private readonly dbManager: IndexedDbManager<T>;
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
		this.dbManager = new IndexedDbManager<T>(
			this.config.dbName || this.config.name,
			this.config.name,
			this.config.version,
			this.config.primaryKey ?? "id"
		);
		this.indexManager = new IndexManager<T>(this.config.indexes);
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
				this.setupCollectionApi(collectionName);

				// Créer et configurer le syncer
				this.setupSyncer(collectionName);

				// --- CORRECTION MAJEURE DE LA LOGIQUE DE SYNCHRO ---
				// On détermine s'il faut faire une synchro complète ou incrémentielle
				let lastSyncDate = this.loadLastSync();
				// Si le cache en mémoire est vide, on force une synchro complète
				// en ignorant la date de la dernière synchro. C'est la logique clé qui manquait.
				if (this.store.byId.size === 0) {
					lastSyncDate = null;
				}

				if (this.syncer) {
					await this.syncer.start(this.collection!, lastSyncDate);
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

	public async destroy(): Promise<void> {
		this.syncer?.stop();
		await this.clearLocalData();
		this.dbManager.close();
		this.initPromise = null;
		this.store.isInitialized = false;
		console.log(`💥 Store "${this.config.name}" détruit.`);
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

	private async clearLocalData(): Promise<void> {
		this.store.byId.clear();
		this.indexManager.clear();
		this.store.updatedRecords.clear();
		this.store.lastSync = null;
		localStorage.removeItem(this.LAST_SYNC_KEY);
		await this.dbManager.clear();
	}

	private setupCollectionApi(collectionName: Collections): void {
		this.collection = {
			getFullList: (options) => getFullList<T>(collectionName, options),
			getList: (page, perPage, options) => getList<T>(collectionName, page, perPage, options),
			getOne: (id, options) => getOne<T>(collectionName, id, options),
			subscribe: (topic, callback, options) => subscribe(collectionName, callback as any, options),
			unsubscribe: (topic) => unsubscribe(collectionName, topic),
			// getFirstListItem est moins utilisé, on le laisse avec un type de retour simple
			getFirstListItem: () => Promise.resolve({} as T)
		};
	}

	private setupSyncer(collectionName: string): void {
		this.syncer = new PocketBaseSyncer<T>(this.config.sync || { mode: "manual" }, collectionName);

		this.syncer.onRecordsReceived = (records) => this.processBatchUpdate(records);
		this.syncer.onRecordDeleted = (recordId) => this.handleRecordDeletion(recordId);
		this.syncer.onSyncComplete = (syncDate) => this.saveLastSync(syncDate);
		this.syncer.onError = (error, context) => this.handleError(error, context);
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
			const date = new Date(lastSyncStr);
			this.store.lastSync = date;
			return date;
		}
		return null;
	}

	private saveLastSync(date?: Date): void {
		const dateToSave = date || new Date();
		this.store.lastSync = dateToSave;
		localStorage.setItem(this.LAST_SYNC_KEY, dateToSave.toISOString());
	}

	private handleError(error: unknown, context: string): void {
		const syncError: SyncError = {
			message: `${context}: ${error instanceof Error ? error.message : String(error)}`,
			timestamp: new Date(),
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
			.sort((a, b) => new Date(a.updated).getTime() - new Date(b.updated).getTime())
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
}
