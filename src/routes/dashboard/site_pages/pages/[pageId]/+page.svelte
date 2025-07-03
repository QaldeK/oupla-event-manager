<script lang="ts">
	import DocumentEditor from "$lib/components/DocumentEditor.svelte";
	import * as sitePageStore from "../../sitePageStore.svelte";
	import type { SitePagesResponse } from "$lib/types/pocketbase";
	import type { DocumentStoreActions } from "$lib/shared/documentEditManager.svelte";
	import type { RecordModel } from "pocketbase";

	export let data;
	const docId = data.pad.id as string;

	const collectionName = "site_pages";
	const basePath = "/dashboard/site_pages/pages";
	// @ts-expect-error: initialEditMode may be injected via load function or parent context
	let initialEditMode = data.initialEditMode;

	type SitePageType = SitePagesResponse & RecordModel;

	// Cet objet fait le pont entre les actions génériques de l'éditeur
	// et les implémentations spécifiques du `padStore`.
	const documentActions: DocumentStoreActions<SitePageType> = {
		loadDoc: sitePageStore.loadDoc,
		updateDoc: sitePageStore.updatePad,
		acquireLock: sitePageStore.acquirePadLock,
		releaseLock: sitePageStore.releasePadLock,
		refreshLock: sitePageStore.refreshPadLock
	};
</script>

<div class="container mx-auto md:p-4" style="height: calc(100dvh - 100px);">
	<DocumentEditor {docId} {collectionName} {documentActions} {basePath} {initialEditMode} />
</div>
