import { SyncStore } from "$lib/shared/syncState.svelte";
import type { MessagesResponse, UsersResponse } from "$lib/types/pocketbase";
import { Collections } from "$lib/types/pocketbase";

/*
 *   **`MessageExpand` Interface:**  Cette interface décrit la structure de la propriété `expand` *que nous utilisons réellement*.  Cela rend le code beaucoup plus sûr en termes de types.  Nous savons que `user` est une relation vers la collection `users`, donc nous utilisons `UsersResponse`.  `replyingTo` peut aussi avoir un `expand`, donc c'est récursif.  `[key: string]: any` permet d'autres champs d'extension possibles.
 *   **`MessageStoreRecord` Type:**  Nous *étendons* `MessagesResponse` avec notre type d'extension spécifique.
 */

// 1. Définir une interface pour le type spécifique de 'expand' attendu.
interface MessageExpand {
	user?: UsersResponse;
	replyingTo?: MessagesResponse & { expand?: MessageExpand }; // Récursif!
	[key: string]: any; // Accepter d'autres champs expand potentiels
}

// 2. Utiliser cette interface dans un type personnalisé qui étend MessagesResponse.
type MessageStoreRecord = MessagesResponse<MessageExpand>;

interface MessageStoreState {
	isInitialized: boolean;
	error: Error | null;
	syncStore: SyncStore<MessageStoreRecord> | null;
}

class MessageStoreClass {
	// store principal avec $state, maintenant privé à la classe
	#store = $state<MessageStoreState>({
		syncStore: null,
		isInitialized: false,
		error: null
	});

	async init(spaceId: string) {
		if (!spaceId) {
			this.#store.error = new Error("Space ID is required to initialize messageStore.");
			return;
		}
		try {
			const syncStore = new SyncStore<MessageStoreRecord>({
				name: "messageStore",
				version: 1,
				indexes: {
					byEvent: {
						path: "event",
						type: "single"
					}
				},
				sync: {
					mode: "realtime",
					filter: `space = "${spaceId}"`,
					expand: "user,replyingTo,replyingTo.user" // Expansion des relations utilisateur et réponses
				},
				trackUpdates: true,
				cache: {
					maxRecords: 500,
					strategy: "lru"
				}
			});
			await syncStore.init(Collections.Messages);
			this.#store.syncStore = syncStore;
			this.#store.isInitialized = true;
			// console.log('Message store initialized successfully (Class)');
		} catch (error) {
			this.#store.error = error as Error;
			console.error("Failed to initialize messageStore (Class):", error);
		}
	}

	/**
	 * Retourne les messages d'un événement spécifique.
	 * @param {string} eventId - L'identifiant de l'événement.
	 * @returns {MessagesResponse[]} - Tableau des messages pour cet événement.
	 */
	getMessageOfEvent = $derived.by(() => (id: string): MessagesResponse[] => {
		if (!this.#store.syncStore) {
			console.warn("messageStore is not initialized yet.");
			return [];
		}

		// le query builder ne sait pas que la liste d'IDs de l'index a changé.
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _ = this.#store.syncStore.allRecords;

		return this.#store.syncStore
			.query()
			.byIndex("byEvent", id)
			.sort((a, b) => {
				return new Date(a.created).getTime() - new Date(b.created).getTime();
			})
			.exec() as MessagesResponse[];
	});

	get isInitialized(): boolean {
		return this.#store.isInitialized;
	}

	get error(): Error | null {
		return this.#store.error;
	}

	/**
	 * Méthode de nettoyage pour détruire l'instance de SyncStore et réinitialiser l'état.
	 */
	async destroy(): Promise<void> {
		if (this.#store.syncStore) {
			await this.#store.syncStore.destroy();
			this.#store.syncStore = null;
		}
		this.#store.isInitialized = false;
		this.#store.error = null;
	}
}

// Instanciation et export du store principal
export const messageStore = new MessageStoreClass();
