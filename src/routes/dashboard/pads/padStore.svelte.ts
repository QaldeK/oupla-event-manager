/*
Interface API spécifique pour la collection pads avec ses Types

- Utilise documentStore pour gérer le cache et les subscriptions de liste.
- Expose des fonctions simples et fortement typées (ex: `getPads()`, `createPad()`) d'interaction avec PocketBase.
- Fournit les fonctions de verrouillage (`acquire...Lock`, `release...Lock`, `refresh...Lock`) qui seront injectées dans le moteur `editableDocumentStore`.
*/
import { acquireLock, refreshLock, releaseLock } from "$lib/pocketbase.svelte";
import {
	subscribeToCollection,
	getCollectionData,
	loadDocuments,
	loadDocument,
	createDocument,
	updateDocument,
	deleteDocument
} from "$lib/shared/documentStore.svelte";
import { getSpace, userDb } from "$lib/shared";
import type { PadsResponse } from "$lib/types/pocketbase";
import type { RecordModel } from "pocketbase";

type PadsType = PadsResponse & RecordModel;

const COLLECTION = "pads";
const LIST_FIELDS = "id,created,updated,title,content,created_by,space";

// Fonction pour s'abonner aux mises à jour des pads
export function subscribeToPadsUpdates(callback: () => void): () => void {
	return subscribeToCollection<PadsType>(COLLECTION, callback, {
		initialFields: LIST_FIELDS,
		sort: "-created"
	});
}

// Fonction pour obtenir les pads actuels
export function getPads(): PadsType[] {
	return getCollectionData<PadsType>(COLLECTION);
}

// Fonctions spécifiques aux pads, fortement typées
export async function loadDocs(): Promise<PadsType[]> {
	return await loadDocuments<PadsType>(COLLECTION, {
		fields: LIST_FIELDS,
		sort: "-created"
	});
}
export async function loadDoc(docId: string): Promise<PadsType> {
	return await loadDocument<PadsType>(docId, COLLECTION);
}

export async function createPad(
	title: string,
	additionalData: Record<string, unknown> = {}
): Promise<PadsResponse> {
	const currentUser = userDb.current?.id;
	if (!currentUser) throw new Error("Vous devez être connecté pour créer un pad");
	return await createDocument<PadsType>(COLLECTION, {
		title,
		space: getSpace.id,
		created_by: currentUser,
		...additionalData
	});
}

export async function updatePad(docId: string, data: Partial<PadsType>): Promise<PadsType> {
	return await updateDocument<PadsType, Partial<PadsType>>(COLLECTION, docId, data);
}

export async function updatePadContent(docId: string, content: string): Promise<PadsResponse> {
	return await updateDocument<PadsType, Partial<PadsType>>(COLLECTION, docId, { content: content });
}

export async function updatePadTitle(docId: string, title: string): Promise<PadsResponse> {
	return await updateDocument<PadsType, Partial<PadsType>>(COLLECTION, docId, { title: title });
}

export async function deletePad(docId: string): Promise<boolean> {
	return await deleteDocument(docId, COLLECTION);
}

// Acquérir le verrou d'édition
export async function acquirePadLock(docId: string): Promise<PadsType | null> {
	return await acquireLock<PadsType>("pads", docId);
}

// Libérer le verrou d'édition
export async function releasePadLock(docId: string): Promise<PadsType | null> {
	return await releaseLock<PadsType>("pads", docId);
}

// Rafraîchir le verrou d'édition
export async function refreshPadLock(docId: string): Promise<PadsType | null> {
	return await refreshLock<PadsType>("pads", docId);
}
