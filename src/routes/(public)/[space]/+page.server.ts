import { pb } from '$lib/pocketbase.svelte';
import type { PublicEventInfo, PublicSpaceInfo } from '$lib/shared/publicStore.svelte';
import type { SitePagesResponse } from '$lib/types/pocketbase';
import { dev } from '$app/environment';

export const config = {
	isr: {
		expiration: 3600 // Cache par défaut: 1 heure
	}
};

// les sections que nous voulons récupérer pour le layout
const layoutSections = ['header', 'left_side', 'top', 'right_side', 'footer'];

export async function load({ params, platform, request, setHeaders }) {
	const spaceName = params.space;
	const spaceId = params.spaceId;

	// Utiliser un cache-control header pour les clients
	setHeaders({
		'Cache-Control': 'no-store, max-age=0' // Forcer le client à ne pas cacher en dev peut aider
		// En production, remettre : 'public, max-age=600'
	});

	// ---> Logique de Cache (Production avec KV) <---
	// En production ET si KV_STORE existe
	if (!dev && platform?.env?.KV_STORE) {
		const cacheKey = `space_layout:${spaceName}`;
		const url = new URL(request.url);
		const skipCache = url.searchParams.has('skipCache'); // Garder pour invalidation manuelle

		if (!skipCache) {
			try {
				const cachedData = await platform.env.KV_STORE.get(cacheKey, { type: 'json' });
				if (cachedData) {
					console.log(`[KV Cache - PROD] HIT for ${cacheKey}`);
					// Vérifier si les données cachées sont valides (ont spaceInfo)
					if (cachedData.spaceInfo) {
						return cachedData;
					} else {
						console.warn(
							`[KV Cache - PROD] HIT but data seems invalid (no spaceInfo). Key: ${cacheKey}`
						);
						// Continuer pour charger des données fraîches
					}
				} else {
					console.log(`[KV Cache - PROD] MISS for ${cacheKey}`);
				}
			} catch (e) {
				console.error(`[KV Cache - PROD] Error getting cache for ${cacheKey}:`, e);
				// Continuer pour charger des données fraîches en cas d'erreur cache
			}
		} else {
			console.log(`[KV Cache - PROD] SKIP requested for ${cacheKey}`);
		}

		// Charger les données fraîches si pas de HIT valide ou si skipCache
		console.log('[Server Load - PROD] Calling loadFreshData (after cache check)...');
		const freshData = await loadFreshData(spaceName);

		// Mettre en cache seulement si succès ET pas d'erreur interne
		if (!freshData.error && freshData.spaceInfo) {
			try {
				console.log(`[KV Cache - PROD] PUT for ${cacheKey}`);
				await platform.env.KV_STORE.put(cacheKey, JSON.stringify(freshData), {
					expirationTtl: 3600
				});
			} catch (e) {
				console.error(`[KV Cache - PROD] Error putting cache for ${cacheKey}:`, e);
			}
		} else {
			console.warn(`[KV Cache - PROD] Not caching due to error or missing spaceInfo.`);
		}
		console.log('[Server Load - PROD] Returning fresh data.');
		return freshData;
	}

	// ---> Logique SANS Cache (Développement OU Production sans KV) <---
	console.log('[Server Load - DEV or No KV] Calling loadFreshData directly...');
	const freshData = await loadFreshData(spaceName);
	console.log(
		`[Server Load - DEV or No KV] Returning fresh data. Keys: ${JSON.stringify(Object.keys(freshData))}`
	);
	if (freshData.error) {
		console.warn(
			`[Server Load - DEV or No KV] loadFreshData returned an error: ${freshData.error}`
		);
	}
	return freshData;
}

async function loadFreshData(spaceName: string): Promise<{
	spaceInfo: PublicSpaceInfo | null;
	events: PublicEventInfo[];
	sitePages: SitePagesResponse[];
	error?: string;
}> {
	console.log(`[loadFreshData] Loading data for space: ${spaceName}`);

	try {
		// Récupérer l'ID de l'espace à partir du nom
		const spaceRecord = await pb.collection('spaces').getFirstListItem(`name="${spaceName}"`);

		if (!spaceRecord) {
			throw new Error(`L'espace "${spaceName}" n'existe pas.`);
		}

		// Récupérer les options de l'espace
		const spaceOptions = await pb
			.collection('spaces_options')
			.getFirstListItem(`space="${spaceRecord.id}"`, {
				expand: 'space',
				fields: 'categories,rooms,public_site,space,expand.space.name,expand.space.description'
			});

		console.log('[loadFreshData] spaceOptions fetched. Public site:', spaceOptions.public_site);
		if (!spaceOptions.public_site) {
			throw new Error("Ce site n'est pas accessible publiquement.");
		}

		const spaceInfo: PublicSpaceInfo = {
			id: spaceOptions.space,
			name: spaceOptions.expand?.space?.name || '',
			description: spaceOptions.expand?.space?.description || '',
			categories: spaceOptions.categories || [],
			rooms: spaceOptions.rooms || [],
			public_site: spaceOptions.public_site
		};
		console.log('[loadFreshData] spaceInfo constructed:', spaceInfo.id);

		// Récupérer les événements publics et confirmés
		const events = await pb.collection('events').getFullList<PublicEventInfo>({
			filter: `space="${spaceInfo.id}" && isConfirmed=true && date_event>="${new Date().toISOString().split('T')[0]}"`,
			sort: 'date_event,time_start',
			fields:
				'id,event_title,date_event,time_start,time_end,categories,desc_public,is_prix_libre,prix,isMixiteChoisie,mixite,is_age_no_restriction,age_advice,canceled,image'
			// XXX ? On enlève les champs récurrents ici car moins pertinents pour la liste publique simple, ajuster si besoin
		});
		console.log(`[loadFreshData] ${events.length} events fetched.`);

		// Récupérer les SitePages pour le layout public
		const sectionsFilter = layoutSections.map((s) => `section="${s}"`).join(' || ');
		console.log(`[loadFreshData] sitePages filter: space="${spaceInfo.id}" && (${sectionsFilter})`);

		const sitePages = await pb.collection('site_pages').getFullList<SitePagesResponse>({
			filter: `space="${spaceInfo.id}" && (${sectionsFilter})`,
			sort: 'pos',
			fields: 'id,title,content,section,bg_color,pos' // Sélectionner les champs nécessaires
		});
		console.log(`[loadFreshData] ${sitePages.length} sitePages fetched.`);
		return {
			spaceInfo,
			events,
			sitePages
		};
	} catch (error) {
		console.error('Error loading fresh data:', error);
		// 👉 Standardiser le retour d'erreur
		const errorMessage =
			error instanceof Error ? error.message : 'Erreur inconnue lors du chargement des données';
		console.log('[loadFreshData] Failure - Returning error:', errorMessage);
		return {
			spaceInfo: null,
			events: [],
			sitePages: [], // 👉 Retourner un tableau vide en cas d'erreur
			error: errorMessage
		};
	}
}
