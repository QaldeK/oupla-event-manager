<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Tipex, defaultExtensions } from '@friendofsvelte/tipex';
	import type { Editor, Extension } from '@tiptap/core';
	import { Collaboration } from '@tiptap/extension-collaboration';
	import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor';
	import {
		createPadUpdate,
		subscribeToPadUpdates,
		unsubscribeFromPadUpdates,
		updatePadContent
	} from '$lib/shared/padStore.svelte';
	import TipexToolbar from '$lib/components/TipexToolbar.svelte';
	import { pb } from '$lib/pocketbase.svelte';
	import * as Y from 'yjs';
	import '@friendofsvelte/tipex/styles/Tipex.css';
	import '@friendofsvelte/tipex/styles/ProseMirror.css';
	import '@friendofsvelte/tipex/styles/EditLink.css';

	interface Props {
		padId: string;
		initialContentUrl?: string;
		padTitle: string;
	}

	const { padId, initialContentUrl, padTitle } = $props<Props>();

	// État de l'éditeur
	let editor: Editor | undefined = $state();
	let isInitialized = $state(false);
	let isSaving = $state(false);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let debounceTimer: ReturnType<typeof setTimeout>;
	let yDoc: Y.Doc;
	let yjsContentType = 'tipex-document';
	let tipexExtensions: Extension[] = [];
	// Couleurs pour les curseurs collaboratifs (aléatoires pour chaque utilisateur)
	const colors = [
		'#ffcf40',
		'#58bc8a',
		'#ff8a65',
		'#795548',
		'#f44336',
		'#e91e63',
		'#9c27b0',
		'#673ab7',
		'#3f51b5',
		'#2196f3',
		'#03a9f4',
		'#00bcd4',
		'#009688',
		'#4caf50',
		'#8bc34a',
		'#cddc39'
	];

	// Attribuer une couleur aléatoire à l'utilisateur actuel
	const userColor = colors[Math.floor(Math.random() * colors.length)];
	const username = pb.authStore.model?.username || 'Utilisateur';

	// Fonction pour initialiser l'éditeur avec Yjs
	async function initializeEditor() {
		try {
			isLoading = true;
			error = null;

			// Créer le document Yjs
			yDoc = new Y.Doc();

			// Si nous avons une URL initiale, charger l'état Yjs
			if (initialContentUrl) {
				try {
					const response = await fetch(initialContentUrl);
					if (response.ok) {
						const buffer = await response.arrayBuffer();
						if (buffer.byteLength > 0) {
							// Appliquer l'état au document Yjs
							Y.applyUpdate(yDoc, new Uint8Array(buffer));
						}
					}
				} catch (e) {
					console.warn("Impossible de charger l'état initial, démarrage avec un document vide", e);
				}
			}

			// Configuration des extensions pour Tiptap
			const tipexExtensions = [
				...defaultExtensions,
				Collaboration.configure({
					document: yDoc,
					field: yjsContentType
				}),
				CollaborationCursor.configure({
					provider: null, // On n'utilise pas un provider standard
					user: {
						name: username,
						color: userColor
					}
				})
			];

			// Configuration de Tipex terminée, maintenant attendre qu'il soit monté
			isInitialized = true;

			// Configurer les écouteurs pour les mises à jour Yjs
			setupYjsListeners();
		} catch (e) {
			error = "Erreur lors de l'initialisation de l'éditeur";
			console.error(e);
		} finally {
			isLoading = false;
		}
	}

	// Fonction pour configurer les écouteurs Yjs
	function setupYjsListeners() {
		if (!yDoc) return;

		// Écouter les mises à jour locales et les envoyer au serveur
		yDoc.on('update', (update, origin) => {
			// Si l'origine est notre propre mécanisme de synchronisation, ne pas renvoyer
			if (origin === 'sync-provider') return;

			// Envoyer la mise à jour à PocketBase
			const updateBlob = new Blob([update], { type: 'application/octet-stream' });
			const clientId = yDoc.clientID.toString();

			createPadUpdate(padId, updateBlob, clientId).catch((err) => {
				console.error("Erreur lors de l'envoi d'une mise à jour au serveur:", err);
			});

			// Planifier la sauvegarde de l'état complet après un délai
			scheduleSaveFullState();
		});

		// S'abonner aux mises à jour distantes via PocketBase
		subscribeToPadUpdates(padId, async (data) => {
			// Vérifier que ce n'est pas notre propre mise à jour
			if (data.clientId === yDoc.clientID.toString()) return;

			try {
				// Récupérer le contenu binaire de la mise à jour
				const updateUrl = pb.file.getUrl(data, data.updateData);
				const response = await fetch(updateUrl);
				if (!response.ok) throw new Error('Impossible de récupérer la mise à jour');

				const buffer = await response.arrayBuffer();

				// Appliquer la mise à jour au document Yjs local
				Y.applyUpdate(yDoc, new Uint8Array(buffer), 'sync-provider');
			} catch (err) {
				console.error("Erreur lors de l'application d'une mise à jour distante:", err);
			}
		});
	}

	// Fonction pour planifier la sauvegarde de l'état complet
	function scheduleSaveFullState() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(saveFullState, 5000); // Sauvegarder après 5 secondes d'inactivité
	}

	// Fonction pour sauvegarder l'état complet du document
	async function saveFullState() {
		if (!yDoc || isSaving) return;

		isSaving = true;
		try {
			// Encoder l'état complet du document Yjs
			const fullState = Y.encodeStateAsUpdate(yDoc);
			const stateBlob = new Blob([fullState], { type: 'application/octet-stream' });

			// Mettre à jour l'enregistrement du pad avec l'état complet
			await updatePadContent(padId, stateBlob);
			console.log('État complet du document sauvegardé avec succès');
		} catch (err) {
			console.error("Erreur lors de la sauvegarde de l'état complet:", err);
		} finally {
			isSaving = false;
		}
	}

	// Initialiser l'éditeur au chargement du composant
	$effect(() => {
		initializeEditor();
	});

	// Se désabonner lors de la destruction du composant
	onDestroy(() => {
		// Sauvegarder l'état final avant de quitter
		if (yDoc) {
			saveFullState();
		}

		// Se désabonner des mises à jour
		unsubscribeFromPadUpdates();

		// Supprimer les écouteurs Yjs
		if (yDoc) {
			yDoc.destroy();
		}

		// Nettoyer les timers
		clearTimeout(debounceTimer);
	});
</script>

<div class="pad-editor-container">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">{padTitle}</h1>

		<div class="status-indicator flex items-center gap-2">
			{#if isSaving}
				<span class="loading loading-spinner loading-xs"></span>
				<span class="text-base-content/70 text-sm">Enregistrement...</span>
			{:else}
				<span class="text-success text-sm">Connecté</span>
			{/if}
		</div>
	</div>

	{#if error}
		<div class="alert alert-error mb-4">
			<span>{error}</span>
		</div>
	{/if}

	<div
		class="editor-wrapper bg-base-100 overflow-hidden rounded-lg shadow-md"
		style="min-height: 500px; height: 75vh;"
	>
		{#if isLoading}
			<div class="flex h-full items-center justify-center">
				<span class="loading loading-dots loading-lg"></span>
			</div>
		{:else if isInitialized}
			<Tipex
				bind:tipex={editor}
				extensions={tipexExtensions}
				controls={false}
				class="h-full w-full"
				focal={false}
			>
				{#snippet head(tipexInstance)}
					<TipexToolbar editor={tipexInstance} />
				{/snippet}
			</Tipex>
		{/if}
	</div>
</div>

<style>
	/* Styles pour l'éditeur collaboratif */
	:global(.tipex .ProseMirror) {
		padding: 1rem;
		min-height: calc(75vh - 60px); /* Hauteur moins la barre d'outils */
		overflow-y: auto;
		outline: none;
		background-color: white;
	}

	:global(.tipex-editor-wrap) {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	:global(.tipex-editor-section) {
		flex-grow: 1;
		overflow-y: auto;
		min-height: 0;
	}

	/* Styles pour les curseurs collaboratifs */
	:global(.collaboration-cursor__caret) {
		position: relative;
		border-left: 1px solid currentColor;
		margin-left: -1px;
		margin-right: -1px;
		word-break: normal;
		pointer-events: none;
	}

	:global(.collaboration-cursor__label) {
		position: absolute;
		top: -1.4em;
		left: -1px;
		font-size: 12px;
		font-weight: 600;
		line-height: normal;
		white-space: nowrap;
		color: white;
		padding: 0.1rem 0.3rem;
		border-radius: 3px 3px 3px 0;
		user-select: none;
		pointer-events: none;
	}
</style>
