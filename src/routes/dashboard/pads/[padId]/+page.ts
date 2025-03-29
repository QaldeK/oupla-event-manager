import { loadPad } from '$lib/shared/padStore.svelte';
import { pb } from '$lib/pocketbase.svelte';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		const padId = params.padId;
		const pad = await loadPad(padId);

		// Construire l'URL du contenu s'il existe
		let initialContentUrl = undefined;
		if (pad.content) {
			initialContentUrl = pb.getFileUrl(pad, pad.content);
		}

		return {
			pad,
			initialContentUrl
		};
	} catch (e) {
		console.error('Erreur lors du chargement du pad:', e);
		throw error(404, 'Pad non trouvé ou impossible à charger');
	}
};
