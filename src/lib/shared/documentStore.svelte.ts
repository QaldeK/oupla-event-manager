import { pb } from '../pocketbase.svelte';
import { getSpace } from './spaceOptions.svelte';
import type { RecordModel, RealtimeService } from 'pocketbase';
import { SvelteMap } from 'svelte/reactivity';

const collectionData = new SvelteMap<string, RecordModel[]>();

// Fonction générique pour s'abonner à une collection
export function subscribeToCollection<T extends RecordModel>(
	collection: string,
	callback: () => void
): () => Promise<void> {
	let isInitialized = false;
	let initialLoadPromise: Promise<void> | null = null;
	// 👉 Variable pour stocker la *promesse* qui résoudra la fonction de désinscription
	let unsubscribePromise: Promise<() => void> | null = null;

	// 👉 Fonction pour charger et initialiser le cache
	const initializeCache = async () => {
		try {
			console.log(`[${collection}] Initializing cache...`);
			// Charger seulement les champs nécessaires pour la liste
			const initialDocs = await pb.collection(collection).getFullList<T>(200 /* batch size */, {
				sort: '-created', // ou 'pos' si pertinent pour la liste principale
				filter: `space = '${getSpace.id}'`
				// Ajuste les champs si nécessaire pour la vue liste
				// fields: 'id,title,created_by,created,updated,type,pos,section'
			});
			collectionData.set(collection, initialDocs);
			isInitialized = true;
			console.log(`[${collection}] Cache initialized with ${initialDocs.length} documents.`);
			callback(); // Notifier que les données initiales sont prêtes
		} catch (error) {
			console.error(`[${collection}] Error initializing cache:`, error);
			// Peut-être définir des données vides pour éviter des erreurs ?
			collectionData.set(collection, []);
			isInitialized = true; // Marquer comme initialisé même en cas d'erreur pour débloquer getCollectionData
			callback();
		}
	};

	// Si le cache n'existe pas, lancer l'initialisation
	if (!collectionData.has(collection)) {
		collectionData.set(collection, []); // Mettre un tableau vide temporairement
		initialLoadPromise = initializeCache();
	} else {
		// Si le cache existe déjà (re-navigation?), s'assurer qu'il est marqué comme initialisé
		isInitialized = true;
		// Notifier immédiatement si les données sont déjà là
		callback();
	}

	// S'abonner aux événements PocketBase pour mettre à jour le cache en temps réel
	unsubscribePromise = pb.collection(collection).subscribe('*', async (e) => {
		// Attendre la fin du chargement initial si ce n'est pas déjà fait
		if (initialLoadPromise) {
			await initialLoadPromise;
		}
		if (!isInitialized) {
			console.warn(`[${collection}] Received event before cache initialization, skipping update.`);
			return; // Ne pas traiter l'événement si le cache n'est pas prêt
		}

		console.log(`[${collection}] Event '${e.action}' received:`, e.record);

		// Récupérer la liste actuelle du cache
		const currentList = collectionData.get(collection) || [];
		let updatedList = [...currentList]; // Créer une copie pour la réactivité Svelte

		switch (e.action) {
			case 'create': {
				// Ajouter le nouvel enregistrement (en début de liste si trié par -created)
				updatedList.unshift(e.record as T);
				console.log(`[${collection}] Added new record ${e.record.id} to cache.`);
				break;
			}

			case 'update': {
				// Mettre à jour l'enregistrement existant
				const indexToUpdate = updatedList.findIndex((doc) => doc.id === e.record.id);
				if (indexToUpdate !== -1) {
					// Remplacer l'ancien enregistrement par le nouveau
					updatedList[indexToUpdate] = e.record as T;
					console.log(`[${collection}] Updated record ${e.record.id} in cache.`);
				} else {
					// Si l'enregistrement n'était pas dans la liste (peu probable mais possible), l'ajouter
					updatedList.unshift(e.record as T);
					console.log(
						`[${collection}] Received update for non-cached record ${e.record.id}, adding to cache.`
					);
				}
				break;
			}

			case 'delete': {
				// Supprimer l'enregistrement
				updatedList = updatedList.filter((doc) => doc.id !== e.record.id);
				console.log(`[${collection}] Removed record ${e.record.id} from cache.`);
				break;
			}
		}
		// Mettre à jour le cache avec la nouvelle liste
		collectionData.set(collection, updatedList);
		callback(); // Notifier les composants de la mise à jour
	});

	// Retourner la fonction de désabonnement
	return async () => {
		console.log(`[${collection}] Unsubscribing from real-time updates.`);
		if (unsubscribePromise) {
			try {
				// Attendre que la promesse se résolve pour obtenir la fonction réelle
				const unsubscribeFunc = await unsubscribePromise;
				// Appeler la fonction de désinscription
				unsubscribeFunc();
				console.log(`[${collection}] Successfully unsubscribed.`);
			} catch (error) {
				console.error(`[${collection}] Error during unsubscribe:`, error);
			}
		} else {
			console.warn(`[${collection}] Unsubscribe called before subscription was established.`);
		}
		// Optionnel: supprimer le cache lors du désabonnement complet ?
		// collectionData.delete(collection);
	};
}

// Fonction pour charger tous les documents d'une collection
export async function loadDocuments<T extends RecordModel>(collection: string): Promise<T[]> {
	try {
		const documents = await pb.collection(collection).getFullList<T>({
			sort: '-created',
			filter: `space = '${getSpace.id}'`,
			fields: 'id,title,created_by,created,updated,type,pos'
		});

		// Mettre à jour le cache
		collectionData.set(collection, documents);

		return documents;
	} catch (error) {
		console.error(`Erreur lors du chargement des documents de ${collection}:`, error);
		throw error;
	}
}

// Charger un document spécifique par ID
export async function loadDocument<T extends RecordModel>(
	docId: string,
	collection: string
): Promise<T> {
	try {
		console.log(`Chargement du document ${docId} de la collection ${collection}`);
		const document = await pb.collection(collection).getOne<T>(docId);
		return document;
	} catch (error) {
		console.error(`Erreur lors du chargement du document ${docId} de ${collection}:`, error);
		throw error;
	}
}

// Fonction pour obtenir les données d'une collection (fortement typée à l'appel)
export function getCollectionData<T extends RecordModel>(collection: string): T[] {
	// S'assurer que les données retournées correspondent au type T demandé
	return (collectionData.get(collection) || []) as T[];
}

// Créer un nouveau document
export async function createDocument<T extends RecordModel>(
	title: string,
	collection: string,
	additionalData: Record<string, unknown> = {}
): Promise<T> {
	try {
		const data = {
			title,
			space: getSpace.id,
			created_by: pb.authStore.model?.id,
			...additionalData
		};

		const newDoc = await pb.collection(collection).create<T>(data);
		return newDoc;
	} catch (error) {
		console.error(`Erreur lors de la création du document dans ${collection}:`, error);
		throw error;
	}
}

export async function updateDocument<T extends RecordModel, U extends Partial<T>>(
	collection: string,
	docId: string,
	data: U
): Promise<T> {
	try {
		console.log(`Mise à jour du document ${docId} dans ${collection}`);

		const record = await pb.collection(collection).update<T>(docId, data, {
			// PB SDK attend Record | FormData
			expand: 'editingUser'
		});
		return record;
	} catch (error) {
		console.error(`Erreur lors de la mise à jour du document ${docId}:`, error);
		throw error;
	}
}

export async function deleteDocument(collection: string, docId: string): Promise<boolean> {
	try {
		await pb.collection(collection).delete(docId);
		// Pas besoin de recharger manuellement - le subscribe s'en chargera
		return true;
	} catch (error) {
		console.error(`Erreur lors de la suppression du document ${docId}:`, error);
		throw error;
	}
}
