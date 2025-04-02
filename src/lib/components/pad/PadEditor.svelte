<script lang="ts">
	import { Tipex, defaultExtensions } from '@friendofsvelte/tipex';
	import { TextAlign } from '@tiptap/extension-text-align';

	import type { TipexEditor } from '@friendofsvelte/tipex';
	import type { PadResponse } from '$lib/types/pad/pad.types';

	import {
		loadPad,
		updatePadContent,
		acquirePadLock,
		releasePadLock,
		refreshPadLock
	} from '$lib/shared/padStore.svelte';
	import TipexToolbar from '$lib/components/TipexToolbar.svelte';
	import { pb } from '$lib/pocketbase.svelte';
	import Save from 'lucide-svelte/icons/save';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Info from 'lucide-svelte/icons/info';
	import '@friendofsvelte/tipex/styles/Tipex.css';
	import '@friendofsvelte/tipex/styles/ProseMirror.css';
	import '@friendofsvelte/tipex/styles/EditLink.css';

	interface Props {
		docId: string;
		collection: string;
	}

	const { docId, collection }: Props = $props();

	// État de l'éditeur
	let editor: TipexEditor | undefined = $state();
	let isEditing = $state(false);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let error = $state<string | null>(null);
	let lastActivity = $state(Date.now());
	let padTitle = $state('');
	let htmlContent = $state(''); // État local pour le contenu venant de la DB ou sauvegardé

	// --- État Externe (PocketBase, via subscription) ---
	let padLockedByOther = $state(false); // Le pad est-il verrouillé par qqn d'autre ?
	let externalEditorUsername = $state<string | null>(null); // Nom de l'autre éditeur
	let lockStatusMessage = $state<string | null>(null); // Message de statut du verrou

	// Timers et intervalles
	let heartbeatInterval: ReturnType<typeof setInterval> | undefined;
	let debounceTimer: ReturnType<typeof setTimeout> | undefined = undefined;
	let inactivityTimer: ReturnType<typeof setTimeout> | undefined = undefined;
	let unsubscribe: (() => void) | null = null; //

	// Durée d'inactivité avant libération auto du verrou (10 minutes)
	const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
	// Intervalle d'envoi du heartbeat (1 minute)
	const HEARTBEAT_INTERVAL_MS = 60 * 1000;
	const SAVE_DEBOUNCE_MS = 2000;

	const currentUserId = pb.authStore.model?.id;

	const extensions = [
		TextAlign.configure({
			types: ['heading', 'paragraph']
		})
	];
	// --- Fonctions Principales ---

	// 👉 Chargement initial et mise en place de la subscription
	async function initializeAndSubscribe() {
		isLoading = true;
		error = null;
		lockStatusMessage = null;
		padLockedByOther = false;
		externalEditorUsername = null;

		try {
			const initialPad = await loadPad(docId);
			padTitle = initialPad.title;
			// *** Correction Bug Contenu Vide ***
			// Définit le contenu initial SEULEMENT si htmlContent est vide ou si le contenu chargé est différent
			// Cela évite d'écraser le contenu de l'éditeur s'il a déjà été modifié localement mais pas encore sauvé
			// (cas peu probable au chargement initial, mais plus sûr)
			// Plus important : Cela assure que le contenu est bien chargé avant de potentiellement passer en édition.

			if (!htmlContent || htmlContent !== initialPad.content) {
				htmlContent = initialPad.content || '';
				// Si l'éditeur existe déjà, on met son contenu à jour (utile si rechargement forcé)
				if (editor && editor.getHTML() !== htmlContent) {
					editor.commands.setContent(htmlContent, false); // false pour ne pas déclencher d'événement 'update'
				}
			}
			console.log(`Contenu initial chargé (${htmlContent.length} caractères)`);

			// Met à jour l'état de verrouillage externe initial
			updateLockStatus(initialPad);

			// *** Appel API si initialement verrouillé ***
			if (initialPad.isEditing) {
				// On lance l'appel sans attendre (await) pour ne pas bloquer l'initialisation
				checkAndCleanLock(docId);
			}

			// S'abonner aux changements sur ce pad spécifique
			unsubscribe = await pb.collection({ collection }).subscribe(docId, ({ action, record }) => {
				console.log(`Subscription event: ${action}`, record);
				if (action === 'update') {
					updateLockStatus(record as PadResponse);

					// Si qqn d'autre modifie le contenu pendant qu'on est en lecture seule, mettre à jour notre vue
					if (!isEditing && record.content !== htmlContent) {
						console.log('Contenu mis à jour via subscription (mode lecture)');
						htmlContent = record.content || '';
						if (editor) {
							// Mettre à jour l'éditeur Tipex s'il est visible (ce qui ne devrait pas arriver en lecture seule, mais par sécurité)
							editor.commands.setContent(htmlContent, false);
						}
					}
				}
				if (action === 'delete') {
					error = 'Le pad a été supprimé.';
					// Gérer la redirection ou le blocage de l'interface ici
				}
			});
			console.log(`Subscription établie pour padId: ${docId}`);
		} catch (e: any) {
			console.error("Erreur lors de l'initialisation ou la subscription:", e);
			error = `Impossible de charger le pad ou de s'y abonner: ${e.message}`;
		} finally {
			isLoading = false;
		}
	}

	async function checkAndCleanLock(docIdToCheck: string) {
		console.log(`[Client] Checking lock status via API for pad ${docIdToCheck}`);
		try {
			// Utilise l'instance pb pour construire l'URL et gérer l'authentification
			const response = await pb.send(`/pad_check_and_clean_lock/${docIdToCheck}`, {
				method: 'GET'
			});

			console.log('[Client] Lock check API response:', response);

			// Si l'API a nettoyé le verrou, la souscription temps réel
			// devrait recevoir la mise à jour peu après. On pourrait
			// forcer une mise à jour locale si nécessaire, mais laissons
			// la souscription faire son travail pour la cohérence.
			if (response?.cleanedUp) {
				console.log(`[Client] API indicated lock for pad ${docIdToCheck} was cleaned up.`);
			}
		} catch (error: any) {
			// Gérer les erreurs réseau ou les erreurs 4xx/5xx de l'API
			console.error(`[Client] Error checking/cleaning lock for pad ${docIdToCheck}:`, error);
			if (error.status === 404) {
				// Le pad n'existe plus, gérer comme l'événement 'delete' de la souscription
				// error = 'Le pad a été supprimé ou est introuvable.';
			} else {
				// Autre erreur serveur ou réseau
				// error = 'Erreur lors de la vérification du verrou.';
			}
		}
	}

	// 👉 Met à jour l'état local basé sur les infos de verrouillage du pad
	function updateLockStatus(pad: PadResponse) {
		const isLocked = pad.isEditing ?? false;
		const editorId = pad.editingUser ?? null;
		const editorIsCurrentUser = editorId === currentUserId;

		padLockedByOther = isLocked && !editorIsCurrentUser;

		if (padLockedByOther) {
			externalEditorUsername = pad.expand?.editingUser?.username || 'un autre utilisateur';
			lockStatusMessage = `Document édité par ${externalEditorUsername}. Mode lecture seule.`;
			console.log(`Pad verrouillé par ${externalEditorUsername} (${editorId})`);

			// Si l'utilisateur actuel était en train d'éditer, le forcer à sortir
			if (isEditing) {
				console.warn(
					'Le verrou a été pris par un autre utilisateur. Passage forcé en mode lecture.'
				);
				forceStopEditing('Le verrou a été pris par ' + externalEditorUsername);
			}
		} else {
			externalEditorUsername = null;
			lockStatusMessage = null; // Efface le message si le verrou est levé ou si c'est nous
		}
	}
	// Fonction pour démarrer l'édition (acquérir le verrou)
	async function startEditing() {
		if (isEditing || padLockedByOther) return; // Ne rien faire si déjà en édition ou verrouillé par un autre

		isLoading = true;
		error = null;
		try {
			const lockedPad = await acquirePadLock(docId);
			if (lockedPad && lockedPad.editingUser === currentUserId) {
				isEditing = true;

				// Démarrer le heartbeat pour maintenir le verrou
				startHeartbeat();

				// Réinitialiser le timer d'inactivité
				resetInactivityTimer();
			} else {
				error =
					"Impossible d'acquérir le verrou d'édition. Le document est peut-être déjà en cours d'édition.";
				// Re-vérifier l'état au cas où la subscription n'aurait pas encore mis à jour
				const currentPad = await loadPad(docId);
				updateLockStatus(currentPad);
			}
		} catch (e) {
			console.error("Erreur lors de l'acquisition du verrou:", e);
			error = "Erreur lors de l'acquisition du verrou d'édition";
		} finally {
			isLoading = false;
		}
	}

	// 👉 Forcer l'arrêt de l'édition (sans libérer le verrou, car qqn d'autre l'a pris)
	// XXX Normalement impossible ?
	function forceStopEditing(reason: string) {
		if (!isEditing) return;
		console.log(`Arrêt forcé de l'édition. Raison: ${reason}`);
		isEditing = false;
		error = reason; // Afficher la raison à l'utilisateur
		cleanupTimers(); // Arrêter heartbeat et timers
	}

	// 👉 Arrêter l'édition (sauvegarder et libérer le verrou)
	async function stopEditing(saveFirst = true) {
		if (!isEditing) return;
		console.log("Arrêt de l'édition demandé...");
		// Empêche les sauvegardes automatiques pendant le processus d'arrêt
		clearTimeout(debounceTimer);
		debounceTimer = undefined;

		if (saveFirst && editor) {
			const contentToSave = editor.getHTML();
			if (contentToSave !== htmlContent) {
				await saveContent(contentToSave, true); // true = force save even if isSaving is true (needed for beforeunload)
			}
		}
		isLoading = true; // Indicateur visuel pendant la libération
		try {
			await releasePadLock(docId);
			console.log("Verrou d'édition libéré avec succès.");
			isEditing = false;
			cleanupTimers(); // Arrête heartbeat et timers *après* la libération réussie
		} catch (e: any) {
			console.error('Erreur lors de la libération du verrou:', e);
			error = `Erreur lors de l'arrêt de l'édition: ${e.message}`;
			// Que faire ici ? L'utilisateur est toujours en mode édition localement mais le verrou n'a pas pu être libéré.
			// On pourrait laisser en édition, mais c'est risqué. Forcer la sortie ?
			isEditing = false; // Forcer la sortie locale pour éviter incohérences
			cleanupTimers();
		} finally {
			isLoading = false;
		}
	}

	// Sauvegarder le contenu actuel
	async function saveContent(content: string, force = false) {
		// Ne pas sauvegarder si pas en mode édition, ou si déjà en sauvegarde (sauf si forcé), ou si contenu inchangé
		if (!isEditing || (isSaving && !force) || content === htmlContent) {
			return;
		}

		isSaving = true;
		console.log(`Sauvegarde du contenu (${content.length} caractères)...`);
		try {
			await updatePadContent(docId, content);
			htmlContent = content;
			console.log('Contenu sauvegardé avec succès.');
		} catch (e) {
			console.error('Erreur lors de la sauvegarde:', e);
			error = 'Impossible de sauvegarder les modifications';
		} finally {
			isSaving = false;
		}
	}

	// Envoyer un heartbeat amélioré pour maintenir le verrou
	function startHeartbeat() {
		cleanupTimers();
		let lastSuccess = Date.now();

		// Fonction de vérification de connexion
		const checkConnection = async () => {
			if (!isEditing) {
				console.log('Heartbeat arrêté car plus en mode édition.');
				cleanupTimers();
				return;
			}

			try {
				const refreshedPad = await refreshPadLock(docId);
				if (refreshedPad) {
					lastSuccess = Date.now();
					console.log('Heartbeat réussi.');
					resetInactivityTimer();
				} else {
					console.error('Échec du rafraîchissement du verrou.');
					forceStopEditing("Session d'édition expirée.");
				}
			} catch (e) {
				console.error('Erreur heartbeat:', e);
				// Si pas de réponse depuis plus de 2 intervalles, considérer la connexion perdue
				if (Date.now() - lastSuccess > HEARTBEAT_INTERVAL_MS * 2) {
					forceStopEditing('Connexion perdue. Mode lecture forcé.');
				}
			}
		};

		// Premier heartbeat immédiat
		checkConnection();

		// Puis intervalle régulier
		heartbeatInterval = setInterval(checkConnection, HEARTBEAT_INTERVAL_MS);
	}

	// Réinitialiser le timer d'inactivité
	function resetInactivityTimer() {
		clearTimeout(inactivityTimer);
		inactivityTimer = undefined;

		lastActivity = Date.now();

		if (isEditing) {
			inactivityTimer = setTimeout(async () => {
				console.log(`Inactivité de ${INACTIVITY_TIMEOUT_MS}ms détectée, libération du verrou`);
				await stopEditing(true);
				error = "Vous avez été déconnecté de l'édition pour inactivité.";
			}, INACTIVITY_TIMEOUT_MS);
		}
	}

	// 👉 Gérer l'activité utilisateur (appelée par le DOM et l'éditeur)
	function handleUserActivity() {
		if (isEditing) {
			resetInactivityTimer();
		}
	}

	function cleanupTimers() {
		clearInterval(heartbeatInterval);
		heartbeatInterval = undefined;
		clearTimeout(inactivityTimer);
		inactivityTimer = undefined;
		clearTimeout(debounceTimer);
		debounceTimer = undefined;
		console.log('Timers nettoyés.');
	}

	// 👉 Handler pour l'événement 'update' de Tipex
	function handleEditorUpdate({ editor: updatedEditor }) {
		// 1. Gérer l'activité utilisateur
		handleUserActivity();

		// 2. Lancer la sauvegarde avec debounce si en mode édition
		if (isEditing) {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				// Vérifier à nouveau isEditing et l'état de l'éditeur au moment de l'exécution
				if (isEditing && updatedEditor && !updatedEditor.isDestroyed) {
					const currentContent = updatedEditor.getHTML();
					// saveContent vérifie déjà si le contenu a changé par rapport à htmlContent
					saveContent(currentContent);
				}
			}, SAVE_DEBOUNCE_MS);
		}
	}
	// --- Effets et Cycle de Vie ---

	$effect(() => {
		console.log('Effet principal: Initialisation et mise en place...');
		initializeAndSubscribe();

		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (isEditing) {
				console.warn('Tentative de libération du verrou avant fermeture (best effort)');

				// 1. Envoyer un beacon pour libérer le verrou
				const releaseUrl = `${pb.baseUrl}/api/collections/pads/records/${docId}`;
				const data = new FormData();
				data.append('isEditing', 'false');
				data.append('editingUser', '');

				// Envoi synchrone si possible, sinon beacon
				try {
					if (navigator.sendBeacon) {
						navigator.sendBeacon(releaseUrl, data);
					} else {
						// Fallback pour anciens navigateurs
						fetch(releaseUrl, {
							method: 'PATCH',
							body: data,
							keepalive: true // Permet à la requête de continuer après fermeture
						}).catch(() => {});
					}
				} catch (e) {
					console.error('Erreur beacon:', e);
				}

				// 2. Forcer la sauvegarde si possible
				if (editor) {
					const content = editor.getHTML();
					const saveUrl = `${pb.baseUrl}/api/collections/pads/records/${docId}`;
					const saveData = new FormData();
					saveData.append('content', content);
					navigator.sendBeacon(saveUrl, saveData);
				}
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);

		// Cleanup lors de la destruction du composant
		return () => {
			console.log('Cleanup global: Désabonnement et nettoyage des timers...');
			window.removeEventListener('beforeunload', handleBeforeUnload);

			// Désabonnement immédiat
			if (unsubscribe) {
				unsubscribe();
				console.log('Désabonnement PocketBase effectué.');
				unsubscribe = null;
			}

			// Nettoyer tous les timers restants
			cleanupTimers();

			// Libérer le verrou si on était en train d'éditer (best effort, sans await)
			// Note: stopEditing contient déjà la logique de sauvegarde et cleanupTimers,
			// mais l'appeler ici pourrait être redondant ou causer des problèmes sans await.
			// On se contente de libérer le verrou directement si besoin.
			if (isEditing) {
				console.warn('Tentative de libération du verrou lors du cleanup (best effort).');
				// On capture la valeur avant l'appel asynchrone potentiel
				const padToRelease = docId;
				releasePadLock(padToRelease).catch((e) =>
					console.error('Erreur (non bloquante) cleanup releasePadLock:', e)
				);
				// Important: Mettre isEditing à false localement pour refléter l'état attendu
				isEditing = false;
			}
		};
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="pad-editor-container" role="region" aria-label="Éditeur de Pad" tabindex="0">
	<div class="mb-4 flex items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">{padTitle || 'Chargement...'}</h1>

		<div class="flex items-center gap-2">
			<!-- Indicateurs de statut (chargement, sauvegarde, verrouillage) -->
			<div class="status-indicator flex items-center gap-1">
				{#if isLoading}
					<span class="loading loading-spinner loading-xs"></span>
					<span class="text-base-content/70 text-xs">Chargement...</span>
				{:else if isSaving}
					<span class="loading loading-spinner loading-xs"></span>
					<span class="text-base-content/70 text-xs">Enreg...</span>
				{:else if padLockedByOther}
					<span
						class="text-content-warning bg-warning/40 flex items-center gap-1 rounded-xl px-4 py-2 text-xs"
						title={lockStatusMessage ?? `Verrouillé par ${externalEditorUsername}`}
					>
						<Info size={14} />
						Edition en cours par {externalEditorUsername}
					</span>
				{/if}
			</div>
			<!-- Tabs pour choisir le mode -->
			<div role="tablist" class="tabs tabs-border">
				<button
					role="tab"
					class="tab"
					class:tab-active={!isEditing}
					onclick={() => {
						if (isEditing) stopEditing(true);
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
						if (!isEditing) startEditing();
					}}
					disabled={padLockedByOther || isLoading || isSaving}
					aria-selected={isEditing}
					aria-controls="pad-editor"
				>
					<Pencil size={16} />
					<span class="p-2">Édition</span>
				</button>
			</div>
		</div>
	</div>

	<!-- {#if error}
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
			<button class="btn btn-sm" onclick={() => (error = null)}>Fermer</button>
		</div>
	{/if} -->

	<!-- 👉 Affichage du message de verrouillage par autrui (non critique) -->
	<!-- {#if lockStatusMessage && !error}
		<div class="alert alert-warning mb-4">
			<Info />
			<span>{lockStatusMessage}</span>
			<button class="btn btn-sm btn-ghost" onclick={() => (lockStatusMessage = null)}>Ok</button>
		</div>
	{/if} -->

	<div class="editor-wrapper bg-base-100 rounded-lg shadow-md">
		{#if isLoading && !isEditing}
			<div class="flex items-center justify-center p-10">
				<span class="loading loading-dots loading-lg"></span>
				<span class="ml-4">Chargement de l'éditeur...</span>
			</div>
		{:else if isEditing}
			<div class="bg-base-200 flex items-center">
				<TipexToolbar {editor} />
				<button
					class="btn btn-ghost mr-4 ml-auto"
					onclick={() => stopEditing(true)}
					title="Terminer l'édition"
					aria-label="Terminer l'édition"
				>
					<Save size={24} />
				</button>
			</div>
			<Tipex
				bind:tipex={editor as TipexEditor}
				extensions={[...defaultExtensions, ...extensions]}
				controls={false}
				class="flex-grow"
				focal={false}
				body={htmlContent}
				onupdate={handleEditorUpdate}
			></Tipex>
		{:else}
			<div>
				<div class="document-content prose p-4">
					{@html htmlContent || '<p><em>Ce document est vide.</em></p>'}
				</div>
			</div>
		{/if}
	</div>

	<!-- Informations sur le temps d'inactivité restant (seulement en mode édition) -->
	{#if isEditing}
		<div class="mt-2 text-xs text-gray-500">
			Vous serez automatiquement déconnecté de l'édition après {Math.round(
				(INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivity)) / 60000
			)} minutes d'inactivité.
		</div>
	{/if}

	<!-- Boutons de débogage (inchangés) -->
	{#if import.meta.env.DEV}
		<div class="mt-4 text-xs text-gray-500">
			<details>
				<summary class="cursor-pointer">Informations de débogage</summary>
				<pre
					class="mt-1 rounded bg-gray-100 p-2 whitespace-pre-wrap dark:bg-gray-800 dark:text-gray-300">
État Local: {isLoading ? 'Chargement' : isEditing ? 'Édition' : 'Lecture'} {isSaving
						? '(Sauvegarde...)'
						: ''}
Verrouillé par Autre: {padLockedByOther ? `Oui (${externalEditorUsername})` : 'Non'}
Dernière activité: {new Date(lastActivity).toLocaleTimeString()}
Contenu HTML ($state): {htmlContent?.length || 0} caractères
Erreur: {error || 'Aucune'}
Lock Msg: {lockStatusMessage || 'Aucun'}
Editor instance: {editor ? 'Oui' : 'Non'}
				</pre>
				<button
					class="btn btn-xs btn-ghost mt-1"
					onclick={() => console.log('$state.htmlContent:', htmlContent)}
					>Log $state.htmlContent</button
				>
				{#if editor}<button
						class="btn btn-xs btn-ghost mt-1"
						onclick={() => {
							const editorHtml = editor?.getHTML();
							console.log('editor.getHTML():', editorHtml);
							console.log('Comparison:', editorHtml === htmlContent);
						}}>Log editor.getHTML()</button
					>{/if}
				<button class="btn btn-xs btn-warning mt-1" onclick={initializeAndSubscribe}
					>Reload Content & Sub</button
				>
				<button
					class="btn btn-xs btn-info mt-1"
					onclick={startEditing}
					disabled={isEditing || padLockedByOther}>Force Start Editing</button
				>
				<button
					class="btn btn-xs btn-error mt-1"
					onclick={() => stopEditing(true)}
					disabled={!isEditing}>Force Stop Editing</button
				>
			</details>
		</div>
	{/if}
</div>

<style>
	.editor-wrapper {
		display: flex; /* Nécessaire pour que flex-grow fonctionne sur l'enfant */
		flex-direction: column;
		max-width: 1000px;
		height: calc(100vh - 200px);
		padding-bottom: 1rem;
	}

	:global(.tipex .ProseMirror) {
		border-top-left-radius: 0;
		border-top-right-radius: 0;
		outline: none;
		background-color: white;
		flex-grow: 1;
		overflow: visible; /* Assure qu'aucun contenu n'est coupé */
	}
	/* 👉 Style pour les séparateurs horizontaux (hr) dans l'éditeur */
	:global(hr) {
		margin-top: 3rem !important; /* Marge supérieure, ajustez si besoin (ex: 1em, 20px) */
		margin-bottom: 3rem; /* Marge inférieure, ajustez si besoin */
		border-top-width: 1px; /* Épaisseur de la ligne */
	}

	/* Style pour le contenu en lecture seule */
	.document-content {
		padding: 2rem;
		overflow-y: auto; /* Permet le défilement si nécessaire */
		/* Assurez une hauteur cohérente avec l'éditeur si possible */
		min-height: 400px; /* Même min-height que .editor-wrapper */
		max-height: calc(100vh - 200px); /* Même max-height que .editor-wrapper */
		border-radius: inherit;
		max-width: none; /* Assure que la classe prose ne limite pas la largeur */
		width: 100%; /* Prend toute la largeur disponible */
	}
</style>
