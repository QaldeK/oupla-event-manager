import type { LayoutLoad } from "./$types";
import { pb } from "$lib/pocketbase.svelte";
import { getDefaultThemeOptions } from "$lib/types/theme.d";

export const load: LayoutLoad = async ({ params }) => {
	const spaceName = params.space;
	if (!spaceName) throw new Error("Espace non spécifié");

	// 1. Charger les infos de l’espace
	const fetchedSpaceInfo = await pb.collection("spaces").getFirstListItem(`name="${spaceName}"`);

	// 2. Charger les options de thème
	let themeOptions = getDefaultThemeOptions();
	try {
		const fetchedSpaceOptions = await pb
			.collection("spaces_options")
			.getFirstListItem(`space="${fetchedSpaceInfo.id}"`);
		themeOptions = {
			...themeOptions,
			...(fetchedSpaceOptions?.publicSiteTheme ?? {})
		};
		// Fusionner en profondeur si besoin (ex: eventCard, layoutSections, components)
		if (fetchedSpaceOptions?.publicSiteTheme?.eventCard) {
			themeOptions.eventCard = {
				...themeOptions.eventCard,
				...fetchedSpaceOptions.publicSiteTheme.eventCard
			};
		}
		if (fetchedSpaceOptions?.publicSiteTheme?.layoutSections) {
			themeOptions.layoutSections = {
				...themeOptions.layoutSections,
				...fetchedSpaceOptions.publicSiteTheme.layoutSections
			};
		}
		if (fetchedSpaceOptions?.publicSiteTheme?.components) {
			themeOptions.components = {
				...themeOptions.components,
				...fetchedSpaceOptions.publicSiteTheme.components
			};
		}
	} catch (e) {
		// Si pas d’options, on garde les valeurs par défaut
		console.error("Erreur lors du chargement des options de thème :", e);
	}

	return {
		spaceInfo: {
			id: fetchedSpaceInfo.id,
			name: fetchedSpaceInfo.name,
			url: fetchedSpaceInfo.name,
			description: fetchedSpaceInfo.description || ""
		},
		themeOptions
	};
};
