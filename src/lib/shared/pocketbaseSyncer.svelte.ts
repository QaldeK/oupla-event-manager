import type { StoreRecord, SyncOptions } from "$lib/types/syncState.types";
import { pb } from "$lib/pocketbase.svelte";
import type { RecordService, RecordSubscription } from "pocketbase";

/**
 * Gère la communication et la synchronisation avec une collection PocketBase.
 * Classe TypeScript pure, sans état Svelte.
 */

/* eslint-disable svelte/prefer-svelte-reactivity */
export class PocketBaseSyncer<T extends StoreRecord> {
	private collection: RecordService<T> | null = null;
	private pbUnsubscribe: (() => void) | null = null;
	private lastSyncTime: Date | null = null;

	// Callbacks pour communiquer avec le propriétaire (par exemple, SyncStore)
	public onRecordsReceived: (records: T[]) => Promise<void> = async () => {};
	public onRecordDeleted: (recordId: string) => Promise<void> = async () => {};
	public onPruneNeeded: (remoteIds: string[]) => Promise<void> = async () => {};
	public onSyncComplete: (syncDate: Date) => void = () => {};

	public onError: (error: Error | unknown, context: string) => void = () => {};

	constructor(
		private readonly syncOptions: SyncOptions,
		private readonly collectionName: string
	) {}

	/**
	 * Démarre le processus de synchronisation.
	 * @param collection - L'objet collection de PocketBase.
	 * @param lastSync - La date de la dernière synchronisation réussie.
	 */
	public async start(collection: RecordService<T>, lastSync: Date | null): Promise<void> {
		this.collection = collection;
		this.lastSyncTime = lastSync;

		// Si le mode est temps réel, on s'abonne aux changements futurs
		if (this.syncOptions.mode === "realtime") {
			await this.setupRealtimeSync();
		}

		// On effectue une synchronisation initiale pour rattraper les changements manqués
		await this.sync();
	}

	/**
	 * Arrête la synchronisation et nettoie les abonnements.
	 */
	public stop(): void {
		if (this.pbUnsubscribe) {
			this.pbUnsubscribe();
			this.pbUnsubscribe = null;
		}
		// S'assure que l'abonnement global est aussi coupé
		try {
			pb.collection(this.collectionName).unsubscribe("*");
		} catch {
			// Peut échouer si la connexion est déjà coupée, c'est sans importance.
		}
	}

	/**
	 * Force une resynchronisation complète en ignorant la date de dernière synchro.
	 */
	public async forceRefresh(): Promise<void> {
		if (!this.collection) {
			this.onError(new Error("Syncer not started"), "forceRefresh");
			return;
		}
		await this.sync(true);
	}

	/**
	 * S'abonne aux événements en temps réel de la collection.
	 */
	private async setupRealtimeSync(): Promise<void> {
		if (!this.collection) return;

		try {
			// La méthode subscribe de PocketBase retourne une fonction de désabonnement
			const unsubscribeFn = await this.collection.subscribe(
				"*",
				(data: RecordSubscription<StoreRecord>) => {
					if (data.action === "create" || data.action === "update") {
						this.handleRecordUpdate(data.record as T);
					} else if (data.action === "delete") {
						this.handleRecordDeletion(data.record.id);
					}
				}
			);
			this.pbUnsubscribe = unsubscribeFn;
		} catch (error) {
			this.onError(error, "realtime-subscription");
		}
	}

	/**
	 * Gère une mise à jour (création/modification) reçue en temps réel.
	 */
	private async handleRecordUpdate(record: T): Promise<void> {
		try {
			await this.onRecordsReceived([record]);
		} catch (error) {
			this.onError(error, "handleRecordUpdate");
		}
	}

	/**
	 * Gère une suppression reçue en temps réel.
	 */
	private async handleRecordDeletion(recordId: string): Promise<void> {
		try {
			await this.onRecordDeleted(recordId);
		} catch (error) {
			this.onError(error, "handleRecordDeletion");
		}
	}

	/**
	 * Effectue une requête de synchronisation pour récupérer les enregistrements nouveaux ou modifiés.
	 * @returns La date à laquelle la synchronisation a été effectuée.
	 */
	public async sync(isFullRefresh: boolean = false): Promise<void> {
		if (!this.collection) {
			this.onError(new Error("Syncer not started"), "sync");
			return;
		}

		const syncTime = new Date();

		try {
			// 1. Phase de nettoyage (uniquement pour les synchros standards, pas pour un refresh complet)
			if (!isFullRefresh) {
				await this._pruneStaleRecords();
			}

			// 2. Phase de récupération des données modifiées
			const syncFilter = this.buildSyncFilter(isFullRefresh);
			const sortString = this.buildSortString();

			const results = await this.collection.getFullList<T>({
				filter: syncFilter,
				sort: sortString,
				expand: this.syncOptions.expand
			});

			if (results.length > 0) {
				await this.onRecordsReceived(results);
			}

			// 3. Notifier le propriétaire que la synchro est terminée avec succès
			this.onSyncComplete(syncTime);
			this.lastSyncTime = syncTime; // Mettre à jour l'heure pour la prochaine synchro
		} catch (error) {
			// Si le nettoyage ou la récupération échoue, on log l'erreur mais on ne met pas à jour la date de synchro.
			this.onError(error, "sync-process");
		}
	}

	/**
	 * Construit la chaîne de filtre pour la requête PocketBase.
	 */
	private buildSyncFilter(isFullRefresh: boolean = false): string {
		const baseFilter = this.syncOptions.filter || "";
		let syncTimeFilter = "";

		// Si on a une date de dernière synchro, on ne récupère que les éléments plus récents
		if (this.lastSyncTime && !isFullRefresh) {
			// Le format de date de PocketBase requiert un espace et non un 'T'
			const lastSyncISO = this.lastSyncTime.toISOString().replace("T", " ");
			syncTimeFilter = `updated > "${lastSyncISO}"`;
		}

		if (baseFilter && syncTimeFilter) {
			return `(${baseFilter}) && ${syncTimeFilter}`;
		}
		// Retourne le premier filtre non vide, ou une chaîne vide
		return baseFilter || syncTimeFilter;
	}

	/**
	 * Construit la chaîne de tri pour la requête PocketBase.
	 */
	private buildSortString(): string {
		if (Array.isArray(this.syncOptions.sort)) {
			return this.syncOptions.sort.join(",");
		}
		return this.syncOptions.sort || "";
	}

	/**
	 * Récupère tous les IDs distants et demande au propriétaire de nettoyer les enregistrements locaux qui n'existent plus.
	 * @private
	 */
	private async _pruneStaleRecords(): Promise<void> {
		if (!this.collection) return;

		try {
			// Appliquer le filtre de base pour ne récupérer que les IDs pertinents (ex: ceux de l'utilisateur courant)
			const baseFilter = this.syncOptions.filter || "";

			// Récupérer uniquement les IDs de tous les enregistrements distants. Très performant.
			const remoteRecords = await this.collection.getFullList<{ id: string }>({
				fields: "id",
				filter: baseFilter
			});

			const remoteIds = remoteRecords.map((r) => r.id);

			// Demander au propriétaire (SyncStore) de nettoyer les données locales
			await this.onPruneNeeded(remoteIds);
		} catch (error) {
			this.onError(error, "prune-records");
			// Lancer une exception pour arrêter le processus de synchro si le nettoyage échoue.
			// C'est plus sûr pour éviter une synchronisation partielle.
			throw error;
		}
	}
}
