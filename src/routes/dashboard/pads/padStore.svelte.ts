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
import { pb } from "$lib/pocketbase.svelte";
import type { PadsResponse } from "$lib/types/pocketbase";
import type { RecordModel } from "pocketbase";

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
export async function loadDoc(docId: string): Promise<PadsResponse> {
	return await loadDocument<PadsResponse>(docId, COLLECTION);
}

export async function createPad(
	title: string,
	additionalData: Record<string, any> = {}
): Promise<PadsResponse> {
	const currentUser = userDb.current?.id;
	if (!currentUser) throw new Error("Vous devez être connecté pour créer un pad");
	return await createDocument<PadsResponse>(COLLECTION, {
		title,
		space: getSpace.id,
		created_by: currentUser,
		...additionalData
	});
}

export async function updatePad(docId: string, data: Record<string, any>): Promise<PadsResponse> {
	return await updateDocument<PadsResponse>(COLLECTION, docId, data);
}

export async function updatePadContent(docId: string, content: string): Promise<PadsResponse> {
	return await updateDocument<PadsResponse>(COLLECTION, docId, { content: content });
}

export async function updatePadTitle(docId: string, title: string): Promise<PadsResponse> {
	return await updateDocument<PadsResponse>(COLLECTION, docId, { title: title });
}

export async function deletePad(docId: string): Promise<PadsResponse | null> {
	return await deleteDocument<PadsResponse>(docId, COLLECTION);
}

// Acquérir le verrou d'édition
export async function acquirePadLock(docId: string): Promise<PadsResponse | null> {
	return await acquireLock<PadsResponse>("pads", docId);
}

// Libérer le verrou d'édition
export async function releasePadLock(docId: string): Promise<PadsResponse | null> {
	return await releaseLock<PadsResponse>("pads", docId);
}

// Rafraîchir le verrou d'édition
export async function refreshPadLock(docId: string): Promise<PadsResponse | null> {
	return await refreshLock<PadsResponse>("pads", docId);
}
