import { pb } from "$lib/pocketbase.svelte";
import { showAlert } from "$lib/shared/states.svelte";
import type { RecordModel } from "pocketbase";

// --- Constantes ---
const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute
export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
export const SAVE_DEBOUNCE_MS = 2000; // 2 secondes

// --- Types ---

// Fonctions requises par le store éditable
// Utilise un type générique T qui étend RecordModel
interface EditableDocumentActions<T extends RecordModel> {
	loadDoc: (docId: string) => Promise<T>;
	updateDoc: (docId: string, data: Partial<T>) => Promise<T>;
	acquireLock: (docId: string) => Promise<T | null>;
	releaseLock: (docId: string) => Promise<T | null>;
	refreshLock: (docId: string) => Promise<T | null>;
}

// Options pour créer le store
interface EditableDocumentOptions<T extends RecordModel> {
	docId: string;
	collectionName: string; // Nom de la collection PocketBase (pour la subscription)
	actions: EditableDocumentActions<T>; // Les fonctions spécifiques à la collection
	fieldsToSave?: Array<keyof T>; // Champs à inclure dans la sauvegarde auto (ex: ['title', 'content'])
	initialEditMode?: boolean; // Démarrer en mode édition si possible ?
}

// État interne du store éditable
interface EditableDocumentState<T extends RecordModel> {
	doc: T | null; // Le document chargé
	isLoading: boolean;
	isEditing: boolean;
	isSaving: boolean;
	isLockedByOther: boolean;
	editorUsername: string | null; // Nom de l'utilisateur qui verrouille
	lockStatusMessage: string | null; // Message affiché si verrouillé
	error: string | null;
	lastActivity: number; // Timestamp de la dernière activité détectée
}

// --- Store Factory ---

export function createEditableDocumentStore<T extends RecordModel>({
	docId,
	collectionName,
	actions,
	fieldsToSave = ["title", "content"] as Array<keyof T>, // Default fields
	initialEditMode = false
}: EditableDocumentOptions<T>) {
	// --- État Réactif Svelte 5 ---
	const state = $state<EditableDocumentState<T>>({
		doc: null,
		isLoading: true,
		isEditing: false,
		isSaving: false,
		isLockedByOther: false,
		editorUsername: null,
		lockStatusMessage: null,
		error: null,
		lastActivity: Date.now()
	});

	// Stocke la dernière version sauvegardée pour comparaison
	let lastSavedDoc = $state<Partial<T> | null>(null);

	// Variables internes (timers, subscription)
	let debounceTimer: ReturnType<typeof setTimeout> | undefined = undefined;
	let inactivityTimer: ReturnType<typeof setTimeout> | undefined = undefined;
	let heartbeatInterval: ReturnType<typeof setInterval> | undefined;

	let unsubscribe: (() => void) | null = null;
	const currentUserId = pb.authStore.model?.id;

	// --- Fonctions Internes ---

	function cleanupTimers() {
		clearInterval(heartbeatInterval);
		heartbeatInterval = undefined;

		clearTimeout(inactivityTimer);
		inactivityTimer = undefined;
		clearTimeout(debounceTimer);
		debounceTimer = undefined;
		// console.log(`[EditableStore ${docId}] Timers nettoyés.`);
	}

	function updateLockStatusInternal(docData: T | null) {
		if (!docData) {
			state.isLockedByOther = false;
			state.editorUsername = null;
			state.lockStatusMessage = null;
			return;
		}
		const isLocked = docData.isEditing ?? false;
		// @ts-ignore // Supposant que editingUser est l'ID ou un objet avec ID
		const editorId = docData.editingUser || (docData.expand?.editingUser as any)?.id || null;
		const editorIsCurrentUser = editorId === currentUserId;

		state.isLockedByOther = isLocked && !editorIsCurrentUser;

		if (state.isLockedByOther) {
			// @ts-ignore // Supposant l'existence de expand.editingUser.username
			state.editorUsername = docData.expand?.editingUser?.username || "un autre utilisateur";
			state.lockStatusMessage = `Document édité par ${state.editorUsername}. Mode lecture seule.`;
			// console.log(`[EditableStore ${docId}] Verrouillé par ${state.editorUsername} (${editorId})`);

			// Si on était en train d'éditer, forcer la sortie
			if (state.isEditing) {
				console.warn(
					`[EditableStore ${docId}] Verrou pris par ${state.editorUsername}. Passage forcé en mode lecture.`
				);
				forceStopEditingInternal(`Le verrou a été pris par ${state.editorUsername}`);
			}
		} else {
			state.editorUsername = null;
			state.lockStatusMessage = null;
		}
	}

	// Forcer l'arrêt sans essayer de libérer le verrou (car pris par qqn d'autre)
	function forceStopEditingInternal(reason: string) {
		if (!state.isEditing) return;
		console.log(`[EditableStore ${docId}] Arrêt forcé de l'édition. Raison: ${reason}`);
		state.isEditing = false;
		state.error = reason;
		cleanupTimers();
	}

	function resetInactivityTimerInternal() {
		clearTimeout(inactivityTimer);
		inactivityTimer = undefined;
		state.lastActivity = Date.now();

		if (state.isEditing) {
			inactivityTimer = setTimeout(async () => {
				console.log(`[EditableStore ${docId}] Inactivité détectée, libération du verrou...`);
				await stopEditing(true); // Appel de la méthode exposée
				showAlert("Vous avez été déconnecté de l'édition pour inactivité.", "warning");
			}, INACTIVITY_TIMEOUT_MS);
		}
	}

	function startHeartbeatInternal() {
		cleanupTimers(); // Nettoie d'abord les anciens timers
		let lastSuccess = Date.now();

		const checkConnection = async () => {
			if (!state.isEditing) {
				console.log(`[EditableStore ${docId}] Heartbeat arrêté car plus en mode édition.`);
				cleanupTimers();
				return;
			}

			try {
				// Utilise l'action injectée
				const refreshedPad = await actions.refreshLock(docId);
				if (refreshedPad && refreshedPad.editingUser === currentUserId) {
					lastSuccess = Date.now();
					// console.log(`[EditableStore ${docId}] Heartbeat réussi.`);
					// Mettre à jour le document local avec la réponse (peut contenir des changements mineurs)
					state.doc = refreshedPad;
					resetInactivityTimerInternal();
				} else {
					// Le refresh a échoué ou le verrou appartient à qqn d'autre
					console.error(`[EditableStore ${docId}] Échec du rafraîchissement du verrou.`);
					if (refreshedPad) updateLockStatusInternal(refreshedPad); // Mettre à jour le statut si on a une réponse
					forceStopEditingInternal("Session d'édition expirée ou reprise par un autre.");
				}
			} catch (e) {
				console.error(`[EditableStore ${docId}] Erreur heartbeat:`, e);
				if (Date.now() - lastSuccess > HEARTBEAT_INTERVAL_MS * 2) {
					forceStopEditingInternal("Connexion perdue. Mode lecture forcé.");
				}
			}
		};

		checkConnection(); // Premier check immédiat
		heartbeatInterval = setInterval(checkConnection, HEARTBEAT_INTERVAL_MS);
	}

	async function initializeAndSubscribeInternal() {
		state.isLoading = true;
		state.error = null;
		state.lockStatusMessage = null;
		state.isLockedByOther = false;
		state.editorUsername = null;

		try {
			// Utilise l'action injectée
			const initialDoc = await actions.loadDoc(docId);
			state.doc = initialDoc;
			lastSavedDoc = { ...initialDoc }; // Copie initiale pour comparaison
			console.log(`[EditableStore ${docId}] Document initial chargé.`);

			updateLockStatusInternal(initialDoc);

			// S'abonner aux changements spécifiques à ce document
			unsubscribe = await pb.collection(collectionName).subscribe(docId, ({ action, record }) => {
				console.log(`[EditableStore ${docId}] Subscription event: ${action}`, record);
				const updatedRecord = record as T;

				if (action === "update") {
					// 👉 Toujours mettre à jour les champs de verrouillage même en mode édition
					if (state.doc) {
						// Mettre à jour les champs de verrouillage
						const lockFields = ["isEditing", "editingUser", "lastEditHeartbeat"];
						for (const field of lockFields) {
							if (field in updatedRecord) {
								// @ts-ignore
								state.doc[field] = updatedRecord[field];
							}
						}
						// Mettre à jour aussi les expand si présents (pour le nom d'utilisateur)
						if (updatedRecord.expand) {
							// @ts-ignore
							state.doc.expand = updatedRecord.expand;
						}
					}

					// Mettre à jour l'état de verrouillage basé sur les données reçues
					updateLockStatusInternal(state.doc || updatedRecord);

					// Si on est PAS en train d'éditer, mettre à jour tout le contenu local
					if (!state.isEditing) {
						if (state.doc) {
							let changed = false;
							// Compare chaque champ pour éviter une réaffectation inutile de state.doc
							for (const key in updatedRecord) {
								// @ts-ignore // Vérification plus sûre avec Object.hasOwn si possible/nécessaire
								if (Object.prototype.hasOwnProperty.call(updatedRecord, key)) {
									// @ts-ignore
									if (state.doc[key] !== updatedRecord[key]) {
										// @ts-ignore
										state.doc[key] = updatedRecord[key];
										changed = true;
									}
								}
							}
							if (changed) {
								console.log(
									`[EditableStore ${docId}] Document mis à jour via subscription (mode lecture).`
								);
								// Mettre à jour la référence sauvée aussi en mode lecture pour la cohérence
								lastSavedDoc = { ...state.doc };
							}
						} else {
							// Si state.doc était null, on le met à jour (cas rare?)
							state.doc = updatedRecord;
							lastSavedDoc = { ...updatedRecord };
							console.log(
								`[EditableStore ${docId}] Document initialisé via subscription (mode lecture).`
							);
						}
					}
				} else if (action === "delete") {
					state.error = "Le document a été supprimé.";
					state.doc = null;
					forceStopEditingInternal("Document supprimé");
					if (unsubscribe) unsubscribe(); // Se désabonner
					unsubscribe = null;
				}
			});
			console.log(`[EditableStore ${docId}] Subscription établie.`);

			// Tenter de démarrer en mode édition si demandé et possible
			if (initialEditMode && !state.isEditing && !state.isLockedByOther) {
				await startEditing(); // Appel méthode exposée
			}
		} catch (e: any) {
			console.error(`[EditableStore ${docId}] Erreur initialisation/subscription:`, e);
			state.error = `Impossible de charger le document ou de s'y abonner: ${e.message}`;
			state.doc = null; // S'assurer que doc est null en cas d'erreur critique
		} finally {
			state.isLoading = false;
		}
	}

	// --- Méthodes Exposées (via l'objet retourné) ---

	async function startEditing(): Promise<void> {
		if (state.isEditing || state.isLockedByOther || !state.doc) return;

		state.isLoading = true; // Indique une tentative d'acquisition
		state.error = null;
		try {
			// Utilise l'action injectée
			const lockedDoc = await actions.acquireLock(docId);
			if (lockedDoc && lockedDoc.editingUser === currentUserId) {
				state.isEditing = true;
				state.doc = lockedDoc; // Mettre à jour avec la version verrouillée
				lastSavedDoc = { ...lockedDoc }; // Mettre à jour la référence

				console.log(`[EditableStore ${docId}] Verrou acquis, mode édition activé.`);
				startHeartbeatInternal();
				resetInactivityTimerInternal();
			} else {
				// Échec de l'acquisition (peut-être qqn d'autre l'a pris entre temps)
				state.error = "Impossible d'acquérir le verrou. Le document est peut-être déjà édité.";
				if (lockedDoc) {
					// Si on a reçu une réponse, mettre à jour le statut
					updateLockStatusInternal(lockedDoc);
				} else {
					// Sinon, recharger pour être sûr
					const currentDoc = await actions.loadDoc(docId);
					state.doc = currentDoc;
					updateLockStatusInternal(currentDoc);
				}
			}
		} catch (e: any) {
			console.error(`[EditableStore ${docId}] Erreur acquisition verrou:`, e);
			state.error = `Erreur lors de l'acquisition du verrou: ${e.message || e}`;
		} finally {
			state.isLoading = false;
		}
	}

	async function saveChanges(force = false): Promise<void> {
		if (!state.isEditing || !state.doc || (state.isSaving && !force)) {
			return;
		}

		const dataToSave: Partial<T> = {};
		let hasChanges = false;

		// Comparer les champs désignés avec la dernière version sauvegardée
		for (const field of fieldsToSave) {
			// @ts-ignore
			if (state.doc[field] !== lastSavedDoc?.[field]) {
				// @ts-ignore
				dataToSave[field] = state.doc[field];
				hasChanges = true;
			}
		}

		if (!hasChanges && !force) {
			// console.log(`[EditableStore ${docId}] Aucune modification détectée, sauvegarde annulée.`);
			return;
		}

		// Si on force, mais qu'il n'y a pas de changements, on n'envoie rien quand même
		// (sauf si l'objet dataToSave est vide, là on force l'envoi pour màj 'updated'?) Non, on n'envoie rien.
		if (force && !hasChanges) {
			console.log(
				`[EditableStore ${docId}] Forçage de sauvegarde, mais aucune modification détectée.`
			);
			return;
		}

		state.isSaving = true;
		console.log(`[EditableStore ${docId}] Sauvegarde des modifications...`, dataToSave);
		try {
			// Utilise l'action injectée
			const updatedDoc = await actions.updateDoc(docId, dataToSave);
			state.doc = updatedDoc; // Mettre à jour avec la réponse serveur
			lastSavedDoc = { ...updatedDoc }; // Mettre à jour la référence sauvegardée
			console.log(`[EditableStore ${docId}] Sauvegarde réussie.`);
		} catch (e: any) {
			console.error(`[EditableStore ${docId}] Erreur sauvegarde:`, e);
			state.error = `Impossible de sauvegarder: ${e.message || e}`;
			// Faut-il revert state.doc aux valeurs de lastSavedDoc? Pour l'instant non.
		} finally {
			state.isSaving = false;
		}
	}

	async function stopEditing(saveFirst = true): Promise<void> {
		if (!state.isEditing) return;
		console.log(`[EditableStore ${docId}] Arrêt de l'édition demandé (saveFirst: ${saveFirst})...`);

		clearTimeout(debounceTimer); // Empêche la sauvegarde auto pendant l'arrêt
		debounceTimer = undefined;

		if (saveFirst) {
			await saveChanges(true); // Force la sauvegarde des dernières modifs
		}

		state.isLoading = true; // Indique la libération en cours
		try {
			// Utilise l'action injectée
			const releasedDoc = await actions.releaseLock(docId);
			console.log(`[EditableStore ${docId}] Verrou libéré avec succès.`);
			state.isEditing = false;
			cleanupTimers();
			if (releasedDoc) {
				state.doc = releasedDoc; // Mettre à jour avec la version après libération
				lastSavedDoc = { ...releasedDoc };
			}
		} catch (e: any) {
			console.error(`[EditableStore ${docId}] Erreur libération verrou:`, e);
			state.error = `Erreur lors de l'arrêt de l'édition: ${e.message || e}`;
			// Que faire ? L'utilisateur est bloqué en édition locale.
			// Forcer la sortie locale pour éviter incohérence, mais avertir.
			state.isEditing = false;
			cleanupTimers();

			showAlert("Erreur lors de la libération du verrou. Sortie forcée de l'édition.", "error");
		} finally {
			state.isLoading = false;
		}
	}

	// Méthode pour mettre à jour un champ localement et déclencher le debounce
	function updateField<K extends keyof T>(fieldName: K, value: T[K]): void {
		if (!state.isEditing || !state.doc) return;

		// @ts-ignore
		if (state.doc[fieldName] !== value) {
			// @ts-ignore
			state.doc[fieldName] = value;
			// Déclencher l'activité et la sauvegarde debouncée
			handleUserActivityAndDebounceSave();
		} else {
			// Même si la valeur n'a pas changé (ex: re-sélection), on reset l'inactivité
			resetInactivityTimerInternal();
		}
	}

	// Gérer l'activité et le debounce
	function handleUserActivityAndDebounceSave() {
		if (state.isEditing) {
			resetInactivityTimerInternal();

			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				// Vérifier si toujours en édition au moment de l'exécution
				if (state.isEditing) {
					saveChanges(); // saveChanges vérifie lui-même les modifs
				}
			}, SAVE_DEBOUNCE_MS);
		}
	}

	// Fonction de nettoyage à appeler lors de la destruction du composant utilisateur
	function dispose() {
		console.log(`[EditableStore ${docId}] Dispose appelé.`);
		if (unsubscribe) {
			unsubscribe();
			unsubscribe = null;
			console.log(`[EditableStore ${docId}] Désabonnement effectué.`);
		}
		cleanupTimers();

		// Si on était en train d'éditer, tenter de libérer le verrou (best effort)
		if (state.isEditing) {
			console.warn(`[EditableStore ${docId}] Tentative de libération du verrou lors du dispose.`);
			state.isEditing = false; // Mettre à false immédiatement localement
			actions
				.releaseLock(docId)
				.then(() => console.log(`[EditableStore ${docId}] Verrou libéré lors du dispose.`))
				.catch((e) =>
					console.error(
						`[EditableStore ${docId}] Erreur (non bloquante) releaseLock lors du dispose:`,
						e
					)
				);
		}
	}

	// --- Initialisation ---
	initializeAndSubscribeInternal();

	// --- Retourner l'état réactif et les méthodes ---
	// On ne retourne que l'état et les méthodes nécessaires à l'extérieur
	return {
		// État réactif (lecture seule de l'extérieur via $derived si besoin)
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
		}, // Peut être utile pour UI

		// Actions
		startEditing,
		stopEditing,
		saveChanges, // Pour sauvegarde manuelle/forcée
		updateField, // Pour lier aux inputs/éditeur
		dispose, // IMPORTANT: à appeler dans le $effect de retour du composant parent

		// Peut-être une fonction pour reset l'erreur ?
		clearError: () => {
			state.error = null;
		}
	};
}
