<script lang="ts">
	import { Tipex, defaultExtensions } from '@friendofsvelte/tipex';
	import { TextAlign } from '@tiptap/extension-text-align';
	import type { TipexEditor } from '@friendofsvelte/tipex';
	import TipexToolbar from '$lib/components/TipexToolbar.svelte';
	import {
		createEditableDocumentStore,
		INACTIVITY_TIMEOUT_MS
	} from '$lib/shared/editableDocumentStore.svelte';
	import * as sitePageStore from '$lib/shared/sitePageStore.svelte';
	import type { SitePagesResponse } from '$lib/types/pocketbase';
	import { AlertCircle, Info, Save, Eye, EyeOff } from 'lucide-svelte';
	import ColorSelect from '$lib/components/ColorSelect.svelte';

	// Interface pour les props
	interface Props {
		docId: string;
		onClose?: () => void;
		initialEditMode?: boolean;
	}

	const { docId, onClose: onClose, initialEditMode = true }: Props = $props();
	const collectionName = 'site_pages';

	// Préparer les actions pour le store éditable
	const sitePageActions = {
		loadDoc: (id: string) => sitePageStore.loadDoc(id),
		updateDoc: (id: string, data: Partial<SitePagesResponse>) => sitePageStore.updatePad(id, data),
		acquireLock: (id: string) => sitePageStore.acquirePadLock(id),
		releaseLock: (id: string) => sitePageStore.releasePadLock(id),
		refreshLock: (id: string) => sitePageStore.refreshPadLock(id)
	};

	// Créer l'instance du store éditable
	const editableDoc = createEditableDocumentStore<SitePagesResponse>({
		docId,
		collectionName,
		actions: sitePageActions,
		fieldsToSave: ['title', 'content', 'section', 'componentConfig'],
		initialEditMode: initialEditMode
	});

	// États locaux
	let editor: TipexEditor | undefined = $state();
	let showUIOptions = $state(false);

	// États dérivés
	let title = $derived(editableDoc.doc?.title ?? '');
	let content = $derived(editableDoc.doc?.content ?? '');

	let uiOptions = $derived.by(() => {
		const defaultOptions = {
			bgColor: 'bg-base-100',
			showTitle: true,
			textColor: 'text-base-content'
		};

		if (!editableDoc.doc) return defaultOptions;
		return { ...defaultOptions, ...(editableDoc.doc.componentConfig || {}) };
	});

	let currentBgColor = $derived.by(() => getCurrentValue('bgColor'));

	// État temporaire (local) pour les modifications d'UI options
	// Utilisé pour retarder les mises à jour et éviter les boucles
	let pendingUiChanges = $state<Record<string, any>>({});

	// Liste des options de couleurs de fond disponibles
	const bgColorOptions = [
		{
			value: 'bg-base-100',
			label: 'Fond principal',
			color: 'base-100',
			textColor: 'text-base-content'
		},
		{
			value: 'bg-base-200',
			label: 'Fond secondaire',
			color: 'base-200',
			textColor: 'text-base-content'
		},
		{
			value: 'bg-base-300',
			label: 'Fond tertiaire',
			color: 'base-300',
			textColor: 'text-base-content'
		},
		{ value: 'bg-neutral', label: 'Neutre', color: 'neutral', textColor: 'text-neutral-content' },
		{ value: 'bg-primary', label: 'Primaire', color: 'primary', textColor: 'text-primary-content' },
		{
			value: 'bg-secondary',
			label: 'Secondaire',
			color: 'secondary',
			textColor: 'text-secondary-content'
		},
		{ value: 'bg-accent', label: 'Accent', color: 'accent', textColor: 'text-accent-content' },
		{
			value: 'bg-warning',
			label: 'Avertissement',
			color: 'warning',
			textColor: 'text-warning-content'
		},
		{ value: 'bg-error', label: 'Erreur', color: 'error', textColor: 'text-error-content' },
		{ value: 'bg-success', label: 'Succès', color: 'success', textColor: 'text-success-content' },
		{
			value: 'bg-primary/10',
			label: 'Primaire (10%)',
			color: 'primary',
			textColor: 'text-primary-content'
		},
		{
			value: 'bg-secondary/10',
			label: 'Secondaire (10%)',
			color: 'secondary',
			textColor: 'text-secondary-content'
		},
		{
			value: 'bg-transparent',
			label: 'Transparent',
			color: 'transparent',
			textColor: 'text-base-content'
		},
		{ value: 'bg-white', label: 'Blanc', color: 'white', textColor: 'text-base-content' }
	];

	// Extensions Tipex
	const tipexExtensions = [
		...defaultExtensions,
		TextAlign.configure({ types: ['heading', 'paragraph'] })
	];

	// Synchroniser Tipex lorsque le contenu change via le store (ex: subscription) ET qu'on n'édite pas
	$effect(() => {
		if (!editor || editableDoc.isLoading || editableDoc.isEditing) {
			return;
		}

		const currentStoreContent = editableDoc.doc?.content ?? '';
		if (editor.getHTML() !== currentStoreContent) {
			console.log(`[PageBlockEditor ${docId}] Syncing Tipex with store content.`);
			editor.commands.setContent(currentStoreContent, false);
		}
	});

	// Nettoyage à la destruction du composant
	$effect(() => {
		return () => {
			editableDoc.dispose();
		};
	});

	function collectAllChanges() {
		if (!editableDoc.doc) return {};

		const changes: Partial<SitePagesResponse> = {};

		// Récupérer les valeurs actuelles de l'éditeur et du titre
		if (title !== editableDoc.doc.title) {
			changes.title = title;
		}

		if (editor && editor.getHTML() !== editableDoc.doc.content) {
			changes.content = editor.getHTML();
		}

		// Intégrer les modifications d'UI en attente
		if (Object.keys(pendingUiChanges).length > 0) {
			const currentUiPage = editableDoc.doc.componentConfig || {};
			changes.componentConfig = { ...currentUiPage, ...pendingUiChanges };
		}

		return changes;
	}

	async function handleSaveAndClose() {
		if (!editableDoc.isEditing) return;

		const changes = collectAllChanges();

		// Ne sauvegarder que s'il y a des changements
		if (Object.keys(changes).length > 0) {
			try {
				// Mise à jour du document avec tous les changements en une seule fois
				await sitePageActions.updateDoc(docId, changes);
				console.log('[PageBlockEditor] Sauvegarde manuelle réussie');

				// Réinitialiser les changements en attente
				pendingUiChanges = {};

				// Libérer le verrou (sans sauvegarde supplémentaire, déjà fait)
				await editableDoc.stopEditing(false);
			} catch (error) {
				console.error('[PageBlockEditor] Erreur lors de la sauvegarde:', error);
				// L'erreur sera affichée via l'état error du store
			}
		} else {
			// Pas de changements, juste libérer le verrou
			await editableDoc.stopEditing(false);
		}

		// Appeler le callback si fourni
		if (onClose) {
			onClose();
		}
	}

	function getCurrentValue(key: keyof typeof uiOptions) {
		// Utilise Object.hasOwn pour vérifier la présence de la clé de manière sécurisée
		if (Object.hasOwn(pendingUiChanges, key)) {
			return pendingUiChanges[key];
		}
		return uiOptions[key];
	}

	function updateUIOption(key: string, value: any) {
		if (!editableDoc.doc) return;

		// Mise à jour locale uniquement, pas de sauvegarde immédiate
		pendingUiChanges = { ...pendingUiChanges, [key]: value };

		// Si bgColor change, mettre à jour automatiquement textColor
		if (key === 'bgColor') {
			const selectedBgColor = bgColorOptions.find((option) => option.value === value);
			if (selectedBgColor) {
				pendingUiChanges = { ...pendingUiChanges, textColor: selectedBgColor.textColor };
			}
		}

		// Note: Les changements ne seront appliqués qu'à la sauvegarde manuelle
	}
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

	<!-- Entête avec titre -->
	<div class="bg-base-200 mb-4 flex flex-wrap items-center justify-between gap-4 rounded-t-lg p-3">
		<div class="flex flex-grow flex-wrap items-center gap-2">
			<input
				type="text"
				class="input input-bordered flex-grow text-lg font-semibold sm:min-w-[300px]"
				placeholder="Titre du bloc/page"
				value={title}
				disabled={!editableDoc.isEditing || editableDoc.isLoading || editableDoc.isSaving}
				aria-label="Titre du contenu"
			/>
		</div>
	</div>

	<!-- Panneau d'options UI -->
	<div class="border-base-300 bg-base-200 mb-4 rounded-md border p-4 shadow-sm">
		<h3 class="mb-3 text-sm font-semibold">Options d'apparence du bloc</h3>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<!-- Option Couleur de fond -->
			<div class="form-control">
				<label class="label" for="block-bg-color">
					<span class="label-text font-medium">Couleur de fond</span>
				</label>
				<ColorSelect
					id="block-bg-color"
					options={bgColorOptions}
					bind:value={pendingUiChanges.bgColor}
				/>
			</div>

			<!-- Option Afficher le titre -->
			<div class="form-control">
				<label class="label cursor-pointer justify-start gap-4">
					<span class="label-text font-medium">Afficher le titre</span>
					<input
						type="checkbox"
						class="toggle toggle-primary"
						checked={getCurrentValue('showTitle')}
						onclick={() => updateUIOption('showTitle', !getCurrentValue('showTitle'))}
					/>
					{#if getCurrentValue('showTitle')}
						<Eye size={16} />
					{:else}
						<EyeOff size={16} />
					{/if}
				</label>
			</div>
		</div>
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
		<!-- Prévisualisation d'apparence du bloc -->
		{#if showUIOptions && editableDoc.isEditing}
			<div class="border-base-300 mb-4 rounded-md border border-dashed p-2">
				<h4 class="text-base-content/60 mb-2 text-xs font-medium">Prévisualisation</h4>
				<div class="rounded-md {getCurrentValue('bgColor')} p-4 shadow-sm">
					{#if getCurrentValue('showTitle')}
						<h2 class="mb-4 text-xl font-bold {getCurrentValue('textColor')}">
							{title || 'Titre du bloc'}
						</h2>
					{/if}
					<div class="{getCurrentValue('textColor')} opacity-70">
						Prévisualisation du contenu du bloc...
					</div>
				</div>
			</div>
		{/if}

		<!-- Wrapper pour l'éditeur Tipex -->
		<div class="editor-wrapper bg-base-100 rounded-b-lg border border-t-0 shadow-md">
			{#if editableDoc.isEditing || editableDoc.isLockedByOther}
				<TipexToolbar {editor} disabled={!editableDoc.isEditing || editableDoc.isSaving} />
			{/if}
			<Tipex
				bind:tipex={editor as TipexEditor}
				extensions={tipexExtensions}
				controls={false}
				class="tipex-editor-instance flex-grow"
				body={content}
				editable={editableDoc.isEditing && !editableDoc.isSaving}
			/>
		</div>
		{#if editableDoc.isEditing}
			<div class="text-base-content/70 mt-2 text-xs">
				Déconnexion automatique après {Math.round(INACTIVITY_TIMEOUT_MS / 60000)} min d'inactivité.
			</div>
		{/if}
	{/if}

	<div class="flex justify-end">
		<!-- Bouton Enregistrer -->
		<button
			class="btn btn-primary mt-4"
			onclick={handleSaveAndClose}
			disabled={!editableDoc.isEditing || editableDoc.isLoading || editableDoc.isSaving}
			title="Enregistrer les modifications"
		>
			{#if editableDoc.isSaving}
				<span class="loading loading-spinner loading-xs"></span> Sauvegarde...
			{:else}
				<Save size={16} /> Enregistrer et Fermer
			{/if}
		</button>
	</div>
</div>

<style>
	.simple-editor-container {
		/* Ajoutez des styles de conteneur si nécessaire */
	}
	.editor-wrapper {
		display: flex;
		flex-direction: column;
		min-height: 400px;
		max-height: 70vh;
		overflow: hidden;
	}

	:global(.tipex-editor-instance .ProseMirror) {
		border: none;
		border-top: 1px solid hsl(var(--b2) / var(--tw-border-opacity));
		border-top-left-radius: 0;
		border-top-right-radius: 0;
		outline: none;
		background-color: hsl(var(--b1));
		padding: 1rem;
		flex-grow: 1;
		overflow-y: auto;
		height: 100%;
		color: hsl(var(--bc));
	}
	:global(.tipex-editor-instance .ProseMirror p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: hsl(var(--bc) / 0.5);
		pointer-events: none;
		height: 0;
	}

	:global(.tipex-editor-instance hr) {
		margin-top: 1.5rem !important;
		margin-bottom: 1.5rem;
		border-top-width: 1px;
		border-color: hsl(var(--b2));
	}

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
