<script lang="ts">
	import { Tipex, defaultExtensions } from '@friendofsvelte/tipex';
	import { TextAlign } from '@tiptap/extension-text-align';
	import type { TipexEditor } from '@friendofsvelte/tipex';

	import type { PadsResponse, SitePagesResponse, RecordModel } from '$lib/types/pocketbase';
	import * as padStore from '../padStore.svelte';
	import { createEditableDocumentStore } from '$lib/shared/editableDocumentStore.svelte';
	import TipexToolbar from '$lib/components/TipexToolbar.svelte';

	import Save from 'lucide-svelte/icons/save';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Info from 'lucide-svelte/icons/info';

	import '@friendofsvelte/tipex/styles/Tipex.css';
	import '@friendofsvelte/tipex/styles/ProseMirror.css';
	import '@friendofsvelte/tipex/styles/EditLink.css';

	interface Props {
		docId: string;
		initialEditMode?: boolean;
	}

	const { docId, initialEditMode = false }: Props = $props();
	const collectionName = 'pads';

	// État de l'éditeur
	let editor: TipexEditor | undefined = $state();

	// --- Store Éditable ---

	const documentActions = {
		loadDoc: (id: string) => padStore.loadDoc(id),
		updateDoc: (id: string, data: Partial<PadsResponse>) => padStore.updatePad(id, data),
		acquireLock: (id: string) => padStore.acquirePadLock(id),
		releaseLock: (id: string) => padStore.releasePadLock(id),
		refreshLock: (id: string) => padStore.refreshPadLock(id)
	};

	const editableDocStore = createEditableDocumentStore<PadsResponse>({
		docId,
		collectionName: collectionName, // Utilise la constante
		actions: documentActions,
		fieldsToSave: ['title', 'content'], // Champs à sauvegarder automatiquement
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

	// Durée d'inactivité avant libération auto du verrou (10 minutes)
	const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

	const extensions = [
		TextAlign.configure({
			types: ['heading', 'paragraph']
		})
	];
	// --- Fonctions d'Interaction UI ---

	function handleTitleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		// 👉 Utiliser la méthode du store pour mettre à jour le champ 'title'
		// Le type est correct car on sait que c'est une PadsResponse
		editableDocStore.updateField('title', target.value);
	}

	function handleEditorUpdate() {
		// 👉 Utiliser la méthode du store pour mettre à jour le champ 'content'
		editableDocStore.updateField('content', editor?.getHTML() ?? '');
	}

	async function saveAndClose() {
		if (!isEditing) return;
		console.log('[PadEditor] Sauvegarde et fermeture demandés...');
		await editableDocStore.stopEditing(true); // true = save first
	}

	// --- Cycle de Vie ---

	$effect(() => {
		console.log('[PadEditor] Effet principal monté. Store initialisé pour Pad:', docId);

		// Mise à jour Tipex si contenu externe change en mode lecture
		if (!isEditing && editor && doc?.content !== editor.getHTML()) {
			console.log('[PadEditor] Contenu externe changé (mode lecture), mise à jour Tipex.');
			editor.commands.setContent(doc?.content ?? '', false);
		}

		// Gestionnaire beforeunload (inchangé)
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (isEditing) {
				event.preventDefault();
				event.returnValue = '';
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);

		// --- Cleanup ---
		return () => {
			console.log('[PadEditor] Cleanup: Appel de editableDocStore.dispose() pour Pad:', docId);
			window.removeEventListener('beforeunload', handleBeforeUnload);
			editableDocStore.dispose();
		};
	});
</script>

<!-- Le template est presque identique, mais on peut être plus sûr des types -->
<div class="w-full max-w-4xl" role="region" aria-label="Éditeur de Pad" tabindex="0">
	<div class="mb-4 flex items-center justify-between gap-4">
		<div class="flex flex-grow items-center gap-2">
			{#if isEditing && editor}
				<input
					type="text"
					class="input input-bordered text-fluid-lg w-full max-w-md font-bold"
					placeholder="Titre du document"
					value={doc?.title ?? ''}
					oninput={handleTitleInput}
					aria-label="Titre du document"
				/>
			{:else}
				<div class="text-fluid-lg font-bold">{doc?.title || 'Chargement...'}</div>
			{/if}
		</div>

		<div class="flex flex-shrink-0 items-center gap-2">
			<!-- Indicateurs de statut -->
			<div class="status-indicator flex items-center gap-1">
				{#if isLoading && !doc}
					<span class="loading loading-spinner loading-xs"></span>
					<span class="text-base-content/70 text-xs">Chargement...</span>
				{:else if isSaving}
					<span class="loading loading-spinner loading-xs"></span>
					<span class="text-base-content/70 text-xs">Enreg...</span>
				{:else if isLockedByOther}
					<span
						class="text-content-warning bg-warning/40 flex items-center gap-1 rounded-xl px-4 py-2 text-xs"
						title={lockStatusMessage ?? `Verrouillé par ${editorUsername}`}
					>
						<Info size={14} />
						Edité par {editorUsername}
					</span>
				{/if}
			</div>

			<!-- Bouton Enregistrer et Fermer -->
			{#if isEditing}
				<button
					class="btn btn-primary"
					onclick={saveAndClose}
					disabled={isLoading || isSaving}
					title="Enregistrer les modifications et passer en mode lecture"
				>
					<Save size={16} />
					Enregistrer et fermer
				</button>
			{/if}

			<!-- Tabs pour choisir le mode -->
			<div role="tablist" class="tabs tabs-border">
				<button
					role="tab"
					class="tab not-sm:hidden"
					class:tab-active={!isEditing}
					onclick={() => {
						if (isEditing) editableDocStore.stopEditing(true);
					}}
					disabled={isLoading || isSaving}
					aria-selected={!isEditing}
					aria-controls="pad-content"
				>
					Lecture
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
					<span class="p-2 not-sm:hidden">Édition</span>
				</button>
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
	<div class="editor-wrapper bg-base-100 rounded-lg border shadow-md">
		{#if isLoading && !doc}
			<div class="flex items-center justify-center p-10">
				<span class="loading loading-dots loading-lg"></span>
				<span class="ml-4">Chargement du document...</span>
			</div>
		{:else if isEditing}
			<!-- Mode Édition -->
			<div class="bg-base-200 flex items-center">
				<TipexToolbar {editor} />
			</div>
			<Tipex
				bind:tipex={editor as TipexEditor}
				extensions={[...defaultExtensions, ...extensions]}
				controls={false}
				class=" flex-grow"
				focal={false}
				body={doc?.content ?? ''}
				onupdate={handleEditorUpdate}
				aria-label="Éditeur de texte principal"
				id="pad-editor"
			/>
		{:else}
			<!-- Mode Lecture -->
			<div id="pad-content" role="document">
				<div class="document-content prose max-w-none p-4">
					{@html doc?.content || '<p><em>Ce document est vide.</em></p>'}
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
	.editor-wrapper {
		display: flex;
		flex-direction: column;
		min-height: 400px;
		max-height: calc(100vh - 250px);
		height: 60vh;
		padding-bottom: 1rem;
	}

	:global(.tipex .ProseMirror) {
		border-top-left-radius: 0;
		border-top-right-radius: 0;
		outline: none;
		background-color: white; /* Ou var(--base-100) */
		flex-grow: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	:global(hr) {
		margin-top: 3rem !important;
		margin-bottom: 3rem;
		border-top-width: 1px;
	}

	.document-content {
		overflow-y: auto;
		min-height: inherit;
		max-height: inherit;
		height: inherit;
		border-radius: inherit;
		max-width: none;
		width: 100%;
		padding: 1rem;
		background-color: white; /* Ou var(--base-100) */
	}
</style>
