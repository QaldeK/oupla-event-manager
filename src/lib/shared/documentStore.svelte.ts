/*
Function utilitaires génériques pour les opérations CRUD sur les documents. Consommé par `PageBlockEditor`, `padStore` et `sitePageStore`
- gestion d'un cache reactifs
- chargement initial et subscription aux changements pocketbase (qui actualise le cache)
- wrapper générique pour les methode Pocketbase
*/

import type { RecordModel } from "pocketbase";
import { SvelteMap } from "svelte/reactivity";
import { pb } from "../pocketbase.svelte";
import { getSpace } from "./";

const collectionData = new SvelteMap<string, RecordModel[]>();

interface SubscriptionOptions {
	initialFields?: string; // Champs pour le chargement initial
	filter?: string; // Filtre pour le chargement initial ET potentiellement pour la souscription (si PB le supporte un jour?)
	sort?: string; // Tri pour le chargement initial
}

// Fonction générique pour s'abonner à une collection
export function subscribeToCollection<T extends RecordModel>(
	collection: string,
	callback: () => void,
	options: SubscriptionOptions = {}
): () => Promise<void> {
	let isInitialized = false;
	let initialLoadPromise: Promise<void> | null = null;
	let unsubscribePromise: Promise<() => void> | null = null;

	const initializeCache = async () => {
		try {
			console.log(`[${collection}] Initializing cache...`);
			// Charger seulement les champs nécessaires pour la liste
			const initialDocs = await pb.collection(collection).getFullList<T>(200 /* batch size */, {
				sort: options.sort || "-created", // Garde un défaut si non fourni
				filter: `space = '${getSpace.id}'`,
				fields: options.initialFields || undefined // Utilise les champs fournis
			});
			collectionData.set(collection, initialDocs);
			isInitialized = true;
			// console.log(`[${collection}] Cache initialized with ${initialDocs.length} documents.`);
			callback(); // Notifier que les données initiales sont prêtes
		} catch {
			// console.error(`[${collection}] Error initializing cache:`, error);
			collectionData.set(collection, []);
			isInitialized = true;
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
	unsubscribePromise = pb.collection(collection).subscribe("*", async (e) => {
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
			case "create": {
				// Ajouter le nouvel enregistrement (en début de liste si trié par -created)
				updatedList.unshift(e.record as T);
				console.log(`[${collection}] Added new record ${e.record.id} to cache.`);
				break;
			}

			case "update": {
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

			case "delete": {
				// Supprimer l'enregistrement
				updatedList = updatedList.filter((doc) => doc.id !== e.record.id);
				console.log(`[${collection}] Removed record ${e.record.id} from cache.`);
				break;
			}
		}

		// TODO ? Re-trier la liste après modification si un tri est spécifié ? (Optionnel)
		// if (options.sort) { ... logique de tri ... }

		collectionData.set(collection, updatedList);
		callback();
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
// TODO : utiliser syncState pour l'utilisation d'un cache local
export async function loadDocuments<T extends RecordModel>(
	collection: string,
	options?: { sort?: string; fields?: string; expand?: string; filter?: string }
): Promise<T[]> {
	try {
		console.log(`Début du chargement des documents de ${collection}...`);
		console.log(`Filter utilisé: space = '${getSpace.id}'`);
		const baseFilter = `space = '${getSpace.id}'`;
		const finalFilter = options?.filter ? `${baseFilter} && ${options.filter}` : baseFilter;

		const documents = await pb.collection(collection).getFullList<T>({
			sort: `${options?.sort ?? "-created"}`,
			filter: finalFilter,
			fields: `${options?.fields ?? undefined}`
		});

		console.log(`Documents reçus pour ${collection}:`, documents);
		// Mettre à jour le cache
		collectionData.set(collection, documents);
		console.log(`Cache mis à jour pour ${collection}`);
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
	collection: string,
	data: Record<string, unknown>
): Promise<T> {
	try {
		// Le code appelant est responsable de fournir 'space', 'created_by' si nécessaire
		const newDoc = await pb.collection(collection).create<T>(data);
		// La souscription ajoutera au cache
		return newDoc;
	} catch (error) {
		console.error(`Erreur lors de la création du document dans ${collection}:`, error);
		throw error;
	}
}

export async function updateDocument<T extends RecordModel, U extends Partial<T>>(
	collection: string,
	docId: string,
	data: U,
	options?: { expand?: string }
): Promise<T> {
	try {
		console.log(`Mise à jour du document ${docId} dans ${collection}`);

		const record = await pb.collection(collection).update<T>(docId, data, options);
		// La souscription mettra à jour le cache
		return record;
	} catch (error) {
		console.error(`Erreur lors de la mise à jour du document ${docId}:`, error);
		throw error;
	}
}

export async function deleteDocument(collection: string, docId: string): Promise<boolean> {
	try {
		await pb.collection(collection).delete(docId);
		return true; // La souscription mettra à jour le cache
	} catch (error) {
		console.error(`Erreur lors de la suppression du document ${docId}:`, error);
		throw error;
	}
}
