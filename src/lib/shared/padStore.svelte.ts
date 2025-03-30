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
export async function updatePadContent(padId: string, content: string): Promise<PadResponse> {
  try {
    console.log(`Mise à jour du contenu du pad ${padId}`);
    
    const data = {
      content: content,
    };
    
    const record = await pb.collection('pads').update<PadResponse>(padId, data);
    console.log(`Pad mis à jour avec succès, id: ${record.id}`);
    return record;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du contenu du pad ${padId}:`, error);
    throw error;
  }
}

// Acquérir le verrou d'édition
export async function acquirePadLock(padId: string): Promise<PadResponse | null> {
  try {
    console.log(`Tentative d'acquisition du verrou pour le pad ${padId}`);

    const userId = pb.authStore.model?.id;
    if (!userId) {
      console.error("Utilisateur non authentifié.");
      return null;
    }

    const data = {
      isEditing: true,
      editingUser: userId,
      lastEditHeartbeat: new Date().toISOString(),
    };

    const record = await pb.collection('pads').update<PadResponse>(padId, data);
    console.log(`Verrou acquis avec succès pour le pad ${padId} par l'utilisateur ${userId}`);
    return record;
  } catch (error) {
    console.error(`Erreur lors de l'acquisition du verrou pour le pad ${padId}:`, error);
    // Gérer les erreurs de concurrence (ex: quelqu'un d'autre a déjà le verrou)
    return null;
  }
}

// Libérer le verrou d'édition
export async function releasePadLock(padId: string): Promise<PadResponse> {
  try {
    console.log(`Libération du verrou pour le pad ${padId}`);

    const data = {
      isEditing: false,
      editingUser: null,
    };

    const record = await pb.collection('pads').update<PadResponse>(padId, data);
    console.log(`Verrou libéré avec succès pour le pad ${padId}`);
    return record;
  } catch (error) {
    console.error(`Erreur lors de la libération du verrou pour le pad ${padId}:`, error);
    throw error;
  }
}
