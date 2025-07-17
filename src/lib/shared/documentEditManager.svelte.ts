/*
Orchestrateur générique pour la gestion de l'édition sécurisée des documents.
- Gère l'acquisition et la libération de verrous d'édition.
- Intègre un "heartbeat" pour maintenir le verrou actif.
- Gère un timeout d'inactivité pour l'éditeur.
- Implémente une logique pour forcer un verrou expiré ("périmé").
- Implémente une logique de mise en attente et de re-tentative automatique si un document est activement édité.
- Logique de sauvegarde automatique (autoSave) et manuelle.
- S'abonne aux changements en temps réel pour mettre à jour l'état du verrou.
*/
import { pb } from "$lib/pocketbase.svelte";
import { showAlert } from "$lib/shared/states.svelte";
import { ClientResponseError, type RecordModel, type RecordSubscription } from "pocketbase";

// --- Constantes ---
const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute
export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
export const SAVE_DEBOUNCE_MS = 2000; // 2 secondes
const LOCK_STALE_MS = HEARTBEAT_INTERVAL_MS + 30 * 1000; // Un verrou est "périmé" après 30s après qu'un heartbeat aurait du etre recu

// --- Types ---

// Actions que le store de domaine (ex: sitePageStore) doit fournir.
export interface DocumentStoreActions<T extends RecordModel> {
	loadDoc: (docId: string) => Promise<T>;
	updateDoc: (docId: string, data: Partial<T>) => Promise<T>;
	acquireLock: (docId: string) => Promise<T | null>;
	releaseLock: (docId: string) => Promise<T | null>;
	refreshLock: (docId: string) => Promise<T | null>;
}

// Options pour la création du manager
interface EditableDocumentOptions<T extends RecordModel> {
	docId: string;
	collectionName: string;
	actions: DocumentStoreActions<T>;
	fieldsToSave?: Array<keyof T>;
	initialEditMode?: boolean;
	autoSave?: boolean;
	enableHeartbeatCheck?: boolean;
}

// État interne du manager
interface EditableDocumentState<T extends RecordModel> {
	doc: T | null;
	isLoading: boolean;
	isEditing: boolean;
	isSaving: boolean;
	isLockedByOther: boolean;
	isCheckingHeartbeat: boolean; // État d'attente active
	editorUsername: string | null;
	lockStatusMessage: string | null;
	error: string | null;
	lastActivity: number;
}

export function createDocumentEditManager<T extends RecordModel>(
	options: EditableDocumentOptions<T>
) {
	const {
		docId,
		collectionName,
		actions,
		fieldsToSave = ["title", "content"] as Array<keyof T>,
		initialEditMode = false,
		autoSave = false,
		enableHeartbeatCheck = true
	} = options;

	const state = $state<EditableDocumentState<T>>({
		doc: null,
		isLoading: true,
		isEditing: false,
		isSaving: false,
		isLockedByOther: false,
		isCheckingHeartbeat: false,
		editorUsername: null,
		lockStatusMessage: null,
		error: null,
		lastActivity: Date.now()
	});

	// $inspect("doc", state);

	let lastSavedDoc = $state<Partial<T> | null>(null);
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let inactivityTimer: ReturnType<typeof setTimeout> | undefined;
	let heartbeatInterval: ReturnType<typeof setInterval> | undefined;
	let lockRetryInterval: ReturnType<typeof setInterval> | undefined;
	let unsubscribe: (() => void) | null = null;
	const currentUserId = pb.authStore.record?.id;

	async function initializeAndSubscribeInternal() {
		state.isLoading = true;
		try {
			const initialDoc = await actions.loadDoc(docId);
			state.doc = initialDoc;
			lastSavedDoc = { ...initialDoc };

			updateLockStatusInternal(initialDoc);
			unsubscribe = await pb
				.collection(collectionName)
				.subscribe(docId, (e: RecordSubscription<T>) => {
					if (e.action === "update") {
						const freshDoc = e.record;
						if (state.isEditing) {
							//XXX: cas impossible / limite ... Si isEditing alors l'user est celui en cours
							if (state.doc && state.doc.editingUser !== currentUserId) {
								state.doc = freshDoc;
								updateLockStatusInternal(freshDoc);
							}
						} else {
							state.doc = freshDoc;
							lastSavedDoc = { ...freshDoc };
							updateLockStatusInternal(freshDoc);
						}
					} else if (e.action === "delete") {
						state.error = "Le document a été supprimé.";
						state.doc = null;
						forceStopEditingInternal("Document supprimé");
						if (unsubscribe) unsubscribe();
					}
				});

			if (initialEditMode && !state.isLockedByOther) {
				await startEditing();
			}
		} catch (e: any) {
			state.error = `Impossible de charger le document: ${e.message}`;
			state.doc = null;
		} finally {
			state.isLoading = false;
		}
	}

	function cleanupTimers() {
		clearInterval(heartbeatInterval);
		heartbeatInterval = undefined;
		clearTimeout(inactivityTimer);
		inactivityTimer = undefined;
		clearTimeout(debounceTimer);
		debounceTimer = undefined;
		clearInterval(lockRetryInterval);
		lockRetryInterval = undefined;
	}

	/**
	 * Met à jour l'état du verrou d'édition du document dans le store interne.
	 *
	 * Cette fonction analyse les informations du document (`docData`) pour déterminer :
	 * - Si le document est actuellement verrouillé pour édition par un autre utilisateur.
	 * - Qui est l'utilisateur éditeur (nom d'utilisateur affiché).
	 * - Le message d'état du verrou à afficher à l'utilisateur courant.
	 *
	 * Elle gère également :
	 * - L'arrêt forcé du mode édition si le verrou a été pris par un autre utilisateur pendant l'édition.
	 * - Le déclenchement de la surveillance du heartbeat si le document est verrouillé par un autre utilisateur.
	 * - L'annulation de la surveillance du heartbeat et la notification de disponibilité si le verrou est libéré.
	 *
	 * @param docData Les données du document à analyser (peut être null).
	 */
	function updateLockStatusInternal(docData: T | null) {
		if (!docData) {
			state.isLockedByOther = false;
			state.editorUsername = null;
			state.lockStatusMessage = null;
			return;
		}

		const isLocked = docData.isEditing ?? false;
		const editorId = (docData.editingUser as string) || null;
		const editorIsCurrentUser = editorId === currentUserId;

		state.isLockedByOther = isLocked && !editorIsCurrentUser;

		if (state.isLockedByOther) {
			state.editorUsername = docData.expand?.editingUser?.username || "un autre utilisateur";
			state.lockStatusMessage = `Édition en cours par ${state.editorUsername}.`;
			if (state.isEditing) {
				forceStopEditingInternal(`Le verrou a été pris par ${state.editorUsername}`);
			}
			if (enableHeartbeatCheck && !state.isCheckingHeartbeat) {
				state.isCheckingHeartbeat = true;
				checkForHeartBeat();
			}
		} else {
			state.editorUsername = null;
			state.lockStatusMessage = null;
			if (state.isCheckingHeartbeat) {
				// Le verrou a été libéré pendant que nous attendions.
				console.log(`[${docId}] Le verrou est devenu disponible.`);
				cancelCheckForHeartbeat();
				// L'utilisateur peut maintenant cliquer à nouveau sur "Édition".
				state.lockStatusMessage = "Le document est maintenant disponible pour édition.";
			}
		}
	}

	function forceStopEditingInternal(reason: string) {
		if (!state.isEditing) return;
		state.isEditing = false;
		state.error = reason;
		cleanupTimers();
	}

	function resetInactivityTimerInternal() {
		clearTimeout(inactivityTimer);
		state.lastActivity = Date.now();
		if (state.isEditing) {
			inactivityTimer = setTimeout(async () => {
				console.log(`[${docId}] Inactivité détectée, libération du verrou...`);
				await stopEditing(true);
				showAlert("Vous avez été déconnecté de l'édition pour inactivité.", "info");
			}, INACTIVITY_TIMEOUT_MS);
		}
	}

	function startHeartbeatInternal() {
		cleanupTimers();
		let lastSuccess = Date.now();
		const checkConnection = async () => {
			if (!state.isEditing) {
				cleanupTimers();
				return;
			}
			try {
				const refreshedPad = await actions.refreshLock(docId);
				if (refreshedPad && refreshedPad.editingUser === currentUserId) {
					lastSuccess = Date.now();
					// state.doc = refreshedPad; // XXX : y a deja le subscribe...
					resetInactivityTimerInternal();
				} else {
					if (refreshedPad) updateLockStatusInternal(refreshedPad);
					forceStopEditingInternal("Session d'édition expirée ou reprise.");
				}
			} catch (e) {
				if (Date.now() - lastSuccess > HEARTBEAT_INTERVAL_MS * 2) {
					forceStopEditingInternal("Connexion perdue. Mode lecture forcé.");
					console.error("Erreur  de connexion, fermeture de l'édition", e);
				}
			}
		};
		checkConnection();
		heartbeatInterval = setInterval(checkConnection, HEARTBEAT_INTERVAL_MS);
	}

	/* Vérifier si le verrou existant est périmé (stale). */
	function checkForHeartBeat() {
		if (!state.doc || !state.isLockedByOther) {
			clearInterval(lockRetryInterval);
			return;
		}

		const timeSinceHeartbeat = Date.now() - new Date(state.doc.lastEditHeartbeat).getTime();

		console.log(`[${docId}] Temps depuis le dernier heartbeat: ${timeSinceHeartbeat}ms`);

		if (timeSinceHeartbeat > LOCK_STALE_MS) {
			releaseStaleLock();
			clearInterval(lockRetryInterval);
		} else {
			clearInterval(lockRetryInterval);
			lockRetryInterval = setInterval(() => {
				console.log(`[${docId}] Vérification du Heartbeat`);
				checkForHeartBeat();
			}, LOCK_STALE_MS);
		}
	}

	async function releaseStaleLock() {
		if (!state.doc || state.isEditing) return;

		try {
			await actions.releaseLock(docId);
			cancelCheckForHeartbeat();
		} catch (e) {
			if (e instanceof ClientResponseError && e.isAbort) {
				// Ignorer les annulations
			} else {
				console.error(`[${docId}] Erreur lors de la libération du verrou périmé:`, e);
			}
		}
	}

	function cancelCheckForHeartbeat() {
		if (!state.isCheckingHeartbeat) return;
		console.log(`[${docId}] Arret de la vérification du Heartbeat.`);
		state.isCheckingHeartbeat = false;
		clearInterval(lockRetryInterval);
		lockRetryInterval = undefined;
		updateLockStatusInternal(state.doc);
	}

	async function startEditing(): Promise<void> {
		if (state.isEditing || !state.doc) return;

		state.isLoading = true;
		state.error = null;

		try {
			// 1. Toujours charger l'état le plus récent du document avant toute action.
			// XXX: non, on est subscribe
			// const currentDoc = await actions.loadDoc(docId);
			// state.doc = currentDoc;
			updateLockStatusInternal(state.doc);

			// Si le document n'est pas verrouillé par quelqu'un d'autre, tentons de l'acquérir.
			if (!state.isLockedByOther) {
				const lockedDoc = await actions.acquireLock(docId);
				if (lockedDoc) {
					// Succès !
					cancelCheckForHeartbeat();
					state.isEditing = true;
					state.doc = lockedDoc;
					lastSavedDoc = { ...lockedDoc };
					startHeartbeatInternal();
					resetInactivityTimerInternal();
					return;
				}
				// Échec, probablement une race condition. On recharge pour afficher le bon état.
				// XXX :  non, on continue de faire confiance au subscribe
				// const freshDoc = await actions.loadDoc(docId);
				// state.doc = freshDoc;
				updateLockStatusInternal(state.doc);
				state.error =
					"Le document vient d'être verrouillé par quelqu'un d'autre. Veuillez réessayer.";
				return;
			}

			// Si on arrive ici, c'est que `state.isLockedByOther` est true.
			// on observe le Heartbeat pour vérifier qu'il ne soit pas périmé.
			checkForHeartBeat();
		} catch (e: any) {
			state.error = `Erreur lors de la tentative d'édition: ${e.message}`;
		} finally {
			state.isLoading = false;
		}
	}

	function modification() {
		if (!state.isEditing || !state.doc || state.isSaving) return;
		const dataToSave: Partial<T> = {};

		for (const field of fieldsToSave) {
			if (state.doc[field] !== lastSavedDoc?.[field]) {
				dataToSave[field] = state.doc[field];
			}
		}
		if (Object.keys(dataToSave).length > 0) return dataToSave;
		else return null;
	}

	async function saveChanges(force = false): Promise<void> {
		if (!state.isEditing || !state.doc || state.isSaving) return;

		const dataToSave = modification();
		// console.log(dataToSave);
		if (!dataToSave && !force) return;
		if (force && !dataToSave) return;

		state.isSaving = true;
		try {
			// Ajouter le champ lastMod pour marquer la dernière modification réelle
			const dataWithLastMod = {
				...dataToSave,
				lastMod: new Date().toISOString()
			};
			const updatedDoc = await actions.updateDoc(docId, dataWithLastMod as unknown as Partial<T>);
			state.doc = updatedDoc;
			lastSavedDoc = { ...state.doc };
		} catch (e: any) {
			state.error = `Impossible de sauvegarder: ${e.message}`;
		} finally {
			state.isSaving = false;
		}
	}

	async function stopEditing(saveFirst = true): Promise<void> {
		if (!state.isEditing) return;

		clearTimeout(debounceTimer);
		debounceTimer = undefined;

		if (saveFirst) await saveChanges(true);

		state.isLoading = true;
		try {
			const releasedDoc = await actions.releaseLock(docId);
			state.isEditing = false;
			cleanupTimers();
			if (releasedDoc) {
				state.doc = releasedDoc;
				lastSavedDoc = { ...releasedDoc };
			}
		} catch (e: any) {
			state.error = `Erreur lors de l'arrêt de l'édition: ${e.message}`;
			state.isEditing = false;
			cleanupTimers();
			showAlert("Erreur lors de la libération du verrou.", "error");
		} finally {
			state.isLoading = false;
		}
	}

	function updateField<K extends keyof T>(fieldName: K, value: T[K]): void {
		if (!state.isEditing || !state.doc) return;
		if (state.doc[fieldName] !== value) {
			state.doc[fieldName] = value;
			handleUserActivityAndDebounceSave();
		} else {
			resetInactivityTimerInternal();
		}
	}

	function handleUserActivityAndDebounceSave() {
		resetInactivityTimerInternal();
		if (!autoSave || !state.isEditing) return;

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			if (state.isEditing) saveChanges();
		}, SAVE_DEBOUNCE_MS);
	}

	function dispose() {
		console.log(`[${docId}] Dispose appelé.`);
		if (unsubscribe) unsubscribe();
		cleanupTimers();

		if (state.isEditing) {
			console.warn(`[${docId}] Tentative de libération du verrou lors du dispose.`);
			state.isEditing = false;
			actions.releaseLock(docId).catch(() => {});
		}
	}

	initializeAndSubscribeInternal();

	return {
		get doc() {
			return state.doc;
		},
		get isLoading() {
			return state.isLoading;
		},
		get isEditing() {
			return state.isEditing;
		},
		get isSaving() {
			return state.isSaving;
		},
		get isLockedByOther() {
			return state.isLockedByOther;
		},
		get isCheckingHeartbeat() {
			return state.isCheckingHeartbeat;
		},
		get editorUsername() {
			return state.editorUsername;
		},
		get lockStatusMessage() {
			return state.lockStatusMessage;
		},
		get error() {
			return state.error;
		},
		get lastActivity() {
			return state.lastActivity;
		},
		get hasChange() {
			const change = modification();
			return change && Object.keys(change).length > 0;
		},
		startEditing,
		stopEditing,
		saveChanges,
		updateField,
		dispose,
		clearError: () => {
			state.error = null;
		}
	};
}
