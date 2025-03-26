import { pb } from '$lib/pocketbase.svelte';
import type { PublicEventInfo, PublicSpaceInfo } from '$lib/shared/publicStore.svelte';

export const config = {
	isr: {
		expiration: 3600 // Cache par défaut: 1 heure
	}
};

export async function load({ params, platform, request, setHeaders }) {
	const spaceName = params.space;

	// Utiliser un cache-control header pour les clients
	setHeaders({
		'Cache-Control': 'public, max-age=600' // 10 minutes de cache côté client
	});

	// Pour Cloudflare et autres environnements de déploiement avec KV
	if (platform?.env?.KV_STORE) {
		const cacheKey = `space:${spaceName}`;

		// Vérifier si une invalidation explicite a été demandée
		const url = new URL(request.url);
		const skipCache = url.searchParams.has('skipCache');

		if (!skipCache) {
			// Essayer de récupérer depuis le cache
			const cachedData = await platform.env.KV_STORE.get(cacheKey, { type: 'json' });
			if (cachedData) return cachedData;
		}

		// Si pas en cache ou skipCache, charger les données fraîches
		const data = await loadFreshData(spaceName);

		// Mettre en cache les nouvelles données
		await platform.env.KV_STORE.put(cacheKey, JSON.stringify(data), {
			expirationTtl: 3600 // 1 heure
		});

		return data;
	}

	// Fallback pour les environnements sans KV (développement local, etc.)
	return await loadFreshData(spaceName);
}

async function loadFreshData(spaceName: string) {
	try {
		// Récupérer l'ID de l'espace à partir du nom
		const spaceRecord = await pb.collection('spaces').getFirstListItem(`name="${spaceName}"`);

		if (!spaceRecord) {
			throw new Error("L'espace n'existe pas");
		}

		// Récupérer les options de l'espace
		const spaceOptions = await pb
			.collection('spaces_options')
			.getFirstListItem(`space="${spaceRecord.id}"`, {
				expand: 'space',
				fields:
					'categories,rooms,public_site,space,expand.space.name,expand.space.description,expand.space.title'
			});

		if (!spaceOptions.public_site) {
			throw new Error("Ce site n'est pas accessible publiquement");
		}

		const spaceInfo: PublicSpaceInfo = {
			id: spaceOptions.space,
			name: spaceOptions.expand?.space?.name || '',
			title: spaceOptions.expand?.space?.title || '',
			description: spaceOptions.expand?.space?.description || '',
			categories: spaceOptions.categories || [],
			rooms: spaceOptions.rooms || [],
			public_site: spaceOptions.public_site
		};

		// Récupérer les événements publics et confirmés
		const events = await pb.collection('events').getFullList({
			filter: `space="${spaceInfo.id}" && isPublished=true && isConfirmed=true && date_event>="${new Date().toISOString().split('T')[0]}"`,
			sort: 'date_event,time_start',
			fields:
				'id,event_title,date_event,time_start,time_end,start_public,start_event,categories,desc_public,is_prix_libre,prix,isMixiteChoisie,mixite,is_age_no_restriction,age_advice,canceled,isRecurrent,isMasterRecurrent,masterRecurrentId,image,duree,dateEnd,dateStart'
		});

		return {
			spaceInfo,
			events
		};
	} catch (error) {
		console.error('Error loading fresh data:', error);
		return {
			spaceInfo: null,
			events: [],
			error: error instanceof Error ? error.message : 'Erreur lors du chargement des données'
		};
	}
}
