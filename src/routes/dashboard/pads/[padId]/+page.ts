import { loadPad } from '$lib/shared/padStore.svelte';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		const padId = params.padId;
		const pad = await loadPad(padId);

		return {
			pad
		};
	} catch (e) {
		console.error('Erreur lors du chargement du pad:', e);
		throw error(404, 'Pad non trouvé ou impossible à charger');
	}
};
