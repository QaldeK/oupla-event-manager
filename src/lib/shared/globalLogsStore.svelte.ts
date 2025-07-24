// src/lib/shared/globalLogsStore.svelte.ts
import { SyncStore } from "$lib/shared/syncState.svelte";
import type { LogsResponse } from "$lib/types/pocketbase";
import type { StoreRecord } from "$lib/types/syncState.types";
import { Collections } from "$lib/types/pocketbase";
import { userDb } from "$lib/shared/userDb.svelte";

// Type compatible avec StoreRecord pour les logs
type LogStoreRecord = LogsResponse & StoreRecord;

/**
 * Store global singleton pour la gestion centralisée des logs
 * Utilise SyncStore pour s'abonner en temps réel aux logs des espaces de l'utilisateur
 */
class GlobalLogsStore {
	private syncStore: SyncStore<LogStoreRecord> | null = null;
	private initialized = false;

	/**
	 * Initialise le store de logs avec les espaces de l'utilisateur
	 */
	async init() {
		if (this.initialized || !userDb.memberOf?.length) {
			return;
		}

		// Construire le filtre pour tous les espaces de l'utilisateur
		const filter = userDb.memberOf.map((space) => `space = "${space.id}"`).join(" || ");

		this.syncStore = new SyncStore<LogStoreRecord>({
			name: "globalLogs",
			version: 1,
			dbName: "globalLogs",
			sync: {
				mode: "realtime",
				filter,
				sort: "-created",
				expand: "user_actor_id"
			}
		});

		await this.syncStore.init(Collections.Logs);
		this.initialized = true;
		console.log("[DEBUG] GlobalLogsStore initialized with filter:", filter);
	}

	/**
	 * Nettoie et réinitialise le store
	 */
	async reset() {
		if (this.syncStore) {
			await this.syncStore.destroy();
			this.syncStore = null;
		}
		this.initialized = false;
	}

	/**
	 * Tous les logs disponibles
	 */
	get allLogs(): LogsResponse[] {
		return (this.syncStore?.allRecords as LogsResponse[]) || [];
	}

	/**
	 * Logs concernant personnellement l'utilisateur connecté
	 */
	get myLogs(): LogsResponse[] {
		if (!userDb.id) return [];

		return this.allLogs.filter(
			(log) => log.users_concerned?.includes(userDb.id!) || log.user_actor_id === userDb.id
		);
	}

	/**
	 * Logs d'invitations/sollicitations pour l'utilisateur
	 */
	get myInvitations(): LogsResponse[] {
		const invitationActions = ["organizers_changed", "sondage_proposed", "event_confirmed"];

		return this.myLogs.filter(
			(log) => invitationActions.includes(log.action) && log.user_actor_id !== userDb.id // Exclure ses propres actions
		);
	}

	/**
	 * Logs par espace
	 */
	getLogsBySpace(spaceId: string): LogsResponse[] {
		return this.allLogs.filter((log) => log.space === spaceId);
	}

	/**
	 * Logs qui concernent personnellement l'utilisateur pour un espace donné
	 */
	getMyLogsBySpace(spaceId: string): LogsResponse[] {
		if (!userDb.id) return [];

		return this.getLogsBySpace(spaceId).filter(
			(log) => log.users_concerned?.includes(userDb.id!) || log.user_actor_id === userDb.id
		);
	}

	/**
	 * Activité générale d'un espace (logs qui ne concernent pas personnellement l'utilisateur)
	 */
	getSpaceGeneralActivity(spaceId: string): LogsResponse[] {
		if (!userDb.id) return this.getLogsBySpace(spaceId);

		return this.getLogsBySpace(spaceId).filter(
			(log) => !log.users_concerned?.includes(userDb.id!) && log.user_actor_id !== userDb.id
		);
	}

	/**
	 * État de chargement
	 */
	get isLoading(): boolean {
		return this.syncStore?.isSyncing || false;
	}

	/**
	 * État d'initialisation
	 */
	get isInitialized(): boolean {
		return this.initialized;
	}

	/**
	 * Erreur éventuelle
	 */
	get error(): string | null {
		const syncError = this.syncStore?.error;
		return syncError ? syncError.message || "Erreur de synchronisation" : null;
	}
}

// Export du singleton
export const globalLogsStore = new GlobalLogsStore();
