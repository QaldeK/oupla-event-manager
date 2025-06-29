<script lang="ts">
	import { Tipex, defaultExtensions, type TipexEditor } from "@friendofsvelte/tipex";
	import { TextAlign } from "@tiptap/extension-text-align";
	import TipexToolbar from "$lib/components/TipexToolbar.svelte";
	import "@friendofsvelte/tipex/styles/Tipex.css";
	import "@friendofsvelte/tipex/styles/ProseMirror.css";
	import "@friendofsvelte/tipex/styles/EditLink.css";
	import {
		createEditableDocumentStore,
		INACTIVITY_TIMEOUT_MS
	} from "$lib/shared/editableDocumentStore.svelte";
	import * as sitePageStore from "$lib/shared/sitePageStore.svelte";
	import type { SitePagesResponse } from "$lib/types/pocketbase";
	import { AlertCircle, Info, Save, Eye, EyeOff } from "lucide-svelte";
	import ColorSelect from "$lib/components/ColorSelect.svelte";

	// Interface pour les props
	interface Props {
		docId: string;
		onClose?: () => void;
		initialEditMode?: boolean;
	}

	const { docId, onClose: onClose, initialEditMode = true }: Props = $props();
	const collectionName = "site_pages";

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
		fieldsToSave: ["title", "content", "section", "componentConfig"],
		initialEditMode: initialEditMode
	});

	// États locaux
	let tipexEditor: TipexEditor | undefined = $state();

	// États dérivés
	let title = $derived(editableDoc.doc?.title ?? "");
	let content = $derived(editableDoc.doc?.content ?? "");

	let uiOptions = $derived.by(() => {
		const defaultOptions = {
			bgColor: "bg-base-100",
			showTitle: true,
			textColor: "text-base-content"
		};

		if (!editableDoc.doc) return defaultOptions;
		return { ...defaultOptions, ...(editableDoc.doc.componentConfig || {}) };
	});

	// État temporaire (local) pour les modifications d'UI options
	// Utilisé pour retarder les mises à jour et éviter les boucles
	let pendingUiChanges = $state<Record<string, any>>({});

	// Extensions Tipex
	const tipexExtensions = [
		...defaultExtensions,
		TextAlign.configure({ types: ["heading", "paragraph"] })
	];

	// Synchroniser Tipex lorsque le contenu change via le store (ex: subscription) ET qu'on n'édite pas
	$effect(() => {
		if (!tipexEditor || editableDoc.isLoading || editableDoc.isEditing) {
			return;
		}

		const currentStoreContent = editableDoc.doc?.content ?? "";
		if (tipexEditor.getHTML() !== currentStoreContent) {
			console.log(`[PageBlockEditor ${docId}] Syncing Tipex with store content.`);
			tipexEditor.commands.setContent(currentStoreContent, false);
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

		if (tipexEditor && tipexEditor.getHTML() !== editableDoc.doc.content) {
			changes.content = tipexEditor.getHTML();
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
				console.log("[PageBlockEditor] Sauvegarde manuelle réussie");

				// Réinitialiser les changements en attente
				pendingUiChanges = {};

				// Libérer le verrou (sans sauvegarde supplémentaire, déjà fait)
				await editableDoc.stopEditing(false);
			} catch (error) {
				console.error("[PageBlockEditor] Erreur lors de la sauvegarde:", error);
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
		if (key === "bgColor") {
			const selectedBgColor = bgColorOptions.find((option) => option.value === value);
			if (selectedBgColor) {
				pendingUiChanges = { ...pendingUiChanges, textColor: selectedBgColor.textColor };
			}
		}

		// Note: Les changements ne seront appliqués qu'à la sauvegarde manuelle
	}
</script>

<div class="flex h-full w-full flex-col" role="region" aria-label="Éditeur de contenu de site">
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
		<!-- Option Afficher le titre -->
		<div class="form-control">
			<label class="label cursor-pointer justify-start gap-4">
				<span class="label-text font-medium">Afficher le titre</span>
				<input
					type="checkbox"
					class="toggle toggle-primary"
					checked={getCurrentValue("showTitle")}
					onclick={() => updateUIOption("showTitle", !getCurrentValue("showTitle"))}
				/>
				{#if getCurrentValue("showTitle")}
					<Eye size={16} />
				{:else}
					<EyeOff size={16} />
				{/if}
			</label>
		</div>
	</div>

	<!-- Panneau d'options UI -->
	<!-- <div class="border-base-300 bg-base-200 mb-4 rounded-md border p-4 shadow-sm">
		<h3 class="mb-3 text-sm font-semibold">Options d'apparence du bloc</h3>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
		</div>
	</div> -->

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
		<div class="bg-base-100 flex h-full flex-col rounded-lg border shadow-md">
			{#if editableDoc.isEditing || editableDoc.isLockedByOther}
				<div class="bg-base-200 flex flex-shrink-0 items-center">
					<TipexToolbar editor={tipexEditor} onSaveAndClose={handleSaveAndClose} />
				</div>
				<div class="flex-1 overflow-hidden">
					<Tipex
						bind:tipex={tipexEditor}
						extensions={[...defaultExtensions]}
						controls={false}
						class="h-full"
						body={content}
						autofocus={false}
						floating={false}
						focal={false}
					></Tipex>
				</div>
			{/if}
		</div>
		{#if editableDoc.isEditing}
			<div class="text-base-content/70 mt-2 text-xs">
				Déconnexion automatique après {Math.round(INACTIVITY_TIMEOUT_MS / 60000)} min d'inactivité.
			</div>
		{/if}
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
</style>
