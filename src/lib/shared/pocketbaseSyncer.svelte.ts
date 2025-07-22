import type { Collection, StoreRecord, SyncOptions } from "$lib/types/syncState.types";
import { pb } from "$lib/pocketbase.svelte";
import type { RecordSubscription } from "pocketbase";

/**
 * Gère la communication et la synchronisation avec une collection PocketBase.
 * Classe TypeScript pure, sans état Svelte.
 */
export class PocketBaseSyncer<T extends StoreRecord> {
	private collection: Collection | null = null;
	private pbUnsubscribe: (() => void) | null = null;
	private lastSyncTime: Date | null = null;

	// Callbacks pour communiquer avec le propriétaire (par exemple, SyncStore)
	public onRecordsReceived: (records: T[]) => Promise<void> = async () => {};
	public onRecordDeleted: (recordId: string) => Promise<void> = async () => {};
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
	public async start(collection: Collection, lastSync: Date | null): Promise<void> {
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
			return null;
		}

		const syncTime = new Date();
		const syncFilter = this.buildSyncFilter(isFullRefresh);
		const sortString = this.buildSortString();

		try {
			const results = await this.collection.getFullList<T>({
				filter: syncFilter,
				sort: sortString,
				expand: this.syncOptions.expand
			});

			if (results.length > 0) {
				await this.onRecordsReceived(results);
			}
			// Notifier le propriétaire que la synchro est terminée avec succès
			this.onSyncComplete(syncTime);

			// On met à jour l'heure de synchro interne pour la prochaine fois
			this.lastSyncTime = syncTime;
		} catch (error) {
			this.onError(error, "sync-fetch");
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
}
