import type { ListResult, RecordModel, RecordSubscription } from "pocketbase";

// Type de base pour les records stockés - aligné avec PocketBase
export interface StoreRecord extends RecordModel {
	id: string;
	created: string;
	updated: string;
	[key: string]: unknown;
}

// Interface pour la configuration de l'index
export interface IndexConfig {
	path: string | string[];
	type?: "single" | "array";
	transform?: (record: unknown) => unknown[];
}

// Configuration des options de synchronisation
export interface SyncOptions {
	mode: "manual" | "realtime" | "interval";
	filter?: string;
	interval?: number;
	sort?: string | string[];
	expand?: string;
}

// Configuration du cache
export interface CacheOptions {
	maxRecords?: number;
	strategy?: "lru" | "fifo";
}

// Configuration principale du store
export interface StoreConfig<T extends StoreRecord> {
	name: string;
	version: number;
	dbName?: string; // Ajout de la propriété dbName optionnelle
	primaryKey?: keyof T | "id";
	indexes?: Record<string, IndexConfig>;
	sync?: SyncOptions;
	trackUpdates?: boolean;
	cache?: CacheOptions;
}

// Interface pour les erreurs de synchronisation
export interface SyncError {
	message: string;
	timestamp: Date;
	details?: unknown;
}

// Options pour les requêtes PocketBase
export interface ListOptions {
	filter?: string;
	sort?: string;
	expand?: string;
	fields?: string;
	skipTotal?: boolean;
	page?: number;
	perPage?: number;
	[key: string]: unknown;
}

// Interface pour les méthodes de collection PocketBase
export interface Collection {
	getList: <T extends StoreRecord>(
		page?: number,
		perPage?: number,
		options?: ListOptions
	) => Promise<ListResult<T>>;
	getFirstListItem: <T extends StoreRecord>(filter: string, options?: Record<string, unknown>) => Promise<T>;
	getFullList: <T extends StoreRecord>(options?: ListOptions) => Promise<T[]>;
	getOne: <T extends StoreRecord>(id: string, options?: Record<string, unknown>) => Promise<T>;
	subscribe: (
		topic: string,
		callback: (data: RecordSubscription<StoreRecord>) => void,
		options?: Record<string, unknown>
	) => void;
	unsubscribe: (topic: string) => void;
}

// Type pour les résultats de requête filtrés
export interface QueryResult<T> {
	items: T[];
	total: number;
}

// Type utilitaire pour les chemins d'objet imbriqués
export type PathsToStringProps<T> = T extends string | number | boolean | Date
	? []
	: {
			[K in Extract<keyof T, string>]: [K, ...PathsToStringProps<T[K]>];
		}[Extract<keyof T, string>];

// Type pour les EventData de PocketBase
export interface PocketBaseEventData<T extends StoreRecord = StoreRecord>
	extends Omit<RecordSubscription<T>, "action"> {
	action: "create" | "update" | "delete";
	record: T;
}

// Type pour les résultats de ListResult de PocketBase
export interface PocketBaseListResult<T extends StoreRecord = StoreRecord> extends ListResult<T> {
	items: T[];
	totalItems: number;
	totalPages: number;
	page: number;
	perPage: number;
}

export interface PaginationOptions {
	page: number;
	perPage: number;
	totalItems?: number;
	totalPages?: number;
}

export interface PaginationState {
	currentPage: number;
	perPage: number;
	totalItems: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	loadedPages: Set<number>;
}

export interface InfiniteScrollOptions {
	enabled: boolean;
	threshold?: number; // Pourcentage de la fin de la liste pour déclencher le chargement
	batchSize?: number; // Nombre d'éléments à charger par lot
}
