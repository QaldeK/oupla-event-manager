import { pb } from "$lib/pocketbase.svelte";
import { getDefaultThemeOptions, type PublicSiteThemeOptions } from "$lib/types/theme.d";
import type { LayoutParentData } from "./$types";

export async function load({ parent }) {
	const parentData: LayoutParentData = await parent();
	const spaceId = parentData.spaceId;
	let theme: PublicSiteThemeOptions = getDefaultThemeOptions();
	let optionsRecordId: string | null = null;

	if (spaceId) {
		try {
			const optionsRecord = await pb
				.collection("spaces_options")
				.getFirstListItem(`space = "${spaceId}"`);
			optionsRecordId = optionsRecord.id;

			const loadedTheme = optionsRecord?.publicSiteTheme as
				| Partial<PublicSiteThemeOptions>
				| undefined;
			theme = {
				...getDefaultThemeOptions(),
				...(loadedTheme ?? {}),
				eventCard: {
					...getDefaultThemeOptions().eventCard,
					...(loadedTheme?.eventCard ?? {})
				},
				layoutSections: {
					...getDefaultThemeOptions().layoutSections,
					...(loadedTheme?.layoutSections ?? {})
				},
				components: {
					...getDefaultThemeOptions().components,
					...(loadedTheme?.components ?? {})
				}
			};
			if (!theme.daisyThemeLight) theme.daisyThemeLight = theme.daisyTheme || "light";
			if (!theme.daisyThemeDark) theme.daisyThemeDark = theme.daisyTheme || "dark";
		} catch (e: any) {
			theme = getDefaultThemeOptions();
			optionsRecordId = null;
		}
	}

	return {
		theme,
		optionsRecordId,
		spaceId
	};
}
