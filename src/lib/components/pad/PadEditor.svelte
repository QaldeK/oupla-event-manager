<script lang="ts">
	import { Tipex, defaultExtensions } from '@friendofsvelte/tipex';
	import { TextAlign } from '@tiptap/extension-text-align';

	import type { TipexEditor } from '@friendofsvelte/tipex';
	import { Editor } from '@tiptap/core';
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
	import '@friendofsvelte/tipex/styles/Tipex.css';
	import '@friendofsvelte/tipex/styles/ProseMirror.css';
	import '@friendofsvelte/tipex/styles/EditLink.css';

	interface Props {
		padId: string;
	}

	const { padId }: Props = $props();

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
			console.log(`Initialisation pour padId: ${padId}`);
			const initialPad = await loadPad(padId);
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

			// S'abonner aux changements sur ce pad spécifique
			unsubscribe = await pb.collection('pads').subscribe(padId, ({ action, record }) => {
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
			console.log(`Subscription établie pour padId: ${padId}`);
		} catch (e: any) {
			console.error("Erreur lors de l'initialisation ou la subscription:", e);
			error = `Impossible de charger le pad ou de s'y abonner: ${e.message}`;
		} finally {
			isLoading = false;
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
			const lockedPad = await acquirePadLock(padId);
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
				const currentPad = await loadPad(padId);
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
			await releasePadLock(padId);
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
			await updatePadContent(padId, content);
			htmlContent = content;
			console.log('Contenu sauvegardé avec succès.');
		} catch (e) {
			console.error('Erreur lors de la sauvegarde:', e);
			error = 'Impossible de sauvegarder les modifications';
		} finally {
			isSaving = false;
		}
	}

	// Envoyer un heartbeat pour maintenir le verrou
	function startHeartbeat() {
		cleanupTimers(); // Assure qu'il n'y a qu'un seul intervalle actif
		heartbeatInterval = setInterval(async () => {
			if (!isEditing) {
				console.log('Heartbeat arrêté car plus en mode édition.');
				cleanupTimers();
				return;
			}

			try {
				const refreshedPad = await refreshPadLock(padId);
				if (refreshedPad) {
					console.log('Heartbeat réussi.');
					resetInactivityTimer(); // Réinitialise aussi l'inactivité à chaque heartbeat réussi
				} else {
					// Le rafraîchissement a échoué (probablement parce qu'on n'est plus l'éditeur légitime)
					console.error('Échec du rafraîchissement du verrou (heartbeat).');
					forceStopEditing("La session d'édition a expiré ou a été interrompue.");
				}
			} catch (e) {
				console.error("Erreur lors de l'envoi du heartbeat:", e);
				error = "La connexion pour maintenir l'édition a été perdue. Passage en mode lecture.";
				forceStopEditing("Erreur de connexion lors du maintien de la session d'édition.");
			}
		}, HEARTBEAT_INTERVAL_MS);
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
	function handleEditorUpdate({ editor: updatedEditor }: EditorEvents['update']) {
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

		// Gestionnaire simple pour beforeunload (tentative de sauvegarde/libération)
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			// On ne bloque plus la fermeture, on essaie juste de nettoyer
			if (isEditing) {
				console.warn(
					'Tentative de sauvegarde et libération du verrou avant fermeture/rechargement (best effort).'
				);
				// On ne peut pas utiliser await ici.
				// saveContent est appelé dans stopEditing.
				stopEditing(true).catch((e) =>
					console.error('Erreur (non bloquante) cleanup beforeunload:', e)
				);
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
				const padToRelease = padId;
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
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">{padTitle || 'Chargement...'}</h1>

		<div class="status-indicator flex items-center gap-2">
			{#if isLoading}
				<span class="loading loading-spinner loading-xs"></span>
				<span class="text-base-content/70 text-sm">Chargement...</span>
			{:else if isSaving}
				<span class="loading loading-spinner loading-xs"></span>
				<span class="text-base-content/70 text-sm">Enregistrement...</span>
			{:else if isEditing}
				<span class="text-success text-sm">Mode édition</span>
				<button
					class="btn btn-xs btn-ghost"
					onclick={() => stopEditing(true)}
					title="Terminer l'édition"
					aria-label="Terminer l'édition"
				>
					<Save size={16} />
				</button>
			{:else if padLockedByOther}
				<span class="text-warning text-sm" title={lockStatusMessage ?? ''}>
					Lecture seule (édité par {externalEditorUsername})
				</span>
				<!-- Pas de bouton Éditer si verrouillé par un autre -->
			{:else}
				<span class="text-warning text-sm">Mode lecture</span>
				<button class="btn btn-xs btn-primary" onclick={startEditing} title="Commencer à éditer">
					<Pencil size={16} />
					Éditer
				</button>
			{/if}
		</div>
	</div>

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
			<button class="btn btn-sm" onclick={() => (error = null)}>Fermer</button>
		</div>
	{/if}

	<!-- 👉 Affichage du message de verrouillage par autrui (non critique) -->
	{#if lockStatusMessage && !error}
		<div class="alert alert-warning mb-4">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				class="stroke-info h-6 w-6 shrink-0"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				></path></svg
			>
			<span>{lockStatusMessage}</span>
			<button class="btn btn-sm btn-ghost" onclick={() => (lockStatusMessage = null)}>Ok</button>
		</div>
	{/if}

	<div class="editor-wrapper bg-base-100 rounded-lg shadow-md" style="margin-top: -1px;">
		{#if isLoading && !isEditing}
			<div class="flex items-center justify-center p-10">
				<span class="loading loading-dots loading-lg"></span>
				<span class="ml-4">Chargement de l'éditeur...</span>
			</div>
		{:else if isEditing}
			<div class="editing-area">
				<div class="sticky top-0 z-10">
					<TipexToolbar {editor} />
				</div>
				<Tipex
					bind:tipex={editor as TipexEditor}
					extensions={[...defaultExtensions, ...extensions]}
					controls={false}
					class="w-full"
					focal={false}
					body={htmlContent}
					onupdate={handleEditorUpdate}
				></Tipex>
			</div>
		{:else}
			{#key padId}
				<div class="document-content prose max-w-none p-4">
					{@html htmlContent || '<p><em>Ce document est vide.</em></p>'}
				</div>
			{/key}
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
		/* Peut-être définir une hauteur max ici si tu veux limiter l'expansion globale */
		/* max-height: 80vh; */
		/* overflow: hidden; */ /* Empêche le contenu interne de déborder visuellement du wrapper */
		display: flex; /* Nécessaire pour que flex-grow fonctionne sur l'enfant */
		flex-direction: column;
	}

	.editing-area {
		display: flex;
		flex-direction: column;
		/* Fait en sorte que cette zone prenne la hauteur disponible dans editor-wrapper si une hauteur max est définie sur ce dernier */
		flex-grow: 1;
		/* Important: Permet au sticky de fonctionner correctement à l'intérieur */
		overflow: hidden; /* Cache tout débordement, le scroll sera géré par scrollable-tipex-container */
		/* Définit une hauteur (ou max-height) pour que le scroll interne ait un sens */
		/* Exemple: utiliser la hauteur restante de la fenêtre */
		height: calc(100vh - 250px); /* Ajuste 250px selon la hauteur de tes éléments hors éditeur */
		/* Ou une hauteur fixe/max si tu préfères */
		/* max-height: 600px; */
	}

	:global(.tipex .ProseMirror) {
		padding: 0.75rem 1rem;
		border-top-left-radius: 0;
		border-top-right-radius: 0;
		/* Définit une hauteur minimale pour cliquer dedans quand c'est vide */
		min-height: 10rem; /* Ajuste si nécessaire */
		height: auto; /* Permet au contenu de définir la hauteur */
		outline: none;
		background-color: white;
		overflow: visible; /* Assure qu'aucun contenu n'est coupé */
	}
	:global(.tipex-editor-wrap) {
		display: flex;
		flex-direction: column;
		/* Pas de hauteur fixe ici */
	}
	:global(.tipex-editor-section) {
		flex-grow: 1;
		border-bottom-left-radius: inherit;
		border-bottom-right-radius: inherit;
		border-radius: inherit;
		/* Pas d'overflow ici, le scroll se fait sur la page */
		/* Pas de min-height: 0 ici */
	}

	:global(.tipex-editor-section .tipex) {
		flex-grow: 1; /* Fait que le composant Tipex grandit */
		display: flex; /* Pour que ProseMirror à l'intérieur puisse grandir */
		flex-direction: column;
	}

	/* Style pour le contenu en mode lecture */
	.document-content {
		background-color: white;
		border: 3px solid var(--fallback-warning, oklch(var(--wa) / 1));
	}

	.document-content :global(p) {
		margin-bottom: 1em;
	}

	.document-content :global(blockquote) {
		border-left: 4px solid var(--fallback-neutral, oklch(var(--n) / 1));
		padding-left: 1em;
		margin-left: 0;
		font-style: italic;
	}

	.document-content :global(pre) {
		background-color: var(--fallback-base-300, oklch(var(--b3) / 1));
		padding: 1em;
		border-radius: 0.5em;
		overflow-x: auto;
	}

	.document-content :global(code) {
		background-color: var(--fallback-base-300, oklch(var(--b3) / 1));
		padding: 0.2em 0.4em;
		border-radius: 0.2em;
	}

	.document-content :global(table) {
		border-collapse: collapse;
		width: 100%;
		margin-bottom: 1em;
	}
</style>
