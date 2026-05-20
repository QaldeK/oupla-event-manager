// src/lib/shared/conversationDirectoryStore.svelte.ts
import { SyncStore } from "$lib/shared/syncState.svelte";
import type { ConversationSummariesResponse } from "$lib/types/pocketbase";
import { Collections } from "$lib/types/pocketbase";
import type { StoreRecord } from "$lib/types/syncState.types";
import { userDb } from "$lib/shared/userDb.svelte";

// Type compatible avec StoreRecord pour les résumés de conversation
type ConversationSummaryStoreRecord = ConversationSummariesResponse & StoreRecord;

/**
 * Store global singleton pour la découverte de toutes les conversations
 * dans tous les espaces où l'utilisateur est inscrit.
 *
 * Fournit une vue d'ensemble légère de toutes les conversations existantes,
 * permettant la navigation et la découverte sans charger tous les messages.
 */
class ConversationDirectoryStore {
	private syncStore: SyncStore<ConversationSummaryStoreRecord> | null = null;
	private _isInitialized = $state(false);
	private _currentFilter = $state<string>("");

	/**
	 * Initialise le store de répertoire des conversations.
	 * Le filtre est construit dynamiquement à partir des espaces de l'utilisateur.
	 */
	async init() {
		if (this._isInitialized) {
			return;
		}

		if (!userDb.id || !userDb.memberOf || userDb.memberOf.length === 0) {
			console.warn("[ConversationDirectoryStore] No user spaces available. Initializing as empty.");
			this._isInitialized = true;
			return;
		}

		// Construire le filtre pour tous les espaces de l'utilisateur
		const spaceFilter = userDb.memberOf.map((space) => `space = "${space.id}"`).join(" || ");
		const filter = `(${spaceFilter})`;
		this._currentFilter = filter;

		this.syncStore = new SyncStore<ConversationSummaryStoreRecord>({
			name: "conversationDirectory",
			version: 1,
			dbName: "conversationDirectory", // DB dédiée pour éviter les conflits
			indexes: {
				bySpace: {
					path: "space",
					type: "single"
				},
				byTopicType: {
					path: "topic_type",
					type: "single"
				},
				byTopicId: {
					path: "topic_id",
					type: "single"
				}
			},
			sync: {
				mode: "realtime",
				filter,
				sort: "-last_message_timestamp", // Plus récents en premier
				expand: "last_message_user,space"
			},
			cache: {
				maxRecords: 5000, // Limite raisonnable pour les résumés
				strategy: "lru"
			}
		});

		try {
			await this.syncStore.init(Collections.ConversationSummaries);
			this._isInitialized = true;
			console.log(`✅ ConversationDirectoryStore initialisé avec filtre: ${filter}`);
		} catch (e) {
			console.error("[ConversationDirectoryStore] Failed to initialize", e);
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
		this._currentFilter = "";
	}

	/**
	 * Redémarre le store avec les nouveaux espaces de l'utilisateur.
	 * Utile lorsque l'utilisateur rejoint/quitte des espaces.
	 */
	async refresh() {
		await this.reset();
		await this.init();
	}

	// --- Getters réactifs ---

	/**
	 * Toutes les conversations disponibles, triées par activité récente.
	 */
	get conversations(): ConversationSummariesResponse[] {
		return (this.syncStore?.allRecords as ConversationSummariesResponse[]) || [];
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
		return syncError ? syncError.message || "Erreur de synchronisation du répertoire" : null;
	}

	/**
	 * Filtre actuellement appliqué.
	 */
	get currentFilter(): string {
		return this._currentFilter;
	}

	// --- Méthodes de recherche et filtrage ---

	/**
	 * Conversations pour un espace donné.
	 */
	getConversationsForSpace(spaceId: string): ConversationSummariesResponse[] {
		if (!this.syncStore) return [];
		return this.syncStore.getByIndex("bySpace", spaceId) as ConversationSummariesResponse[];
	}

	/**
	 * Conversations par type (event, group, dm).
	 */
	getConversationsByType(topicType: "event" | "group" | "dm"): ConversationSummariesResponse[] {
		if (!this.syncStore) return [];
		return this.syncStore.getByIndex("byTopicType", topicType) as ConversationSummariesResponse[];
	}

	/**
	 * Trouve une conversation spécifique par topic_id et type.
	 */
	findConversation(
		topicId: string,
		topicType?: "event" | "group" | "dm"
	): ConversationSummariesResponse | undefined {
		if (!this.syncStore) return undefined;

		const candidates = this.syncStore.getByIndex(
			"byTopicId",
			topicId
		) as ConversationSummariesResponse[];

		if (topicType) {
			return candidates.find((conv) => conv.topic_type === topicType);
		}

		return candidates[0]; // Retourne le premier si pas de type spécifié
	}

	/**
	 * Conversations récentes (dernières 24h d'activité).
	 */
	get recentConversations(): ConversationSummariesResponse[] {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);

		return this.conversations.filter((conv) => {
			if (!conv.last_message_timestamp) return false;
			const lastMessageDate = new Date(conv.last_message_timestamp);
			return lastMessageDate >= yesterday;
		});
	}

	/**
	 * Conversations actives (avec messages récents).
	 */
	get activeConversations(): ConversationSummariesResponse[] {
		const lastWeek = new Date();
		lastWeek.setDate(lastWeek.getDate() - 7);

		return this.conversations.filter((conv) => {
			if (!conv.last_message_timestamp) return false;
			const lastMessageDate = new Date(conv.last_message_timestamp);
			return lastMessageDate >= lastWeek;
		});
	}

	/**
	 * Recherche textuelle dans les titres et snippets.
	 */
	search(query: string): ConversationSummariesResponse[] {
		if (!query.trim()) return this.conversations;

		const lowerQuery = query.toLowerCase();
		return this.conversations.filter((conv) => {
			const titleMatch = conv.topic_title?.toLowerCase().includes(lowerQuery);
			const snippetMatch = conv.last_message_snippet?.toLowerCase().includes(lowerQuery);
			return titleMatch || snippetMatch;
		});
	}

	// --- Statistiques et informations ---

	/**
	 * Conversations groupées par espace.
	 */
	get conversationsBySpace(): Record<string, ConversationSummariesResponse[]> {
		const grouped: Record<string, ConversationSummariesResponse[]> = {};

		this.conversations.forEach((conv) => {
			const spaceId = conv.space;
			if (!grouped[spaceId]) {
				grouped[spaceId] = [];
			}
			grouped[spaceId].push(conv);
		});

		return grouped;
	}

	/**
	 * Conversations groupées par type.
	 */
	get conversationsGroupedByType(): Record<string, ConversationSummariesResponse[]> {
		const grouped: Record<string, ConversationSummariesResponse[]> = {};

		this.conversations.forEach((conv) => {
			const type = conv.topic_type || "unknown";
			if (!grouped[type]) {
				grouped[type] = [];
			}
			grouped[type].push(conv);
		});

		return grouped;
	}

	/**
	 * Calcule les statistiques pour un espace spécifique.
	 */
	getStatsForSpace(spaceId: string) {
		const spaceConversations = this.getConversationsForSpace(spaceId);
		const total = spaceConversations.length;
		const byType: Record<string, number> = {
			event: 0,
			group: 0,
			dm: 0
		};
		spaceConversations.forEach((conv) => {
			if (conv.topic_type && byType[conv.topic_type] !== undefined) {
				byType[conv.topic_type]++;
			}
		});

		return {
			total,
			byType: {
				events: byType.event,
				groups: byType.group,
				directMessages: byType.dm
			}
		};
	}

	/**
	 * Statistiques générales du répertoire.
	 */
	get stats() {
		const total = this.conversations.length;
		const byType = this.conversationsGroupedByType;
		const recent = this.recentConversations.length;
		const active = this.activeConversations.length;

		return {
			total,
			byType: {
				events: byType.event?.length || 0,
				groups: byType.group?.length || 0,
				directMessages: byType.dm?.length || 0
			},
			recent,
			active,
			spaces: Object.keys(this.conversationsBySpace).length
		};
	}

	/**
	 * Force un rafraîchissement complet des données.
	 */
	async forceRefresh(): Promise<void> {
		if (this.syncStore) {
			await this.syncStore.forceRefresh();
		}
	}

	// --- Méthodes utilitaires ---

	/**
	 * Vérifie si une conversation existe pour un topic donné.
	 */
	hasConversation(topicId: string, topicType?: "event" | "group" | "dm"): boolean {
		return this.findConversation(topicId, topicType) !== undefined;
	}

	/**
	 * Obtient le nombre de messages d'une conversation.
	 */
	getMessageCount(topicId: string, topicType?: "event" | "group" | "dm"): number {
		const conversation = this.findConversation(topicId, topicType);
		return conversation?.message_count || 0;
	}

	/**
	 * Obtient le dernier message d'une conversation.
	 */
	getLastMessage(
		topicId: string,
		topicType?: "event" | "group" | "dm"
	): {
		snippet: string;
		timestamp: string;
		user: string;
	} | null {
		const conversation = this.findConversation(topicId, topicType);
		if (!conversation || !conversation.last_message_timestamp) {
			return null;
		}

		return {
			snippet: conversation.last_message_snippet || "",
			timestamp: conversation.last_message_timestamp,
			user: conversation.last_message_user || ""
		};
	}
}

// Export du singleton
export const conversationDirectoryStore = new ConversationDirectoryStore();
