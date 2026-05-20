import { SyncStore } from "$lib/shared/syncState.svelte";
import { globalMessagesStore } from "$lib/shared/globalMessagesStore.svelte";
import type { MessagesResponse, UsersResponse } from "$lib/types/pocketbase";
import { Collections } from "$lib/types/pocketbase";
import type { ExpandedMessage } from "$lib/types/types";

// 1. Définir une interface pour le type spécifique de 'expand' attendu.
interface MessageExpand {
	user?: UsersResponse;
	replyingTo?: MessagesResponse & { expand?: MessageExpand };
	[key: string]: any;
}

// 2. Utiliser cette interface dans un type personnalisé qui étend MessagesResponse.
type MessageStoreRecord = MessagesResponse<MessageExpand>;

/**
 * MessageManager - Service d'orchestration pour la gestion des conversations.
 *
 * Architecture simplifiée et performante :
 * - Utilise `globalMessagesStore` comme source de vérité pour les conversations où l'utilisateur participe.
 *   L'accès aux messages se fait via un index `byEvent`, ce qui est très performant.
 * - Pour les conversations où l'utilisateur est un simple "observateur" (non-participant),
 *   crée des instances SyncStore temporaires en mode "mémoire" pour ne pas polluer le cache global.
 * - Gère le cycle de vie de ces instances en mémoire uniquement.
 */
class MessageManagerService {
	// Map UNIQUEMENT pour les instances temporaires en mode mémoire
	private memoryInstances = new Map<string, SyncStore<MessageStoreRecord>>();

	// State réactif pour l'état global du manager
	private state = $state({
		isInitialized: false,
		error: null as Error | null
	});

	/**
	 * Initialise le MessageManager.
	 * La dépendance principale est `globalMessagesStore`, qui doit être initialisé avant.
	 */
	async init() {
		try {
			// S'assurer que le store global est prêt, car il est notre dépendance principale.
			if (!globalMessagesStore.isInitialized) {
				// C'est une fallback de sécurité, normalement le layout s'en charge.
				await globalMessagesStore.init();
			}

			this.state.isInitialized = true;
			this.state.error = null;

			console.log(`✅ MessageManager initialized`);
		} catch (error) {
			this.state.error = error as Error;
			console.error("Failed to initialize MessageManager:", error);
		}
	}

	/**
	 * Vérifie si l'utilisateur participe à une conversation.
	 * Utilise la méthode indexée de globalMessagesStore pour une performance maximale.
	 */
	private isUserParticipant(eventId: string): boolean {
		if (!globalMessagesStore.isInitialized) return false;
		return globalMessagesStore.getMessagesByEvent(eventId).length > 0;
	}

	/**
	 * Obtient ou crée une instance de conversation EN MÉMOIRE pour les non-participants.
	 */
	private async getOrCreateMemoryInstance(eventId: string): Promise<SyncStore<MessageStoreRecord>> {
		if (this.memoryInstances.has(eventId)) {
			return this.memoryInstances.get(eventId)!;
		}

		// Créer une nouvelle instance SyncStore en mode mémoire
		const memoryStore = new SyncStore<MessageStoreRecord>({
			name: `conversation_memory_${eventId}`,
			storage: "memory",
			sync: {
				mode: "realtime",
				filter: `event = "${eventId}"`,
				expand: "user,replyingTo,replyingTo.user"
			}
		});

		await memoryStore.init(Collections.Messages);
		this.memoryInstances.set(eventId, memoryStore);
		console.log(`📝 Created memory-only instance for conversation ${eventId}`);

		return memoryStore;
	}

	/**
	 * Retourne les messages d'un événement spécifique.
	 * C'est le cœur de la nouvelle architecture.
	 */
	getMessageOfEvent = $derived.by(() => (eventId: string): MessagesResponse<ExpandedMessage>[] => {
		if (!this.state.isInitialized) {
			console.warn("MessageManager is not initialized yet.");
			return [];
		}

		const sortByDate = (a: MessagesResponse, b: MessagesResponse) =>
			new Date(a.created).getTime() - new Date(b.created).getTime();

		// Dépendance explicite à globalMessagesStore.messages pour la réactivité
		const allGlobalMessages = globalMessagesStore.messages;

		// CAS 1 : L'utilisateur est participant. On filtre les messages du store global.
		if (this.isUserParticipant(eventId)) {
			return allGlobalMessages
				.filter((msg) => msg.event === eventId)
				.sort(sortByDate) as MessagesResponse<ExpandedMessage>[];
		}

		// CAS 2 : L'utilisateur n'est pas participant. On utilise une instance en mémoire.
		const memoryInstance = this.memoryInstances.get(eventId);
		if (!memoryInstance) {
			// L'instance sera créée au premier accès réel (via preloadConversation).
			// On retourne un tableau vide en attendant.
			return [];
		}

		// Forcer la réactivité en accédant à `allRecords`.
		return [...memoryInstance.allRecords].sort(sortByDate) as MessagesResponse<ExpandedMessage>[];
	});

	/**
	 * Précharge une conversation.
	 * Si l'utilisateur n'est pas participant, cela va créer l'instance en mémoire.
	 * Si l'utilisateur est participant, il n'y a rien à faire car les données sont déjà dans le store global.
	 */
	async preloadConversation(eventId: string): Promise<void> {
		if (!this.state.isInitialized || this.isUserParticipant(eventId)) {
			return;
		}

		try {
			await this.getOrCreateMemoryInstance(eventId);
		} catch (error) {
			console.error(`Failed to preload memory conversation ${eventId}:`, error);
		}
	}

	// Getters pour maintenir la compatibilité
	get isInitialized(): boolean {
		return this.state.isInitialized;
	}

	get error(): Error | null {
		return this.state.error;
	}

	/**
	 * Statistiques du MessageManager.
	 */
	get stats() {
		return {
			memoryOnlyConversations: this.memoryInstances.size
		};
	}

	/**
	 * Destruction complète du MessageManager.
	 * Ne détruit que les instances en mémoire.
	 */
	async destroy(): Promise<void> {
		const destroyPromises = Array.from(this.memoryInstances.values()).map((instance) =>
			instance.destroy()
		);
		await Promise.all(destroyPromises);

		this.memoryInstances.clear();
		this.state.isInitialized = false;
		this.state.error = null;

		console.log("🗑️ MessageManager (memory instances) destroyed and cleaned up");
	}
}

// Export du service singleton pour maintenir la compatibilité
export const messageStore = new MessageManagerService();

// Export du service sous son nouveau nom aussi
export const messageManager = messageStore;
