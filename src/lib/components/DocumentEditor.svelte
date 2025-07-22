<script lang="ts">
	/* TODO:
  - le btn goback doit alerté si il y a des changement non enregistré
  - le btn "enregistrer" ne ferme pas forcément l'édition
  */

	import type { TipexEditor } from "@friendofsvelte/tipex";
	import { Tipex, defaultExtensions } from "@friendofsvelte/tipex";
	import { formatDistanceToNow } from "date-fns";
	import { fr } from "date-fns/locale";
	import { safeHtml } from "$lib/actions/safeHtml";

	import TipexToolbar from "$lib/components/TipexToolbar.svelte";
	import { createDocumentEditManager } from "$lib/shared/documentEditManager.svelte";
	import type { DocumentStoreActions } from "$lib/shared/documentEditManager.svelte";
	import type { PadsResponse, SitePagesResponse } from "$lib/types/pocketbase";

	import Info from "lucide-svelte/icons/info";
	import Pencil from "lucide-svelte/icons/pencil";

	import { goto } from "$app/navigation";
	import "@friendofsvelte/tipex/styles/index.css";

	import { Eye, SquareArrowLeft } from "lucide-svelte";
	import { onDestroy } from "svelte";
	import type { RecordModel } from "pocketbase";

	// --- Définitions de Types Génériques ---
	type EditableDocument = (PadsResponse | SitePagesResponse) &
		RecordModel & {
			title?: string;
			content?: string;
			// Champs de verrouillage attendus par le manager
			isEditing?: boolean;
			editingUser?: string | null;
			lastEditHeartbeat?: string;
			lastMod?: string;
		};

	// --- Props du Composant ---
	interface Props<T extends EditableDocument> {
		docId: string;
		collectionName: string;
		documentActions: DocumentStoreActions<T>;
		basePath: string; // Chemin de retour (ex: "/dashboard/pads")
		initialEditMode?: boolean;
		autoSave?: boolean;
	}

	const {
		docId,
		collectionName,
		documentActions,
		basePath,
		initialEditMode = false,
		autoSave = false
	}: Props<EditableDocument> = $props();

	// État de l'éditeur Tipex
	let tipexEditor: TipexEditor | undefined = $state();

	// --- Store d'Édition ---
	const docActions = createDocumentEditManager<EditableDocument>({
		docId,
		collectionName,
		actions: documentActions,
		fieldsToSave: ["title", "content"],
		initialEditMode,
		autoSave
	});

	// --- Variables Réactives Dérivées ---
	let doc = $derived(docActions.doc);
	let isLoading = $derived(docActions.isLoading);
	let isEditing = $derived(docActions.isEditing);
	let isSaving = $derived(docActions.isSaving);
	let isLockedByOther = $derived(docActions.isLockedByOther);
	let isCheckingHeartbeat = $derived(docActions.isCheckingHeartbeat); // Nouvel état d'attente
	let editorUsername = $derived(docActions.editorUsername);
	let lockStatusMessage = $derived(docActions.lockStatusMessage);
	let error = $derived(docActions.error);
	let lastActivity = $derived(docActions.lastActivity);

	// Durée d'inactivité avant libération auto du verrou (10 minutes)
	const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

	// --- Fonctions d'Interaction UI ---
	function handleTitleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		docActions.updateField("title", target.value);
	}

	function handleEditorUpdate() {
		docActions.updateField("content", tipexEditor?.getHTML() ?? "");
	}

	async function save() {
		if (!isEditing) return;
		await docActions.saveChanges();
	}

	// --- Cycle de Vie ---
	$effect(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (isEditing) {
				event.preventDefault();
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	});

	// $effect(() => {
	// 	if (!isEditing && tipexEditor && doc?.content !== tipexEditor.getHTML()) {
	// 		tipexEditor.commands.setContent(doc?.content ?? "", false);
	// 	}
	// });

	onDestroy(() => {
		docActions.dispose();
	});

	function goback() {
		if (docActions.hasChange) {
			if (
				window.confirm(
					"Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?"
				)
			) {
				goto(basePath);
			}
		} else {
			goto(basePath);
		}
	}
</script>

<!-- SNIPPETS RÉUTILISABLES -->

{#snippet statusIndicator(className = "")}
	<div class="status-indicator flex items-center gap-2 {className}">
		{#if isLoading && !doc}
			<span class="loading loading-spinner loading-xs"></span>
			<span class="text-base-content/70 text-xs">Chargement...</span>
		{:else if isSaving}
			<span class="loading loading-spinner loading-xs"></span>
			<span class="text-base-content/70 text-xs">Enreg...</span>
		{:else if isLockedByOther}
			<div
				class="text-content-warning bg-warning/40 flex flex-wrap items-center gap-2 rounded-xl px-4 py-1 text-sm"
				title={lockStatusMessage ?? `Édition en cours par ${editorUsername}`}
			>
				<Info size={14} />
				<span> {lockStatusMessage}</span>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet footDoc()}
	<div
		class="text-base-content/60 flex flex-wrap items-center justify-between border-t px-2 py-1 text-xs"
	>
		{#if isEditing}
			{#key lastActivity}
				{@const remainingMinutes = Math.max(
					0,
					Math.round((INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivity)) / 60000)
				)}
				Vous serez déconnecté de l'édition après {remainingMinutes} minutes d'inactivité.
			{/key}
		{/if}
		<div class="py-1">{@render statusIndicator()}</div>
		<!-- Informations de date -->
		{#if doc?.created || doc?.lastMod}
			<div class="ml-auto">
				{#if doc.created}
					<span title="Date de création : {new Date(doc.created).toLocaleString('fr-FR')}">
						Créé le {new Date(doc.created).toLocaleDateString("fr-FR")}
					</span>
				{/if}
				{#if doc.lastMod}
					<span
						class="ml-2"
						title="Dernière modification : {new Date(doc.lastMod).toLocaleString('fr-FR')}"
					>
						Modifié {formatDistanceToNow(new Date(doc.lastMod), {
							addSuffix: true,
							locale: fr
						})}
					</span>
				{/if}
			</div>
		{/if}
	</div>
{/snippet}

{#snippet modeTabs(className = "")}
	<div class="flex flex-wrap {className}">
		<div role="tablist" class="tabs tabs-border">
			<button
				role="tab"
				class="tab"
				class:tab-active={!isEditing}
				onclick={() => {
					if (isEditing) docActions.stopEditing(true);
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
					if (!isEditing) docActions.startEditing();
				}}
				disabled={isLoading || isSaving || isCheckingHeartbeat}
				aria-selected={isEditing}
				aria-controls="pad-editor"
			>
				<Pencil size={16} />
				<span class="p-2">Édition</span>
			</button>
		</div>
	</div>
{/snippet}

<!-- STRUCTURE PRINCIPALE DU COMPOSANT -->

<div
	id="document_editor_component"
	class="flex h-full flex-col"
	role="region"
	aria-label="Éditeur de document"
>
	<!-- En-tête -->
	<div class="mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:mb-4">
		<div class="flex items-center justify-between gap-4 sm:justify-start">
			<button onclick={goback} class="btn btn-square" aria-label="Retour à la liste">
				<SquareArrowLeft size={24} />
			</button>
			{@render modeTabs("sm:hidden")}
		</div>

		<div class="flex flex-grow items-center justify-between gap-4">
			<div class="flex flex-grow items-center gap-2">
				{#if isEditing}
					<input
						type="text"
						class="input input-bordered text-fluid-lg not-md:input-sm w-full max-w-md font-bold"
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
				{@render modeTabs()}
			</div>
		</div>
	</div>

	<!-- Affichage des erreurs et des statuts -->
	{#if error}
		<div role="alert" class="alert alert-error mb-4">
			<Info size={24} />
			<span>{error}</span>
			<button class="btn btn-sm" onclick={docActions.clearError}>Fermer</button>
		</div>
	{/if}

	<!-- Conteneur principal (Éditeur ou Lecteur) -->
	<div class="bg-base-100 flex h-full flex-col rounded-lg border shadow-md">
		{#if isLoading && !doc}
			<div class="flex flex-1 items-center justify-center p-10">
				<span class="loading loading-dots loading-lg"></span>
				<span class="ml-4">Chargement du document...</span>
			</div>
		{:else if isEditing}
			<!-- Mode Édition -->
			<div class="flex-1 overflow-hidden">
				<Tipex
					bind:tipex={tipexEditor}
					extensions={[...defaultExtensions]}
					class="h-full"
					floating={false}
					focal={false}
					body={doc?.content ?? ""}
					onupdate={handleEditorUpdate}
				>
					{#snippet head(tipexEditor)}
						<div class="bg-base-200 flex flex-shrink-0 items-center">
							<TipexToolbar
								editor={tipexEditor}
								onSaveAndClose={save}
								{isSaving}
								{isLoading}
								hasChange={docActions.hasChange}
							/>
						</div>
					{/snippet}
					<!-- Just for put control at top -->
					{#snippet controlComponent()}{/snippet}
					{#snippet foot()}
						{@render footDoc()}
					{/snippet}
				</Tipex>
			</div>
		{:else}
			<!-- Mode Lecture -->
			<div
				id="pad-content"
				role="document"
				class="flex flex-1 flex-col justify-between overflow-hidden rounded-lg"
			>
				<div
					class="document-content prose max-w-none overflow-y-auto p-4"
					use:safeHtml={{ html: doc?.content || "<p><em>Ce document est vide.</em></p>" }}
				></div>
				<div>
					{@render footDoc()}
				</div>
			</div>
		{/if}
	</div>
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
