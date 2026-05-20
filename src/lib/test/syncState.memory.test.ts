// src/lib/test/syncState.memory.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncStore } from '$lib/shared/syncState.svelte';
import type { StoreRecord } from '$lib/types/syncState.types';
import { Collections } from '$lib/types/pocketbase';

/**
 * Tests pour le mode mémoire de SyncStore
 *
 * Ces tests vérifient que :
 * 1. SyncStore peut fonctionner en mode mémoire uniquement
 * 2. Les données ne sont pas persistées dans IndexedDB
 * 3. La destruction libère correctement la mémoire
 * 4. Les performances sont optimales pour les stores temporaires
 */

// Type de test pour les enregistrements
interface TestRecord extends StoreRecord {
	id: string;
	name: string;
	category: string;
	created: string;
	updated: string;
}

describe('SyncStore - Mode Mémoire', () => {
	let mockPb: any;
	let mockCollection: any;

	beforeEach(() => {
		// Mock de PocketBase
		mockCollection = {
			getFullList: vi.fn().mockResolvedValue([]),
			subscribe: vi.fn(),
			unsubscribe: vi.fn()
		};

		mockPb = {
			collection: vi.fn().mockReturnValue(mockCollection)
		};

		// Remplacer l'import de pb
		vi.doMock('$lib/pocketbase.svelte', () => ({
			pb: mockPb
		}));

		// Mock localStorage pour éviter les effets de bord
		const localStorageMock = {
			getItem: vi.fn(() => null),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn()
		};
		Object.defineProperty(window, 'localStorage', {
			value: localStorageMock
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	describe('Configuration et initialisation', () => {
		it('devrait créer un SyncStore en mode mémoire', async () => {
			const store = new SyncStore<TestRecord>({
				name: 'testMemoryStore',
				version: 1,
				storage: 'memory',
				sync: {
					mode: 'manual'
				}
			});

			await store.init(Collections.Messages);

			expect(store.isInitialized).toBe(true);
			expect(store.allRecords).toEqual([]);
		});

		it('devrait utiliser IndexedDB par défaut si storage non spécifié', async () => {
			const store = new SyncStore<TestRecord>({
				name: 'testDefaultStore',
				version: 1,
				sync: {
					mode: 'manual'
				}
			});

			// Mock IndexedDB pour éviter les erreurs
			const mockIndexedDB = {
				open: vi.fn().mockReturnValue({
					onsuccess: null,
					onerror: null,
					onupgradeneeded: null,
					result: {
						transaction: vi.fn().mockReturnValue({
							objectStore: vi.fn().mockReturnValue({
								getAll: vi.fn().mockReturnValue({
									onsuccess: null,
									onerror: null,
									result: []
								})
							})
						})
					}
				})
			};

			Object.defineProperty(window, 'indexedDB', {
				value: mockIndexedDB,
				writable: true
			});

			await store.init(Collections.Messages);

			expect(mockIndexedDB.open).toHaveBeenCalled();
		});
	});

	describe('Gestion des données en mémoire', () => {
		let memoryStore: SyncStore<TestRecord>;

		beforeEach(async () => {
			memoryStore = new SyncStore<TestRecord>({
				name: 'testMemoryData',
				version: 1,
				storage: 'memory',
				indexes: {
					byCategory: {
						path: 'category',
						type: 'single'
					}
				},
				sync: {
					mode: 'manual'
				}
			});

			await memoryStore.init(Collections.Messages);
		});

		afterEach(async () => {
			await memoryStore.destroy();
		});

		it('devrait stocker et récupérer des données en mémoire', async () => {
			const testData: TestRecord[] = [
				{
					id: '1',
					name: 'Test Item 1',
					category: 'A',
					created: '2024-01-01T10:00:00Z',
					updated: '2024-01-01T10:00:00Z'
				},
				{
					id: '2',
					name: 'Test Item 2',
					category: 'B',
					created: '2024-01-01T11:00:00Z',
					updated: '2024-01-01T11:00:00Z'
				}
			];

			// Simuler la réception de données
			mockCollection.getFullList.mockResolvedValue(testData);
			await memoryStore.forceRefresh();

			expect(memoryStore.allRecords).toHaveLength(2);
			expect(memoryStore.allRecords[0].name).toBe('Test Item 1');
			expect(memoryStore.allRecords[1].name).toBe('Test Item 2');
		});

		it('devrait utiliser les index en mode mémoire', async () => {
			const testData: TestRecord[] = [
				{
					id: '1',
					name: 'Item A1',
					category: 'A',
					created: '2024-01-01T10:00:00Z',
					updated: '2024-01-01T10:00:00Z'
				},
				{
					id: '2',
					name: 'Item A2',
					category: 'A',
					created: '2024-01-01T11:00:00Z',
					updated: '2024-01-01T11:00:00Z'
				},
				{
					id: '3',
					name: 'Item B1',
					category: 'B',
					created: '2024-01-01T12:00:00Z',
					updated: '2024-01-01T12:00:00Z'
				}
			];

			mockCollection.getFullList.mockResolvedValue(testData);
			await memoryStore.forceRefresh();

			// Tester la requête par index
			const categoryAItems = memoryStore.getByIndex('byCategory', 'A');
			expect(categoryAItems).toHaveLength(2);
			expect(categoryAItems.every(item => item.category === 'A')).toBe(true);

			const categoryBItems = memoryStore.getByIndex('byCategory', 'B');
			expect(categoryBItems).toHaveLength(1);
			expect(categoryBItems[0].name).toBe('Item B1');
		});

		it('devrait supporter les requêtes chaînées en mode mémoire', async () => {
			const testData: TestRecord[] = [
				{
					id: '1',
					name: 'Alpha',
					category: 'A',
					created: '2024-01-01T10:00:00Z',
					updated: '2024-01-01T10:00:00Z'
				},
				{
					id: '2',
					name: 'Beta',
					category: 'A',
					created: '2024-01-01T11:00:00Z',
					updated: '2024-01-01T11:00:00Z'
				},
				{
					id: '3',
					name: 'Gamma',
					category: 'B',
					created: '2024-01-01T12:00:00Z',
					updated: '2024-01-01T12:00:00Z'
				}
			];

			mockCollection.getFullList.mockResolvedValue(testData);
			await memoryStore.forceRefresh();

			// Tester une requête chaînée
			const results = memoryStore
				.query()
				.byIndex('byCategory', 'A')
				.sort((a, b) => a.name.localeCompare(b.name))
				.exec();

			expect(results).toHaveLength(2);
			expect(results[0].name).toBe('Alpha');
			expect(results[1].name).toBe('Beta');
		});
	});

	describe('Destruction et nettoyage', () => {
		it('devrait détruire complètement un store en mode mémoire', async () => {
			const store = new SyncStore<TestRecord>({
				name: 'testDestroyMemory',
				version: 1,
				storage: 'memory',
				sync: {
					mode: 'manual'
				}
			});

			await store.init(Collections.Messages);

			// Ajouter quelques données
			const testData: TestRecord[] = [
				{
					id: '1',
					name: 'Test',
					category: 'A',
					created: '2024-01-01T10:00:00Z',
					updated: '2024-01-01T10:00:00Z'
				}
			];
			mockCollection.getFullList.mockResolvedValue(testData);
			await store.forceRefresh();

			expect(store.allRecords).toHaveLength(1);
			expect(store.isInitialized).toBe(true);

			// Détruire le store
			await store.destroy();

			expect(store.allRecords).toHaveLength(0);
			expect(store.isInitialized).toBe(false);
		});

		it('devrait nettoyer le localStorage lors de la destruction', async () => {
			const store = new SyncStore<TestRecord>({
				name: 'testLocalStorageCleanup',
				version: 1,
				storage: 'memory',
				sync: {
					mode: 'manual'
				}
			});

			await store.init(Collections.Messages);
			await store.destroy();

			expect(localStorage.removeItem).toHaveBeenCalledWith('testLocalStorageCleanup_lastSync');
		});
	});

	describe('Performance et optimisations', () => {
		it('devrait être plus rapide à initialiser en mode mémoire', async () => {
			const startTime = performance.now();

			const store = new SyncStore<TestRecord>({
				name: 'testPerformance',
				version: 1,
				storage: 'memory',
				sync: {
					mode: 'manual'
				}
			});

			await store.init(Collections.Messages);

			const endTime = performance.now();
			const initTime = endTime - startTime;

			// L'initialisation en mémoire devrait être très rapide (< 10ms)
			expect(initTime).toBeLessThan(10);

			await store.destroy();
		});

		it('devrait gérer un grand volume de données en mémoire', async () => {
			const store = new SyncStore<TestRecord>({
				name: 'testLargeDataset',
				version: 1,
				storage: 'memory',
				cache: {
					maxRecords: 10000
				},
				sync: {
					mode: 'manual'
				}
			});

			await store.init(Collections.Messages);

			// Créer un grand dataset
			const largeDataset: TestRecord[] = Array.from({ length: 5000 }, (_, i) => ({
				id: `item_${i}`,
				name: `Item ${i}`,
				category: `Category ${i % 10}`,
				created: new Date(Date.now() - i * 1000).toISOString(),
				updated: new Date(Date.now() - i * 1000).toISOString()
			}));

			mockCollection.getFullList.mockResolvedValue(largeDataset);

			const startTime = performance.now();
			await store.forceRefresh();
			const endTime = performance.now();

			expect(store.allRecords).toHaveLength(5000);
			expect(endTime - startTime).toBeLessThan(100); // Devrait traiter 5000 items en < 100ms

			await store.destroy();
		});
	});

	describe('Intégration avec MessageManager (cas d\'usage réel)', () => {
		it('devrait simuler l\'utilisation par MessageManager pour une conversation temporaire', async () => {
			// Simuler ce que ferait MessageManager
			const conversationStore = new SyncStore<TestRecord>({
				name: 'temp_conversation_event123',
				version: 1,
				storage: 'memory', // Mode mémoire pour les conversations temporaires
				sync: {
					mode: 'realtime',
					filter: 'event="event123"'
				}
			});

			await conversationStore.init(Collections.Messages);

			// Simuler la réception de messages
			const messages: TestRecord[] = [
				{
					id: 'msg1',
					name: 'Message de test 1',
					category: 'event123',
					created: '2024-01-01T10:00:00Z',
					updated: '2024-01-01T10:00:00Z'
				},
				{
					id: 'msg2',
					name: 'Message de test 2',
					category: 'event123',
					created: '2024-01-01T10:05:00Z',
					updated: '2024-01-01T10:05:00Z'
				}
			];

			mockCollection.getFullList.mockResolvedValue(messages);
			await conversationStore.forceRefresh();

			expect(conversationStore.allRecords).toHaveLength(2);

			// Simuler la fermeture de la conversation
			await conversationStore.destroy();

			// Vérifier que tout est nettoyé
			expect(conversationStore.allRecords).toHaveLength(0);
			expect(conversationStore.isInitialized).toBe(false);
		});
	});

	describe('Gestion des erreurs en mode mémoire', () => {
		it('devrait gérer les erreurs de synchronisation sans affecter la mémoire', async () => {
			const store = new SyncStore<TestRecord>({
				name: 'testErrorHandling',
				version: 1,
				storage: 'memory',
				sync: {
					mode: 'manual'
				}
			});

			await store.init(Collections.Messages);

			// Simuler une erreur de synchronisation
			mockCollection.getFullList.mockRejectedValue(new Error('Network error'));

			await expect(store.forceRefresh()).rejects.toThrow('Network error');

			// Le store devrait rester stable
			expect(store.isInitialized).toBe(true);
			expect(store.allRecords).toHaveLength(0);

			await store.destroy();
		});

		it('devrait gérer la destruction multiple sans erreur', async () => {
			const store = new SyncStore<TestRecord>({
				name: 'testMultipleDestroy',
				version: 1,
				storage: 'memory'
			});

			await store.init(Collections.Messages);

			// Détruire plusieurs fois
			await store.destroy();
			await expect(store.destroy()).resolves.not.toThrow();
		});
	});
});
