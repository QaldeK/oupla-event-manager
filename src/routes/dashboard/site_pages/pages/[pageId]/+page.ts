import { loadDoc } from "../../sitePageStore.svelte";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, url }) => {
	try {
		const pageId = params.pageId;
		const pad = await loadDoc(pageId);

		// Le mode édition est activé par défaut.
		// Pour le désactiver, il faut passer `editMode=false` dans l'URL.
		const initialEditMode = url.searchParams.get("editMode") !== "false";

		return {
			pad,
			initialEditMode
		};
	} catch (e) {
		console.error("Erreur lors du chargement du pad:", e);
		throw error(404, "Pad non trouvé ou impossible à charger");
	}
};
