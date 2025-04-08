import { acquireLock, refreshLock, releaseLock } from '$lib/pocketbase.svelte';
import { getSpace } from '$lib/shared/spaceOptions.svelte';
import { pb } from '$lib/pocketbase.svelte';
import {
	subscribeToCollection,
	getCollectionData,
	loadDocuments,
	loadDocument,
	createDocument,
	updateDocument,
	deleteDocument
} from '$lib/shared/documentStore.svelte';
import type { SitePagesResponse } from '$lib/types/pocketbase';
import { SitePagesSectionOptions } from '$lib/types/pocketbase';
import type { RecordModel } from 'pocketbase';

// Type d'intersection qui satisfait la contrainte RecordModel
type SitePagesType = SitePagesResponse & RecordModel;

const COLLECTION = 'site_pages';
const LIST_FIELDS = 'id,created,updated,title,section,pos,componentConfig';

// Fonction pour s'abonner aux mises à jour des pages
export function subscribeToPagesUpdates(callback: () => void): () => void {
	return subscribeToCollection<SitePagesType>(COLLECTION, callback, {
		initialFields: LIST_FIELDS,
		sort: '-pos'
	});
}

// Fonction pour obtenir les pages actuelles
export function getPages(): SitePagesType[] {
	return getCollectionData<SitePagesType>(COLLECTION);
}

// Fonctions spécifiques aux pages du site, fortement typées
export async function loadDocs(filter = ''): Promise<SitePagesType[]> {
	return await loadDocuments<SitePagesType>(COLLECTION, {
		fields: LIST_FIELDS,
		sort: '-pos',
		filter: `space = '${getSpace.id}' ${filter ? `&& ${filter}` : ''}`
	});
}

export async function loadDoc(docId: string): Promise<SitePagesType> {
	return await loadDocument<SitePagesType>(docId, COLLECTION);
}

export async function createPad(
	title: string,
	section: SitePagesSectionOptions = SitePagesSectionOptions.page,
	additionalData: Record<string, unknown> = {}
): Promise<SitePagesType> {
	// 👉 Construit l'objet de données complet ici
	const data = {
		title,
		space: getSpace.id, // Ajoute l'ID de l'espace
		created_by: pb.authStore.model?.id, // Ajoute l'ID de l'utilisateur
		section,
		...additionalData
	};
	return await createDocument<SitePagesType>(COLLECTION, data);
}

export async function updatePad(
	docId: string,
	data: Partial<SitePagesType>
): Promise<SitePagesType> {
	// Le type U de updateDocument doit correspondre à Partial<SitePagesType>
	return await updateDocument<SitePagesType, Partial<SitePagesType>>(COLLECTION, docId, data, {
		expand: 'editingUser' // Garde l'expand ici car spécifique à la logique d'édition
	});
}

export async function deletePad(docId: string): Promise<boolean> {
	return await deleteDocument(COLLECTION, docId);
}

// Acquérir le verrou d'édition
export async function acquirePadLock(
	docId: string,
	collection: string = COLLECTION
): Promise<SitePagesType | null> {
	return await acquireLock<SitePagesType>(collection, docId);
}

// Libérer le verrou d'édition
export async function releasePadLock(
	docId: string,
	collection: string = COLLECTION
): Promise<SitePagesType | null> {
	return await releaseLock<SitePagesType>(collection, docId);
}

// Rafraîchir le verrou d'édition
export async function refreshPadLock(
	docId: string,
	collection: string = COLLECTION
): Promise<SitePagesType | null> {
	return await refreshLock<SitePagesType>(collection, docId);
}
