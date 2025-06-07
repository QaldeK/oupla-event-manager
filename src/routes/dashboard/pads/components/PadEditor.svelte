<script lang="ts">
	// FIXIT: responsiveness mobile
	import { Tipex, defaultExtensions } from "@friendofsvelte/tipex";
	import type { TipexEditor } from "@friendofsvelte/tipex";
	import { formatDistanceToNow } from "date-fns";
	import { fr } from "date-fns/locale";

	import type { PadsResponse } from "$lib/types/pocketbase";
	import * as padStore from "../padStore.svelte";
	import { createEditableDocumentStore } from "$lib/shared/editableDocumentStore.svelte";

	// Type compatible avec RecordModel pour l'éditeur
	type CompatiblePadsResponse = Omit<PadsResponse, "expand"> & {
		expand?: { [key: string]: unknown } | undefined;
	};
	import TipexToolbar from "$lib/components/TipexToolbar.svelte";

	import Pencil from "lucide-svelte/icons/pencil";
	import Info from "lucide-svelte/icons/info";

	import "@friendofsvelte/tipex/styles/Tipex.css";
	import "@friendofsvelte/tipex/styles/ProseMirror.css";
	import "@friendofsvelte/tipex/styles/EditLink.css";
	import { goto } from "$app/navigation";
	import { Eye, SquareArrowLeft } from "lucide-svelte";
	import { onDestroy } from "svelte";

	interface Props {
		docId: string;
		initialEditMode?: boolean;
	}

	const { docId, initialEditMode = false }: Props = $props();
	const collectionName = "pads";

	// État de l'éditeur - tipexEditor est déjà l'instance TipTap Editor
	let tipexEditor: TipexEditor | undefined = $state();

	// --- Store Éditable ---

	const documentActions = {
		loadDoc: (id: string) => padStore.loadDoc(id) as Promise<CompatiblePadsResponse>,
		updateDoc: (id: string, data: Partial<CompatiblePadsResponse>) =>
			padStore.updatePad(id, data as Partial<PadsResponse>) as Promise<CompatiblePadsResponse>,
		acquireLock: (id: string) =>
			padStore.acquirePadLock(id) as Promise<CompatiblePadsResponse | null>,
		releaseLock: (id: string) =>
			padStore.releasePadLock(id) as Promise<CompatiblePadsResponse | null>,
		refreshLock: (id: string) =>
			padStore.refreshPadLock(id) as Promise<CompatiblePadsResponse | null>
	};

	// --- Store créé une seule fois ---
	const editableDocStore = createEditableDocumentStore<CompatiblePadsResponse>({
		docId,
		collectionName: collectionName, // Utilise la constante
		actions: documentActions,
		fieldsToSave: ["title", "content"], // Champs à sauvegarder automatiquement
		initialEditMode: initialEditMode
	});

	// --- Variables dérivées pour le template (simplifie l'accès) ---
	let doc = $derived(editableDocStore.doc); // Sera de type PadsResponse | null
	let isLoading = $derived(editableDocStore.isLoading);
	let isEditing = $derived(editableDocStore.isEditing);
	let isSaving = $derived(editableDocStore.isSaving);
	let isLockedByOther = $derived(editableDocStore.isLockedByOther);
	let editorUsername = $derived(editableDocStore.editorUsername);
	let lockStatusMessage = $derived(editableDocStore.lockStatusMessage);
	let error = $derived(editableDocStore.error);
	let lastActivity = $derived(editableDocStore.lastActivity);

	// $inspect("isEditing", isEditing);
	// $inspect("isLockedByOther", isLockedByOther);
	// $inspect("editorUsername", editorUsername);

	// Durée d'inactivité avant libération auto du verrou (10 minutes)
	const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

	// --- Fonctions d'Interaction UI ---

	function handleTitleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		// 👉 Utiliser la méthode du store pour mettre à jour le champ 'title'
		// Le type est correct car on sait que c'est une PadsResponse
		editableDocStore.updateField("title", target.value);
	}

	function handleEditorUpdate() {
		// 👉 Utiliser la méthode du store pour mettre à jour le champ 'content'
		editableDocStore.updateField("content", tipexEditor?.getHTML() ?? "");
	}

	async function saveAndClose() {
		if (!isEditing) return;
		console.log("[PadEditor] Sauvegarde et fermeture demandés...");
		await editableDocStore.stopEditing(true); // true = save first
	}

	// --- Cycle de Vie ---

	// Effet pour la gestion du beforeunload - se base seulement sur docId
	$effect(() => {
		console.log("[PadEditor] Gestionnaire beforeunload monté pour Pad:", docId);

		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (editableDocStore.isEditing) {
				event.preventDefault();
				event.returnValue = "";
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	});

	// Effet pour la mise à jour de Tipex - se déclenche seulement si nécessaire
	$effect(() => {
		if (!isEditing && tipexEditor && doc?.content !== tipexEditor.getHTML()) {
			console.log("[PadEditor] Contenu externe changé (mode lecture), mise à jour Tipex.");
			tipexEditor.commands.setContent(doc?.content ?? "", false);
		}
	});

	// Nettoyage final du store lors de la destruction du composant
	onDestroy(() => {
		console.log("[PadEditor] Cleanup final: Appel de editableDocStore.dispose() pour Pad:", docId);
		editableDocStore.dispose();
	});
</script>

<!-- Composant réutilisable pour l'indicateur de statut -->
{#snippet statusIndicator(className = "")}
	<div class="status-indicator flex items-center gap-1 {className}">
		{#if isLoading && !doc}
			<span class="loading loading-spinner loading-xs"></span>
			<span class="text-base-content/70 text-xs">Chargement...</span>
		{:else if isSaving}
			<span class="loading loading-spinner loading-xs"></span>
			<span class="text-base-content/70 text-xs">Enreg...</span>
		{:else if isLockedByOther}
			<div
				class="text-content-warning bg-warning/40 flex flex-wrap items-center gap-2 rounded-xl px-4 py-2 text-xs"
				title={lockStatusMessage ?? `Verrouillé par ${editorUsername}`}
			>
				<Info size={14} />
				<span> Edition en cours par {editorUsername} </span>
			</div>
		{/if}
	</div>
{/snippet}

<!-- Composant réutilisable pour les tabs -->
{#snippet modeTabs(className = "")}
	<div class="flex flex-wrap {className}">
		<div role="tablist" class="tabs tabs-border">
			<button
				role="tab"
				class="tab"
				class:tab-active={!isEditing}
				onclick={() => {
					if (isEditing) editableDocStore.stopEditing(true);
				}}
				disabled={isLoading || isSaving}
				aria-selected={!isEditing}
				aria-controls="pad-content"
			>
				<Eye size={16} />
				<span class="p-2">Lecture</span>
			</button>
			<button
				role="tab"
				class="tab"
				class:tab-active={isEditing}
				onclick={() => {
					if (!isEditing) editableDocStore.startEditing();
				}}
				disabled={isLockedByOther || isLoading || isSaving}
				aria-selected={isEditing}
				aria-controls="pad-editor"
			>
				<Pencil size={16} />
				<span class="p-2">Édition</span>
			</button>
		</div>
	</div>
{/snippet}

<!-- tabindex="0" sur la premier div?  -->
<div id="pad_component" class="flex h-full flex-col" role="region" aria-label="Éditeur de Pad">
	<div
		id="header_pad"
		class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
	>
		<!-- Première ligne: Bouton retour + Tabs (sur petit écran) -->
		<div class="flex items-center justify-between gap-4 sm:justify-start">
			<button onclick={() => goto("/dashboard/pads")} class="btn btn-square">
				<SquareArrowLeft size={24} />
			</button>

			<!-- Tabs pour choisir le mode - visible sur petit écran -->
			{@render modeTabs("sm:hidden")}
		</div>

		<!-- Indicateur de statut - sous les tabs sur petit écran -->
		{@render statusIndicator("sm:hidden")}

		<!-- Ligne titre + controls pour grand écran -->
		<div class="flex flex-grow items-center justify-between gap-4">
			<div class="flex flex-grow items-center gap-2">
				{#if isEditing && tipexEditor}
					<input
						type="text"
						class="input input-bordered text-fluid-lg w-full max-w-md font-bold"
						placeholder="Titre du document"
						value={doc?.title ?? ""}
						oninput={handleTitleInput}
						aria-label="Titre du document"
					/>
				{:else}
					<div class="text-fluid-lg font-bold">{doc?.title || "Chargement..."}</div>
				{/if}
			</div>

			<div class="hidden flex-shrink-0 items-center gap-2 sm:flex">
				<!-- Indicateurs de statut - visible sur grand écran -->
				{@render statusIndicator()}

				<!-- Tabs pour choisir le mode - visible sur grand écran -->
				{@render modeTabs()}
			</div>
		</div>
	</div>

	<!-- Affichage des erreurs -->
	{#if error}
		<div class="alert alert-error mb-4">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 shrink-0 stroke-current"
				fill="none"
				viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				/></svg
			>
			<span>{error}</span>
			<button class="btn btn-sm" onclick={editableDocStore.clearError}>Fermer</button>
		</div>
	{/if}

	<!-- Conteneur de l'éditeur -->
	{#if doc?.created || doc?.updated}
		<div
			class="bg-base-100/80 text-base-content/60 ml-auto rounded-lg px-2 py-1 text-xs backdrop-blur-sm"
		>
			{#if doc.created}
				<span title="Date de création : {new Date(doc.created).toLocaleString('fr-FR')}">
					Créé le {new Date(doc.created).toLocaleDateString("fr-FR")}
				</span>
			{/if}
			{#if doc.updated}
				<span title="Dernière modification : {new Date(doc.updated).toLocaleString('fr-FR')}">
					Modifié {formatDistanceToNow(new Date(doc.updated), {
						addSuffix: true,
						locale: fr
					})}
				</span>
			{/if}
		</div>
	{/if}
	<div class="bg-base-100 flex h-full flex-col rounded-lg border shadow-md">
		{#if isLoading && !doc}
			<div class="flex flex-1 items-center justify-center p-10">
				<span class="loading loading-dots loading-lg"></span>
				<span class="ml-4">Chargement du document...</span>
			</div>
		{:else if isEditing}
			<!-- Mode Édition -->
			<div class="bg-base-200 flex flex-shrink-0 items-center">
				<TipexToolbar editor={tipexEditor} onSaveAndClose={saveAndClose} {isSaving} {isLoading} />
			</div>
			<div class="flex-1 overflow-hidden">
				<Tipex
					bind:tipex={tipexEditor}
					extensions={[...defaultExtensions]}
					controls={false}
					class="h-full"
					floating={false}
					focal={false}
					body={doc?.content ?? ""}
					onupdate={handleEditorUpdate}
				/>
			</div>
		{:else}
			<!-- Mode Lecture -->

			<div id="pad-content" role="document" class=" flex-1 overflow-hidden">
				<!-- Informations de dates (discret, en haut à droite) -->

				<div class="document-content prose h-full max-w-none overflow-y-auto p-4">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html doc?.content || "<p><em>Ce document est vide.</em></p>"}
				</div>
			</div>
		{/if}
	</div>

	<!-- Informations sur le temps d'inactivité -->
	{#if isEditing}
		<div class="mt-2 text-xs text-gray-500">
			{#key lastActivity}
				{@const remainingMinutes = Math.max(
					0,
					Math.round((INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivity)) / 60000)
				)}
				Vous serez déconnecté de l'édition après {remainingMinutes} minutes d'inactivité.
			{/key}
		</div>
	{/if}
</div>

<style>
	:global(.tipex) {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	:global(.tipex .ProseMirror) {
		border-top-left-radius: 0;
		border-top-right-radius: 0;
		outline: none;
		background-color: white; /* Ou var(--base-100) */
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		min-height: 0; /* 👉 Permet au flex item de se rétrécir sous sa taille de contenu */
	}

	:global(hr) {
		margin-top: 3rem !important;
		margin-bottom: 3rem;
		border-top-width: 1px;
	}

	.document-content {
		border-radius: inherit;
		max-width: none;
		width: 100%;
		background-color: white; /* Ou var(--base-100) */
	}
</style>
