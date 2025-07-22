// src/routes/dashboard/events/archived/+page.ts
import { pb } from "$lib/pocketbase.svelte";
import type { ArchivedEventType } from "$lib/types/archived.types";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ url }) => {
	const page = Number(url.searchParams.get("page")) || 1;
	const perPage = 15;

	try {
		const resultList = await pb
			.collection("events_past")
			.getList<ArchivedEventType>(page, perPage, {
				sort: "-date_event"
			});

		return {
			archivedEvents: resultList.items,
			pagination: {
				page: resultList.page,
				perPage: resultList.perPage,
				totalPages: resultList.totalPages,
				totalItems: resultList.totalItems
			}
		};
	} catch (error) {
		console.error("Erreur lors du chargement des événements archivés:", error);
		return {
			archivedEvents: [],
			pagination: { page: 1, perPage, totalPages: 1, totalItems: 0 },
			error: "Impossible de charger les archives."
		};
	}
};
