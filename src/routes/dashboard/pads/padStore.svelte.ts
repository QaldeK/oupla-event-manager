import { acquireLock, refreshLock, releaseLock } from '$lib/pocketbase.svelte';
import {
	loadDocuments,
	loadDocument,
	createDocument,
	updateDocument
} from '$lib/shared/documentStore.svelte';
import type { PadsResponse } from '$lib/types/pocketbase';

const COLLECTION = 'pads';

// Fonctions spécifiques aux pads, fortement typées
export async function loadDocs(): Promise<PadsResponse[]> {
	return await loadDocuments<PadsResponse>(COLLECTION);
}

export async function loadDoc(docId: string): Promise<PadsResponse> {
	return await loadDocument<PadsResponse>(docId, COLLECTION);
}

export async function createPad(
	title: string,
	additionalData: Record<string, any> = {}
): Promise<PadsResponse> {
	return await createDocument<PadsResponse>(title, COLLECTION, additionalData);
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
	return await acquireLock<PadsResponse>('pads', docId);
}

// Libérer le verrou d'édition
export async function releasePadLock(docId: string): Promise<PadsResponse | null> {
	return await releaseLock<PadsResponse>('pads', docId);
}

// Rafraîchir le verrou d'édition
export async function refreshPadLock(docId: string): Promise<PadsResponse | null> {
	return await refreshLock<PadsResponse>('pads', docId);
}
