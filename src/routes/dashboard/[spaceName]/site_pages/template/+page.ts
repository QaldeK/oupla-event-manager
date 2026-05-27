import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ data }) => {
	// On ne fait que propager les données du layout parent
	return { ...data };
};
