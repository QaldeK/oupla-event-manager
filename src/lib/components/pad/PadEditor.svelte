<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Tipex } from '@friendofsvelte/tipex';
	import type { Editor, Extension } from '@tiptap/core';
	import { Collaboration } from '@tiptap/extension-collaboration';
	// Désactivation de CollaborationCursor en raison de problèmes avec le provider null
	// import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor';
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
	let autoSaveTimer: ReturnType<typeof setInterval>;
	let yDoc: Y.Doc | undefined = $state(); // 👉 Initialiser à undefined pour vérifier sa création

	// Utiliser un nom de type unique spécifique à ce pad pour éviter les conflits
	const yjsContentType = `oupla-pad-${padId}`;

	let tipexExtensions: Extension[] = $state([]); // 👉 Initialiser comme $state pour la réactivité si nécessaire

	// Couleurs pour les curseurs collaboratifs (aléatoires pour chaque utilisateur)
	// ... reste des couleurs inchangé ...

	// Attribuer une couleur aléatoire à l'utilisateur actuel
	// ... reste de l'attribution inchangé ...

	// Fonction pour initialiser l'éditeur avec Yjs
	async function initializeEditor() {
		// 👉 Réinitialisation plus propre au début
		isLoading = true;
		error = null;
		isInitialized = false;
		yDoc = undefined;
		tipexExtensions = [];

		try {
			console.log(`Initialisation de l'éditeur pour padId: ${padId}`);

			// Créer un nouveau document Yjs
			yDoc = new Y.Doc();
			console.log(`Nouveau Y.Doc créé, clientID: ${yDoc.clientID}`);

			// Créer explicitement le type de texte pour ce document AVANT de configurer Collaboration
			const yText = yDoc.getText(yjsContentType);
			console.log(`Type de texte Yjs créé: ${yjsContentType}, longueur initiale: ${yText.length}`);

			// Si nous avons une URL initiale, charger l'état Yjs
			if (initialContentUrl) {
				try {
					console.log("Chargement de l'état initial depuis:", initialContentUrl);
					const response = await fetch(initialContentUrl);
					if (response.ok) {
						const buffer = await response.arrayBuffer();
						if (buffer.byteLength > 0) {
							console.log(`État initial chargé (${buffer.byteLength} octets)`);
							// Appliquer l'état au document Yjs
							// 👉 Utiliser 'load' comme origine pour potentiellement l'ignorer dans les listeners si nécessaire
							Y.applyUpdate(yDoc, new Uint8Array(buffer), 'load');
							console.log(`État chargé: document contient ${yText.length} caractères`);
						} else {
							console.warn('État initial vide reçu du serveur.');
						}
					} else {
						console.warn(
							`Échec du chargement de l'état initial: ${response.status} ${response.statusText}`
						);
						// Ne pas considérer cela comme une erreur bloquante, continuer avec un doc vide
					}
				} catch (e) {
					console.error("Erreur lors du chargement ou de l'application de l'état initial:", e);
					// Ne pas considérer cela comme une erreur bloquante, continuer avec un doc vide
				}
			} else {
				console.log("Pas d'URL d'état initial, démarrage avec un document vide.");
			}

			// 👉 Configuration des extensions Tiptap/Yjs SANS setTimeout
			console.log(`Configuration de Yjs Collaboration avec le champ "${yjsContentType}"`);
			tipexExtensions = [
				Collaboration.configure({
					document: yDoc,
					field: yjsContentType
					// 👉 Supprimer le onUpdate ici, on utilisera yDoc.on('update')
				})
				// CollaborationCursor peut être ajouté ici si vous le réactivez
				// CollaborationCursor.configure({
				//   provider: null, // Nécessite un vrai provider (ex: Hocuspocus, Tiptap Collab)
				//   user: { name: username, color: userColor },
				// }),
			];

			console.log('Extensions Tipex configurées:', tipexExtensions);

			// Configurer les écouteurs pour les mises à jour Yjs AVANT de marquer comme initialisé
			setupYjsListeners();

			// Marquer comme initialisé SEULEMENT APRÈS que tout soit prêt
			isInitialized = true;
			console.log('Éditeur marqué comme initialisé.');

			// Sauvegarde automatique périodique
			autoSaveTimer = setInterval(() => {
				// 👉 Appeler saveFullState seulement si l'éditeur est prêt
				if (isInitialized && yDoc) {
					saveFullState();
				}
			}, 30000); // Sauvegarder toutes les 30 secondes
		} catch (e) {
			error = `Erreur critique lors de l'initialisation de l'éditeur: ${e instanceof Error ? e.message : String(e)}`;
			console.error(e);
			isInitialized = false; // Assurer que l'éditeur n'est pas marqué comme prêt
		} finally {
			isLoading = false;
		}
	}

	// Fonction pour configurer les écouteurs Yjs
	function setupYjsListeners() {
		if (!yDoc) {
			console.error('Tentative de configuration des listeners Yjs sans yDoc initialisé.');
			return;
		}

		console.log('Configuration des listeners Yjs...');

		// Écouter les mises à jour locales et les envoyer au serveur
		yDoc.on('update', (update: Uint8Array, origin: any) => {
			// console.log(`yDoc 'update' event: ${update.length} octets, origine: ${origin}`);

			// Ignorer les mises à jour provenant de l'application des updates distantes ou du chargement initial
			if (origin === 'sync-provider' || origin === 'load') {
				// console.log(` > Mise à jour ignorée (origine: ${origin})`);
				return;
			}

			// Envoyer la mise à jour incrémentielle à PocketBase
			const updateBlob = new Blob([update], { type: 'application/octet-stream' });
			const clientId = yDoc!.clientID.toString(); // yDoc est garanti d'exister ici

			// console.log(` > Envoi de la mise à jour incrémentielle (${update.length} octets)`);

			createPadUpdate(padId, updateBlob, clientId).catch((err) => {
				// TODO: Gérer l'erreur (ex: notifier l'utilisateur, réessayer ?)
				console.error("Erreur lors de l'envoi d'une mise à jour incrémentielle au serveur:", err);
			});

			// Planifier la sauvegarde de l'état complet après un délai d'inactivité
			scheduleSaveFullState();
		});

		// S'abonner aux mises à jour distantes via PocketBase
		// 👉 Assurez-vous que subscribeToPadUpdates gère correctement la désinscription précédente si nécessaire
		subscribeToPadUpdates(padId, async (data) => {
            if (!yDoc) {
                // console.warn("Réception d'une mise à jour distante mais yDoc n'est pas prêt.");
                return;
            }

			// Vérifier que ce n'est pas notre propre mise à jour (basé sur le clientId enregistré dans PocketBase)
			if (data.clientId === yDoc.clientID.toString()) {
				// console.log('Ignorer notre propre mise à jour distante.');
				return;
			}

			try {
				// Récupérer le contenu binaire de la mise à jour
				const updateUrl = pb.files.getUrl(data, data.updateData);
				// console.log(`Réception d'une mise à jour distante de ${data.clientId}, URL: ${updateUrl}`);

				const response = await fetch(updateUrl);
				if (!response.ok) {
					// Gérer le cas où l'URL n'est plus valide (ex: fichier supprimé)
					if (response.status === 404) {
						console.warn(`Impossible de récupérer la mise à jour distante (404): ${updateUrl}`);
						return; // Ne pas planter, juste ignorer cette mise à jour
					}
					throw new Error(`Impossible de récupérer la mise à jour (${response.status})`);
				}

				const buffer = await response.arrayBuffer();
                if (buffer.byteLength === 0) {
                    // console.warn('Mise à jour distante récupérée mais vide.');
                    return;
                }
                // console.log(`Mise à jour distante récupérée (${buffer.byteLength} octets)`);

				// Appliquer la mise à jour au document Yjs local
				// Utiliser 'sync-provider' comme origine pour l'ignorer dans le listener 'update' local
				Y.applyUpdate(yDoc, new Uint8Array(buffer), 'sync-provider');

                // Vérification (optionnelle mais utile pour le débogage)
                // const content = yDoc.getText(yjsContentType);
                // console.log(
                //  `Après application de la mise à jour distante: document contient ${content.length} caractères`
                // );
			} catch (err) {
				console.error("Erreur lors de l'application d'une mise à jour distante:", err);
				// TODO: Gérer l'erreur (ex: afficher une notification ?)
			}
		});
	}

	// Fonction pour planifier la sauvegarde de l'état complet
	function scheduleSaveFullState() {
		clearTimeout(debounceTimer);
		// 👉 Sauvegarder seulement si l'éditeur est prêt
		if (isInitialized && yDoc) {
			debounceTimer = setTimeout(saveFullState, 5000); // Sauvegarder après 5 secondes d'inactivité
		}
	}

	// Fonction pour forcer une sauvegarde
	function forceSaveFullState() {
		clearTimeout(debounceTimer);
		// 👉 Sauvegarder seulement si l'éditeur est prêt
		if (isInitialized && yDoc) {
			saveFullState();
		} else {
			console.warn("Tentative de sauvegarde forcée alors que l'éditeur n'est pas prêt.");
		}
	}

	// Fonction pour sauvegarder l'état complet du document
	async function saveFullState() {
		// 👉 Vérification simplifiée : on a besoin de yDoc et de ne pas être déjà en train de sauvegarder
		if (!yDoc || isSaving) {
			console.log(`Sauvegarde complète ignorée (yDoc: ${!!yDoc}, isSaving: ${isSaving})`);
			return;
		}

		const yText = yDoc.getText(yjsContentType); // Pour le log

		isSaving = true;
		try {
			// Encoder l'état complet du document Yjs
			const fullState = Y.encodeStateAsUpdate(yDoc);

			// 👉 Vérifier si l'état encodé est vide. Si oui, pas besoin de sauvegarder.
			if (fullState.length === 0) {
				console.log('État complet encodé vide, pas de sauvegarde effectuée.');
				// On pourrait vouloir sauvegarder un état vide si le but est d'effacer le contenu existant.
				// Si c'est le cas, il faudrait une logique différente ici.
				// Pour l'instant, on suppose qu'un état vide ne nécessite pas d'écriture.
				return;
			}

			console.log(
				`Sauvegarde de l'état complet (${fullState.length} octets), contenu actuel: ${yText.length} caractères`
			);

			const stateBlob = new Blob([fullState], { type: 'application/octet-stream' });

			// Mettre à jour l'enregistrement du pad avec l'état complet
			await updatePadContent(padId, stateBlob);
			console.log('État complet du document sauvegardé avec succès via updatePadContent.');
		} catch (err) {
			console.error("Erreur lors de la sauvegarde de l'état complet:", err);
			// TODO: Gérer l'erreur (notifier l'utilisateur ?)
		} finally {
			isSaving = false;
		}
	}

	// Initialiser l'éditeur au chargement du composant
	$effect(() => {
		// S'assure que l'initialisation n'est lancée qu'une seule fois ou si padId change
		console.log('Effect triggered: Initializing editor...');
		initializeEditor();

		// Fonction de nettoyage pour $effect
		return () => {
			console.log('Effect cleanup: Destroying editor resources...');
			// Sauvegarder l'état final avant de quitter si possible
			if (yDoc && !isSaving) {
				// Pas besoin de forceSaveFullState ici car le debounce est géré par scheduleSaveFullState
				// On peut juste s'assurer que le timer est nettoyé
				clearTimeout(debounceTimer);
				// Optionnel: lancer une dernière sauvegarde synchrone si l'application le permettait
				// await saveFullState(); // Attention: peut ralentir la navigation
				console.log('Cleanup: State will be saved by regular mechanism if pending.');
			}

			// Se désabonner des mises à jour PocketBase
			unsubscribeFromPadUpdates();

			// Arrêter la sauvegarde automatique
			clearInterval(autoSaveTimer);

			// Détruire le document Yjs pour libérer les ressources et stopper les listeners internes
			if (yDoc) {
				console.log('Destroying Y.Doc...');
				yDoc.destroy();
				yDoc = undefined; // Nettoyer la référence
			}

			// Nettoyer le timer de debounce une dernière fois
			clearTimeout(debounceTimer);
			isInitialized = false; // Marquer comme non initialisé
			console.log('Effect cleanup completed.');
		};
	});

	// Fonction pour vérifier l'état actuel du document
	function debugDocument() {
		if (!yDoc) return 'Document YJS non initialisé';
		const yText = yDoc.getText(yjsContentType);
		const stateVector = Y.encodeStateVector(yDoc);
		return `Document YJS:\n  ClientID: ${yDoc.clientID}\n  Type: ${yjsContentType}\n  Caractères: ${yText.length}\n  État (vector): ${stateVector.byteLength} octets`;
	}

	// 👉 onDestroy n'est plus nécessaire ici car le nettoyage est géré par le return de $effect
	// onDestroy(() => { ... });
</script>

<div class="pad-editor-container">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">{padTitle}</h1>

		<div class="status-indicator flex items-center gap-2">
			{#if isLoading}
				<span class="text-base-content/70 text-sm">Initialisation...</span>
			{:else if isSaving}
				<span class="loading loading-spinner loading-xs"></span>
				<span class="text-base-content/70 text-sm">Enregistrement...</span>
			{:else if error}
				<span class="text-error text-sm" title={error}>Erreur</span>
			{:else if isInitialized}
				<span class="text-success text-sm">Connecté</span>
				<button
					class="btn btn-xs btn-ghost"
					onclick={forceSaveFullState}
					title="Forcer la sauvegarde manuelle"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
						<polyline points="17 21 17 13 7 13 7 21"></polyline>
						<polyline points="7 3 7 8 15 8"></polyline>
					</svg>
				</button>
			{:else}
				<span class="text-warning text-sm">Non connecté</span>
			{/if}
		</div>
	</div>

	{#if error && !isLoading}
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
			<span>Erreur: {error}</span>
		</div>
	{/if}

	<div
		class="editor-wrapper bg-base-100 overflow-hidden rounded-lg shadow-md"
		style="min-height: 500px; height: 75vh;"
	>
		{#if isLoading}
			<div class="flex h-full items-center justify-center">
				<span class="loading loading-dots loading-lg"></span>
				<span class="ml-4">Chargement de l'éditeur...</span>
			</div>
		{:else if isInitialized && yDoc}
			<!-- 👉 Condition ajoutée pour s'assurer que yDoc est prêt -->
			<Tipex
				bind:tipex={editor}
				extendExtensions={(extensions) => [...extensions, ...tipexExtensions]}
				controls={false}
				class="h-full w-full"
				focal={false}
				content={undefined}
			>
				{#snippet head(tipexInstance)}
					<TipexToolbar editor={tipexInstance} />
				{/snippet}
			</Tipex>
		{:else if !error}
			<div class="text-error flex h-full items-center justify-center">
				Impossible d'initialiser l'éditeur. Vérifiez la console pour les erreurs.
			</div>
		{/if}
	</div>

	<!-- Bouton de débogage -->
	{#if import.meta.env.DEV}
		<!-- 👉 Utiliser import.meta.env.DEV pour la détection du mode dev -->
		<div class="mt-4 text-xs text-gray-500">
			<details>
				<summary class="cursor-pointer">Informations de débogage</summary>
				<pre
					class="mt-1 rounded bg-gray-100 p-2 whitespace-pre-wrap dark:bg-gray-800 dark:text-gray-300">{debugDocument()}</pre>
				<button
					class="btn btn-xs btn-ghost mt-1"
					onclick={() => console.log('Current yDoc state:', yDoc)}>Log yDoc state</button
				>
				<button
					class="btn btn-xs btn-ghost mt-1"
					onclick={() => console.log('Current editor state:', editor?.state.doc.toJSON())}
					>Log Editor state</button
				>
			</details>
		</div>
	{/if}
</div>

<style>
	/* ... styles inchangés ... */
	:global(.tipex .ProseMirror) {
		padding: 1rem;
		min-height: calc(75vh - 60px); /* Hauteur moins la barre d'outils */
		overflow-y: auto;
		outline: none;
		/* 👉 Assurer un fond pour la visibilité */
		background-color: var(--fallback-b1, oklch(var(--b1) / 1));
		color: var(--fallback-bc, oklch(var(--bc) / 1));
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
		/* 👉 Assurer que l'éditeur prend la place */
		display: flex;
		flex-direction: column;
	}
	:global(.tipex-editor-section .tipex) {
		flex-grow: 1;
	}
</style>
