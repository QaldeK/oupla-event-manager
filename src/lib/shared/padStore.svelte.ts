import { getSpace } from './spaceOptions.svelte';
import { pb } from '../pocketbase.svelte';
import type { PadResponse, PadUpdateResponse } from '$lib/types/pad/pad.types';
import type { ListResult } from 'pocketbase';

// Note: Les collections "pads" et "pad_updates" doivent être créées manuellement 
// dans l'interface d'administration PocketBase avant d'utiliser ces fonctions

// --- Fonction pour manipuler les pads ---

// Charger tous les pads
export async function loadPads(): Promise<PadResponse[]> {
  try {
    const pads = await pb.collection('pads').getFullList<PadResponse>({
      sort: '-created',
      filter: `space = '${getSpace.id}'`
    });
    return pads;
  } catch (error) {
    console.error('Erreur lors du chargement des pads:', error);
    throw error;
  }
}

// Charger un pad spécifique par ID
export async function loadPad(padId: string): Promise<PadResponse> {
  try {
    console.log(`Chargement du pad ${padId}`);
    const pad = await pb.collection('pads').getOne<PadResponse>(padId);
    console.log(`Pad chargé avec succès:`, pad);
    return pad;
  } catch (error) {
    console.error(`Erreur lors du chargement du pad ${padId}:`, error);
    throw error;
  }
}

// Créer un nouveau pad
export async function createPad(title: string): Promise<PadResponse> {
  try {
    const data = {
      title,
      space: getSpace.id,
      created_by: pb.authStore.model?.id
    };
    
    return await pb.collection('pads').create<PadResponse>(data);
  } catch (error) {
    console.error('Erreur lors de la création du pad:', error);
    throw error;
  }
}

// Mettre à jour le contenu d'un pad (état complet)
export async function updatePadContent(padId: string, content: Blob): Promise<PadResponse> {
  try {
    console.log(`Mise à jour du contenu du pad ${padId}, taille: ${content.size} octets`);
    
    const formData = new FormData();
    formData.append('content', content);
    
    const record = await pb.collection('pads').update<PadResponse>(padId, formData);
    console.log(`Pad mis à jour avec succès, id: ${record.id}`);
    return record;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du contenu du pad ${padId}:`, error);
    throw error;
  }
}

// Créer une mise à jour pour un pad
export async function createPadUpdate(padId: string, updateData: Blob, clientId: string): Promise<PadUpdateResponse> {
  try {
    console.log(`Création d'une mise à jour pour le pad ${padId}, taille: ${updateData.size} octets, clientId: ${clientId}`);
    
    const formData = new FormData();
    formData.append('pad', padId);
    formData.append('updateData', updateData);
    formData.append('clientId', clientId);
    
    const record = await pb.collection('pad_updates').create<PadUpdateResponse>(formData);
    console.log(`Mise à jour créée avec succès, id: ${record.id}`);
    return record;
  } catch (error) {
    console.error(`Erreur lors de la création d'une mise à jour pour le pad ${padId}:`, error);
    throw error;
  }
}

// S'abonner aux mises à jour d'un pad
export function subscribeToPadUpdates(
  padId: string, 
  callback: (update: PadUpdateResponse) => void
): void {
  console.log(`Abonnement aux mises à jour du pad ${padId}`);
  
  pb.collection('pad_updates').subscribe<PadUpdateResponse>('*', (data) => {
    if (data.action === 'create') {
      console.log(`Nouvelle mise à jour reçue pour le pad ${padId}`);
      callback(data.record);
    }
  }, {
    filter: `pad = "${padId}"`
  });
}

// Se désabonner des mises à jour
export function unsubscribeFromPadUpdates(): void {
  console.log('Désabonnement des mises à jour');
  pb.collection('pad_updates').unsubscribe();
}