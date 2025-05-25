export { default as Pagination } from './Pagination.svelte';
export { default as LazyLoader } from './LazyLoader.svelte';

export interface PaginationConfig {
	pageSize: number;
	currentPage: number;
	totalPages: number;
	totalItems: number;
	hasNext: boolean;
	hasPrevious: boolean;
}

export interface LazyLoadConfig {
	hasMore: boolean;
	isLoading: boolean;
	threshold?: number;
	autoLoad?: boolean;
	batchSize?: number;
}