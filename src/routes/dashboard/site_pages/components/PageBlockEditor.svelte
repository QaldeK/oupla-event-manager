<script lang="ts">
	import { Tipex, defaultExtensions } from '@friendofsvelte/tipex';
	import { TextAlign } from '@tiptap/extension-text-align';
	import type { TipexEditor } from '@friendofsvelte/tipex';
	import TipexToolbar from '$lib/components/TipexToolbar.svelte';
	import {
		createEditableDocumentStore,
		INACTIVITY_TIMEOUT_MS,
		SAVE_DEBOUNCE_MS
	} from '$lib/shared/editableDocumentStore.svelte';
	import * as sitePageStore from '../sitePageStore.svelte'; // Store spécifique
	import type { SitePagesResponse, SitePagesSectionOptions } from '$lib/types/pocketbase'; // Types spécifiques
	import { AlertCircle, Info, Save } from 'lucide-svelte';

	// Interface pour les props
	interface Props {
		docId: string;
		// On pourrait passer la collection mais ici on assume 'site_pages'
		// collection: 'site_pages'; // Rendu implicite par l'import de sitePageStore
		onSaveAndClose?: () => void; // Callback optionnel après sauvegarde manuelle
		initialEditMode?: boolean; // Pourrait être utile si on veut contrôler ça depuis l'extérieur
	}

	const { docId, onSaveAndClose, initialEditMode = true }: Props = $props();
	const collectionName = 'site_pages'; // Hardcodé pour ce composant

	// Préparer les actions pour le store éditable en utilisant sitePageStore
	const sitePageActions = {
		loadDoc: (id: string) => sitePageStore.loadDoc(id),
		// 👉 Assurer que updatePad prend bien Partial<SitePagesResponse>
		updateDoc: (id: string, data: Partial<SitePagesResponse>) => sitePageStore.updatePad(id, data),
		acquireLock: (id: string) => sitePageStore.acquirePadLock(id),
		releaseLock: (id: string) => sitePageStore.releasePadLock(id),
		refreshLock: (id: string) => sitePageStore.refreshPadLock(id)
	};

	// Créer l'instance du store éditable
	// 👉 Utiliser le type SitePagesResponse pour T
	const editableDoc = createEditableDocumentStore<SitePagesResponse>({
		docId,
		collectionName,
		actions: sitePageActions,
		fieldsToSave: ['title', 'content', 'section'],
		initialEditMode: initialEditMode
	});

	// États locaux pour l'éditeur Tipex
	let editor: TipexEditor | undefined = $state();

	// Données dérivées pour l'UI (plus propre que d'accéder à editableDoc.doc?.title partout)
	let title = $derived(editableDoc.doc?.title ?? '');
	let content = $derived(editableDoc.doc?.content ?? '');
	// let type = $derived(editableDoc.doc?.type ?? SitePagesTypeOptions.page); // Si on doit éditer le type

	// Extensions Tipex
	const tipexExtensions = [
		...defaultExtensions,
		TextAlign.configure({ types: ['heading', 'paragraph'] })
	];

	// 👉 Synchroniser Tipex lorsque le contenu change via le store (ex: subscription) ET qu'on n'édite pas
	$effect(() => {
		const currentStoreContent = editableDoc.doc?.content ?? '';
		// Mettre à jour Tipex seulement si l'éditeur existe, n'est pas en train d'être édité activement par l'utilisateur,
		// et que le contenu du store est différent de celui de l'éditeur.
		if (editor && !editableDoc.isEditing && editor.getHTML() !== currentStoreContent) {
			console.log(`[SimpleEditor ${docId}] Syncing Tipex with store content.`);
			// false pour ne pas déclencher un événement 'update' inutilement
			editor.commands.setContent(currentStoreContent, false);
		}
	});

	// 👉 Gérer la sauvegarde manuelle
	async function handleSaveAndClose() {
		if (!editableDoc.isEditing) return;
		await editableDoc.saveChanges(true); // Force save
		// Optionnel: Appeler un callback si fourni (ex: pour fermer une modale)
		if (onSaveAndClose) {
			onSaveAndClose();
		}
		// On pourrait aussi appeler stopEditing ici si on veut libérer le verrou après sauvegarde manuelle
		// await editableDoc.stopEditing(false); // false car on vient de sauvegarder
	}

	// 👉 Nettoyage à la destruction du composant
	$effect(() => {
		return () => {
			editableDoc.dispose();
		};
	});
</script>

<div class="simple-editor-container w-full" role="region" aria-label="Éditeur de contenu de site">
	<!-- Affichage des erreurs et status -->
	{#if editableDoc.error}
		<div role="alert" class="alert alert-error mb-4 shadow-md" aria-live="assertive">
			<AlertCircle />
			<span>{editableDoc.error}</span>
			<button class="btn btn-sm btn-ghost" onclick={editableDoc.clearError}>Fermer</button>
		</div>
	{/if}
	{#if editableDoc.isLockedByOther && !editableDoc.error}
		<div role="alert" class="alert alert-warning mb-4 shadow-md" aria-live="assertive">
			<Info />
			<span>{editableDoc.lockStatusMessage} (Mode lecture seule)</span>
		</div>
	{/if}

	<!-- Entête avec titre et bouton Enregistrer -->
	<div class="bg-base-200 mb-4 flex flex-wrap items-center justify-between gap-4 rounded-t-lg p-3">
		<input
			type="text"
			class="input input-bordered flex-grow text-lg font-semibold sm:min-w-[300px]"
			placeholder="Titre du bloc/page"
			value={title}
			oninput={(e) => editableDoc.updateField('title', e.currentTarget.value)}
			disabled={!editableDoc.isEditing || editableDoc.isLoading || editableDoc.isSaving}
			aria-label="Titre du contenu"
		/>
		<button
			class="btn btn-primary"
			onclick={handleSaveAndClose}
			disabled={!editableDoc.isEditing || editableDoc.isLoading || editableDoc.isSaving}
			title="Enregistrer les modifications"
		>
			{#if editableDoc.isSaving}
				<span class="loading loading-spinner loading-xs"></span> Sauvegarde...
			{:else}
				<Save size={16} /> Enregistrer
			{/if}
		</button>
	</div>

	<!-- Indicateur de chargement global -->
	{#if editableDoc.isLoading && !editableDoc.doc}
		<div class="flex min-h-[300px] items-center justify-center p-10">
			<span class="loading loading-dots loading-lg"></span>
			<span class="ml-4">Chargement du contenu...</span>
		</div>
	{:else if !editableDoc.doc && !editableDoc.isLoading}
		<div role="alert" class="alert alert-warning mb-4">
			<AlertCircle /> <span>Document non trouvé ou erreur de chargement.</span>
		</div>
	{:else}
		<!-- Wrapper pour l'éditeur Tipex -->
		<div class="editor-wrapper bg-base-100 rounded-b-lg border border-t-0 shadow-md">
			{#if editableDoc.isEditing || editableDoc.isLockedByOther}
				<!-- Afficher la toolbar même si locké pour voir les outils -->
				<TipexToolbar {editor} disabled={!editableDoc.isEditing || editableDoc.isSaving} />
			{/if}
			<Tipex
				bind:tipex={editor as TipexEditor}
				extensions={tipexExtensions}
				controls={false}
				class="tipex-editor-instance flex-grow"
				body={content}
				editable={editableDoc.isEditing && !editableDoc.isSaving}
				onupdate={({ editor: ed }) => editableDoc.updateField('content', ed.getHTML())}
			/>
		</div>
		{#if editableDoc.isEditing}
			<div class="text-base-content/70 mt-2 text-xs">
				Sauvegarde automatique après {SAVE_DEBOUNCE_MS / 1000}s d'inactivité de frappe. Déconnexion
				auto après {Math.round(INACTIVITY_TIMEOUT_MS / 60000)} min d'inactivité totale.
			</div>
		{/if}
	{/if}
</div>

<style>
	.simple-editor-container {
		/* Ajoutez des styles de conteneur si nécessaire */
	}
	.editor-wrapper {
		display: flex;
		flex-direction: column;
		/* Ajustez la hauteur selon vos besoins */
		min-height: 400px;
		max-height: 70vh; /* Limite la hauteur max */
		overflow: hidden; /* Empêche le wrapper de déborder */
	}

	/* Styles globaux pour Tipex dans ce composant */
	:global(.tipex-editor-instance .ProseMirror) {
		border: none; /* Pas de bordure interne */
		border-top: 1px solid hsl(var(--b2) / var(--tw-border-opacity)); /* Ligne de séparation avec la toolbar */
		border-top-left-radius: 0;
		border-top-right-radius: 0;
		outline: none;
		background-color: hsl(var(--b1)); /* Couleur de fond base-100 */
		padding: 1rem; /* Padding interne */
		flex-grow: 1;
		/* Très important pour le défilement DANS l'éditeur */
		overflow-y: auto;
		height: 100%; /* Prend la hauteur restante définie par editor-wrapper */
		color: hsl(var(--bc)); /* Couleur du texte */
	}
	:global(.tipex-editor-instance .ProseMirror p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: hsl(var(--bc) / 0.5);
		pointer-events: none;
		height: 0;
	}

	/* Style pour les séparateurs horizontaux (hr) dans l'éditeur */
	:global(.tipex-editor-instance hr) {
		margin-top: 1.5rem !important;
		margin-bottom: 1.5rem;
		border-top-width: 1px;
		border-color: hsl(var(--b2));
	}

	/* Style pour le contenu en lecture seule (si isEditing devient false) */
	.document-content {
		padding: 1rem;
		overflow-y: auto;
		min-height: 400px;
		max-height: 70vh;
		max-width: none;
		width: 100%;
		color: hsl(var(--bc));
	}
</style>
