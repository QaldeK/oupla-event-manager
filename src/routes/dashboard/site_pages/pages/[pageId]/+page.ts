import { loadDoc } from "../../sitePageStore.svelte";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
	try {
		const pageId = params.pageId;
		const pad = await loadDoc(pageId);

		return {
			pad
		};
	} catch (e) {
		console.error("Erreur lors du chargement du pad:", e);
		throw error(404, "Pad non trouvé ou impossible à charger");
	}
};
