<script lang="ts">
	import type { PageData } from "./$types";

	import DocumentEditor from "$lib/components/DocumentEditor.svelte";
	import * as padStore from "../padStore.svelte";
	import type { PadsResponse } from "$lib/types/pocketbase";
	import type { DocumentStoreActions } from "$lib/shared/documentEditManager.svelte";
	import type { RecordModel } from "pocketbase";

	export let data: PageData;
	const docId = data.pad.id as string;
	let initialEditMode = false;

	const collectionName = "pads";
	const basePath = "/dashboard/pads";

	// Le type `PadsType` est un alias pour `PadsResponse & RecordModel`
	// qui est utilisé en interne par `padStore` pour garantir la compatibilité
	// avec les types de base de PocketBase.
	type PadsType = PadsResponse & RecordModel;

	// Cet objet fait le pont entre les actions génériques de l'éditeur
	// et les implémentations spécifiques du `padStore`.
	const documentActions: DocumentStoreActions<PadsType> = {
		loadDoc: padStore.loadDoc,
		updateDoc: padStore.updatePad,
		acquireLock: padStore.acquirePadLock,
		releaseLock: padStore.releasePadLock,
		refreshLock: padStore.refreshPadLock
	};
</script>

<div class="container mx-auto" style="height: calc(100dvh - 180px);">
	<DocumentEditor {docId} {collectionName} {documentActions} {basePath} {initialEditMode} />
</div>
