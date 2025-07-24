// src/lib/shared/globalMessagesStore.svelte.ts
import { SyncStore } from "$lib/shared/syncState.svelte";
import type { MessagesResponse } from "$lib/types/pocketbase";
import { Collections } from "$lib/types/pocketbase";
import type { StoreRecord } from "$lib/types/syncState.types";
import { userDb } from "$lib/shared/userDb.svelte";
import { SvelteDate } from "svelte/reactivity";

// Type compatible avec StoreRecord pour les messages
type MessageStoreRecord = MessagesResponse & StoreRecord;

/**
 * Store global singleton pour les messages concernant l'utilisateur connecté.
 * Utilise SyncStore pour s'abonner en temps réel et rester performant.
 */
class GlobalMessagesStore {
	private syncStore: SyncStore<MessageStoreRecord> | null = null;
	private _isInitialized = $state(false);

	/**
	 * Initialise le store de messages avec le filtre sur l'utilisateur connecté.
	 */
	async init() {
		if (this._isInitialized) {
			return;
		}

		if (!userDb.id) {
			console.warn("[GlobalMessagesStore] No user ID available, aborting init.");
			return;
		}

		// Filtre performant grâce au champ 'users_concerned' dénormalisé
		const filter = `users_concerned ~ "${userDb.id}"`;

		this.syncStore = new SyncStore<MessageStoreRecord>({
			name: "globalMessages",
			version: 1,
			dbName: "globalMessages", // DB dédiée pour ne pas interférer avec d'autres stores
			sync: {
				mode: "realtime",
				filter,
				sort: "-created",
				expand: "user,event"
			}
		});

		try {
			await this.syncStore.init(Collections.Messages);
			this._isInitialized = true;
			console.log("[GlobalMessagesStore] Initialized with filter:", filter);
		} catch (e) {
			console.error("[GlobalMessagesStore] Failed to initialize", e);
		}
	}

	/**
	 * Nettoie et réinitialise le store.
	 */
	async reset() {
		if (this.syncStore) {
			await this.syncStore.destroy();
			this.syncStore = null;
		}
		this._isInitialized = false;
	}

	/**
	 * Tous les messages pertinents pour l'utilisateur.
	 */
	get messages(): MessagesResponse[] {
		return (this.syncStore?.allRecords as MessagesResponse[]) || [];
	}

	/**
	 * État de chargement.
	 */
	get isLoading(): boolean {
		return this.syncStore?.isSyncing || !this._isInitialized;
	}

	/**
	 * État d'initialisation.
	 */
	get isInitialized(): boolean {
		return this._isInitialized;
	}

	/**
	 * Erreur éventuelle.
	 */
	get error(): string | null {
		const syncError = this.syncStore?.error;
		return syncError ? syncError.message || "Erreur de synchronisation des messages" : null;
	}

	/**
	 * Messages groupés par espace.
	 */
	get messagesBySpace(): Record<string, MessagesResponse[]> {
		const grouped: Record<string, MessagesResponse[]> = {};

		this.messages.forEach((message) => {
			const spaceId = message.space;
			if (!grouped[spaceId]) {
				grouped[spaceId] = [];
			}
			grouped[spaceId].push(message);
		});

		return grouped;
	}

	/**
	 * Messages pour un espace donné.
	 */
	getMessagesForSpace(spaceId: string): MessagesResponse[] {
		return this.messages.filter((message) => message.space === spaceId);
	}

	/**
	 * Force un rafraîchissement complet des données.
	 */
	async forceRefresh(): Promise<void> {
		if (this.syncStore) {
			await this.syncStore.forceRefresh();
		}
	}

	/**
	 * Messages récents (dernières 24h).
	 * Reste pertinent pour des affichages synthétiques.
	 */
	get recentMessages(): MessagesResponse[] {
		const yesterday = new SvelteDate();
		yesterday.setDate(yesterday.getDate() - 1);

		return this.messages.filter((message) => {
			const messageDate = new SvelteDate(message.created);
			return messageDate >= yesterday;
		});
	}

	/**
	 * Messages non lus (approximation basée sur la création récente).
	 * Note: Une vraie gestion des messages lus nécessiterait un champ dédié.
	 * Cette logique est utilisée par le système de notification.
	 */
	get unreadMessages(): MessagesResponse[] {
		const twoHoursAgo = new SvelteDate(Date.now() - 2 * 60 * 60 * 1000);

		return this.messages.filter((message) => {
			const messageDate = new SvelteDate(message.created);
			return messageDate >= twoHoursAgo && message.user !== userDb.id;
		});
	}
}

// Export du singleton
export const globalMessagesStore = new GlobalMessagesStore();
