<script lang="ts">
	import {
		createDocumentEditManager,
		INACTIVITY_TIMEOUT_MS
	} from "$lib/shared/documentEditManager.svelte";
	import type { SitePagesRecord } from "$lib/types/pocketbase";
	import { defaultExtensions, Tipex, type TipexEditor } from "@friendofsvelte/tipex";
	import "@friendofsvelte/tipex/styles/index.css";

	import { AlertCircle, Eye, EyeOff, Info } from "lucide-svelte";
	import * as sitePageStore from "../sitePageStore.svelte";
	import SimpleTiptapToolbar from "$lib/components/SimpleTiptapToolbar.svelte";
	import type { RecordModel } from "pocketbase";

	// Interface pour les props
	interface Props {
		docId: string;
		initialEditMode?: boolean;
	}

	const { docId, initialEditMode = true }: Props = $props();
	const collectionName = "site_pages";

	// Préparer les actions pour le store éditable
	const sitePageActions = {
		loadDoc: (id: string) => sitePageStore.loadDoc(id),
		updateDoc: (id: string, data: Partial<SitePagesRecord>) => sitePageStore.updatePad(id, data),
		acquireLock: (id: string) => sitePageStore.acquirePadLock(id),
		releaseLock: (id: string) => sitePageStore.releasePadLock(id),
		refreshLock: (id: string) => sitePageStore.refreshPadLock(id)
	};

	// Créer l'instance du store éditable
	const editableDoc = createDocumentEditManager<RecordModel>({
		docId,
		collectionName,
		actions: sitePageActions,
		fieldsToSave: ["title", "content", "componentConfig"],
		initialEditMode: initialEditMode
	});

	let doc = $derived(editableDoc.doc);
	let isLoading = $derived(editableDoc.isLoading);
	let isEditing = $derived(editableDoc.isEditing);
	let isLockedByOther = $derived(editableDoc.isLockedByOther);
	let error = $derived(editableDoc.error);
	let lockStatusMessage = $derived(editableDoc.lockStatusMessage);

	// États locaux
	let tipexEditor: TipexEditor | undefined = $state();
	let editedTitle = $state("");

	// Synchroniser editedTitle avec doc.title quand le doc change
	$effect(() => {
		if (doc) editedTitle = doc.title ?? "";
	});

	let content = $derived(doc?.content ?? "");

	let uiOptions = $derived.by(() => {
		const defaultOptions = {
			bgColor: "bg-base-100",
			showTitle: true,
			textColor: "text-base-content"
		};

		if (!doc) return defaultOptions;
		return { ...defaultOptions, ...(doc.componentConfig || {}) };
	});

	// État temporaire (local) pour les modifications d'UI options
	// Utilisé pour retarder les mises à jour et éviter les boucles
	let pendingUiChanges = $state<Record<string, unknown>>({});

	// Synchronisation du contenu Tipex uniquement quand on passe en lecture
	$effect(() => {
		if (!isEditing && tipexEditor && doc?.content !== tipexEditor.getHTML()) {
			tipexEditor.commands.setContent(doc?.content ?? "", false);
		}
	});

	// Nettoyage à la destruction du composant
	$effect(() => () => editableDoc.dispose());

	// Handler pour la modification du titre
	function handleTitleInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		editedTitle = value;
		editableDoc.updateField("title", value);
	}

	export async function save() {
		await editableDoc.saveChanges();
	}

	function getCurrentValue(key: keyof typeof uiOptions) {
		// Utilise Object.hasOwn pour vérifier la présence de la clé de manière sécurisée
		if (Object.hasOwn(pendingUiChanges, key)) {
			return pendingUiChanges[key as string];
		}
		return uiOptions[key];
	}

	function updateUIOption(key: string, value: unknown) {
		if (!editableDoc.doc) return;
		const currentConfig = editableDoc.doc.componentConfig || {};
		const newConfig = { ...currentConfig, [key]: value };
		editableDoc.updateField("componentConfig", newConfig);
	}
</script>

<div
	class="flex h-svh w-full flex-col md:h-96"
	role="region"
	aria-label="Éditeur de contenu de site"
>
	<!-- Affichage des erreurs et status -->
	{#if error}
		<div role="alert" class="alert alert-error mb-4 shadow-md" aria-live="assertive">
			<AlertCircle />
			<span>{error}</span>
			<button class="btn btn-sm btn-ghost" onclick={editableDoc.clearError}>Fermer</button>
		</div>
	{/if}

	<!-- Entête avec titre -->
	{#if isLockedByOther || !isEditing}
		<!-- Affichage lecture seule si lock pris par un autre utilisateur -->
		<div class="mb-2 flex flex-wrap items-center justify-between gap-4">
			<div class="flex flex-grow flex-wrap items-center gap-2">
				<div class="truncate text-lg font-semibold sm:min-w-[300px]">
					{editedTitle}
				</div>
			</div>
		</div>
	{:else}
		<!-- Mode édition -->
		<div class="mb-2 flex flex-wrap items-center justify-between gap-4">
			<div class="flex flex-grow flex-wrap items-center gap-2">
				<input
					type="text"
					class="input input-bordered flex-grow text-lg font-semibold sm:min-w-[300px]"
					placeholder="Titre du bloc/page"
					bind:value={editedTitle}
					oninput={handleTitleInput}
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
	{/if}

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
	{#if isLoading && !doc}
		<div class="flex min-h-[300px] items-center justify-center p-10">
			<span class="loading loading-dots loading-lg"></span>
			<span class="ml-4">Chargement du contenu...</span>
		</div>
	{:else if !editableDoc.doc && !editableDoc.isLoading}
		<div role="alert" class="alert alert-warning mb-4">
			<AlertCircle /> <span>Document non trouvé ou erreur de chargement.</span>
		</div>
	{:else}
		<!-- Wrapper pour l'éditeur ou l'aperçu -->
		<div class="bg-base-100 flex h-full flex-col rounded-lg border shadow-md">
			{#if isLockedByOther || !isEditing}
				<!-- Aperçu lecture seule si lock pris OU si lock dispo mais pas encore repris -->
				<div class="flex flex-1 flex-col justify-between overflow-hidden rounded-lg">
					<div class="prose max-w-none overflow-y-auto p-4">
						{@html content || "<p><em>Ce bloc est vide.</em></p>"}
					</div>
					{#if isLockedByOther}
						<div>
							<div
								role="alert"
								class="alert alert-warning rounded-t-none rounded-b-md"
								aria-live="assertive"
							>
								<Info />
								<span>{lockStatusMessage} (Mode lecture seule)</span>
							</div>
						</div>
					{:else}
						<div
							class="alert alert-info flex items-center justify-between rounded-t-none rounded-b-md"
						>
							<Info />
							<span
								>{lockStatusMessage || "Le document est maintenant disponible pour édition."}</span
							>
							<button
								class="btn btn-outline btn-sm ml-4"
								onclick={() => editableDoc.startEditing()}
							>
								Éditer
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Mode édition -->
				<div class="flex-1 overflow-hidden">
					<Tipex
						bind:tipex={tipexEditor}
						extensions={[...defaultExtensions]}
						class="h-full"
						body={content}
						autofocus={false}
						floating={false}
						focal={false}
						onupdate={() => {
							if (isEditing && tipexEditor) {
								editableDoc.updateField("content", tipexEditor.getHTML());
							}
						}}
					>
						{#snippet head(tipexEditor)}
							<!-- Barre d'outils personnalisée -->
							<SimpleTiptapToolbar editor={tipexEditor} />
						{/snippet}
						{#snippet controlComponent()}{/snippet}
						{#snippet foot()}
							<div class="text-base-content/60 p-1 text-xs">
								Déconnexion automatique après {Math.round(INACTIVITY_TIMEOUT_MS / 60000)} min d'inactivité.
							</div>
						{/snippet}
					</Tipex>
				</div>
			{/if}
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
</style>
