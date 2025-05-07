import { type TaskType } from "$lib/schemas/event.schema";
import type {
	Collections,
	EventsRecord,
	EventsResponse,
	MessagesResponse
} from "$lib/types/pocketbase";
import { createDateFromString } from "$lib/utils";
import { getSpace } from "$lib/shared/spaceOptions.svelte";
import type {
	ListOptions,
	ListResult,
	RecordModel,
	SubscribeOptions,
	TypedPocketBase
} from "pocketbase";

import type { EventType } from "./types/event";

type GetOneOptions = {
	expand?: string;
	fields?: string;
};

// const pb = new PocketBase('https://oupla.pockethost.io/');

import { pb } from "$lib/shared/userDb.svelte";
export { pb };

// ::: Generic functions
export const modifyRecord = async (collection: string, id: string, data: object) => {
	try {
		await pb.collection(collection).update(id, data);
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export const createRecord = async (collection: string, data: object) => {
	try {
		await pb.collection(collection).create(data);
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export const deleteRecord = async (collection: string, id: string) => {
	try {
		await pb.collection(collection).delete(id);
	} catch (error) {
		console.error(error);
		throw error;
	}
};

// Pour les visiteurs non connectés
export async function loadPublicEvents(spaceId: string) {
	return await pb.collection("events").getFullList<EventType>({
		filter: `space = '${spaceId}' && isConfirmed = true && date_event >= '${new Date().toISOString().split("T")[0]}'`,
		sort: "date_event"
	});
}

export const updateEvent = async (eventID: string, data: Partial<EventsRecord>) => {
	try {
		await pb.collection("events").update(eventID, data);
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export const createEvent = async (data: Partial<EventsRecord>) => {
	try {
		// S'assurer que created_by est toujours défini avec l'utilisateur actuel
		const eventData = {
			...data,
			created_by: pb.authStore.record.id,
			space: getSpace.id
		};

		const record = await pb.collection("events").create(eventData);
		return record;
	} catch (error) {
		console.error(error);
		throw error;
	}
};

// Fonction pour s'abonner aux changements d'une collection
export const subscribe = <T extends RecordModel>(
	collectionName: Collections,
	callback: (data: T) => void,
	options?: SubscribeOptions
) => {
	pb.collection(collectionName).subscribe(
		"*",
		(data) => {
			callback(data.record as T);
		},
		options
	);
};

// Fonction pour annuler l'abonnement
export const unsubscribe = (collectionName: string, topic: string = "*"): void => {
	pb.collection(collectionName).unsubscribe(topic);
};

// Fonction pour récupérer le premier élément d'une liste filtrée
export const getFirstListItem = async <T extends RecordModel>(
	collectionName: Collections,
	filter?: string,
	options?: GetOneOptions
): Promise<T> => {
	try {
		return await pb.collection(collectionName).getFirstListItem(filter || "", options);
	} catch (error) {
		console.error(
			`Erreur lors de la récupération du premier élément dans ${collectionName}:`,
			error
		);
		throw error;
	}
};

export const getList = async <T extends RecordModel>(
	collectionName: Collections,
	page: number = 1,
	perPage: number = 50,
	options?: ListOptions
): Promise<ListResult<T>> => {
	try {
		return await pb.collection(collectionName).getList(page, perPage, options);
	} catch (error) {
		console.error(`Erreur lors de la récupération de la liste dans ${collectionName}:`, error);
		throw error;
	}
};

// Fonction pour récupérer la liste complète (tous les éléments)
export const getFullList = async <T extends RecordModel>(
	collectionName: Collections,
	options?: ListOptions
): Promise<T[]> => {
	try {
		return await pb.collection(collectionName).getFullList(options);
	} catch (error) {
		console.error(
			`Erreur lors de la récupération de la liste complète dans ${collectionName}:`,
			error
		);
		throw error;
	}
};

// Fonction pour récupérer un élément par son ID
export const getOne = async <T extends RecordModel>(
	collectionName: Collections,
	id: string,
	options?: GetOneOptions
): Promise<T> => {
	try {
		return await pb.collection(collectionName).getOne(id, options);
	} catch (error) {
		console.error(
			`Erreur lors de la récupération de l'élément ${id} dans ${collectionName}:`,
			error
		);
		throw error;
	}
};

export const createRecurrentEvent = async (eventData: Partial<EventsRecord>) => {
	try {
		// Créer le masterEvent
		const masterEvent = {
			...eventData,
			isMasterRecurrent: true,
			date_event: "", // on ne met pas de date à l'event master
			space: getSpace.id,
			created_by: pb.authStore.record.id,
			recurrence: {
				...eventData.recurrence,
				tasks: eventData.tasks
			},
			dateStart: null,
			dateEnd: null
		};

		const masterRecord = await pb.collection("events").create({ ...masterEvent });
		console.log("Master event créé:", masterRecord.id);
		const recurrenceDates = eventData.recurrence.recurrenceDates;

		// Créer les occurrences
		const batch = pb.createBatch();
		recurrenceDates.forEach((date, index) => {
			const dateStart = createDateFromString(date, eventData.time_start);
			const dateEnd = createDateFromString(date, eventData.time_end);
			const occurrenceData = {
				...eventData,
				space: getSpace.id,
				created_by: pb.authStore.record.id,
				date_event: date,
				masterRecurrentId: masterRecord.id,
				isMasterRecurrent: false,
				recurrence: {
					...eventData.recurrence,
					tasks: eventData.tasks
				},
				organizers: [], // XXX : les organisateurs des occurrences sont vide par default, et ne correspondent pas a la recurrenceTeam
				dateStart,
				dateEnd
			};

			batch.collection("events").create(occurrenceData);
		});

		// ts-int:disable-next-line: no-unused-expression
		const createOccurrences = await batch.send();
		console.log("Création des événements récurrents terminée");
	} catch (error) {
		console.error("Erreur lors de la création des événements récurrents:", error);
		throw error;
	}
};

// Ajout de la fonction pour mettre à jour toutes les occurrences d'un événement récurrent
// FIXIT
export const updateAllOccurrences = async (masterEvent: EventType) => {
	try {
		// Vérification ajoutée pour s'assurer que recurrence existe et est un objet (TS)
		if (!masterEvent.recurrence || typeof masterEvent.recurrence !== "object") {
			console.error("Données de récurrence invalides ou manquantes dans masterEvent.");
			throw new Error("Données de récurrence invalides.");
		}
		const recurrenceDates = masterEvent.recurrence.recurrenceDates || [];

		const masterId = masterEvent.id;
		if (!masterId) {
			throw new Error("L'ID de l'événement master est manquant pour la mise à jour.");
		}

		// Fonction utilitaire pour nettoyer les données avant l'envoi
		const cleanEventData = (event) => {
			// On crée une copie pour ne pas modifier l'original
			const cleanedData = { ...event };
			// Suppression des champs générés par PocketBase
			delete cleanedData.id; // L'ID sera ajouté spécifiquement pour l'update
			delete cleanedData.collectionId;
			delete cleanedData.collectionName;
			delete cleanedData.created;
			delete cleanedData.updated;
			delete cleanedData.expand; // Important de supprimer expand
			return cleanedData;
		};

		// 1. Mise à jour du master event
		const masterUpdateData = cleanEventData({ ...masterEvent });
		masterUpdateData.date_event = ""; // Master event n'a pas de date
		masterUpdateData.dateStart = null;
		masterUpdateData.dateEnd = null;

		// A faire directement dans le composant pour le check ZOD
		// if (masterUpdateData.recurrence) {
		// 	masterUpdateData.recurrence.tasks = masterEvent.tasks; // Synchronise les tâches dans l'objet recurrence du master
		// }

		await pb.collection("events").update(masterId, masterUpdateData);

		// 2. Récupérer les occurrences existantes liées à cet événement master
		// const existingOccurrences = eventsStore.getEventsOccurences.filter(
		// 	(event) => event.masterRecurrentId === masterId
		// );

		console.log(`Récupération des occurrences pour le master ID: ${masterId}`);

		const existingOccurrences = await pb.collection("events").getFullList<EventType>({
			filter: `masterRecurrentId = '${masterId}'`
		});

		console.log(`Trouvé ${existingOccurrences.length} occurrences existantes.`);

		const occurrencesMap = new Map(
			existingOccurrences.map((occ: EventsResponse) => [occ.date_event, occ])
		);

		// Identification des actions nécessaires
		const toDelete = existingOccurrences
			.filter((occ: EventsResponse) => !recurrenceDates.includes(occ.date_event))
			.map((occ: EventsResponse) => occ.id);

		const baseOccurrenceData = cleanEventData({ ...masterEvent });
		// S'assurer que les champs spécifiques aux occurrences sont corrects
		baseOccurrenceData.isMasterRecurrent = false;
		baseOccurrenceData.isRecurrent = true;
		baseOccurrenceData.masterRecurrentId = masterId;

		const toCreate = recurrenceDates
			.filter((date) => !occurrencesMap.has(date))
			.map((date) => ({
				...baseOccurrenceData,
				date_event: date,
				organizers: [],
				dateStart: createDateFromString(date, masterEvent.time_start).toISOString(),
				dateEnd: createDateFromString(date, masterEvent.time_end).toISOString()
			}));

		const toUpdate = recurrenceDates
			.filter((date) => occurrencesMap.has(date))
			.map((date) => {
				const existingOccurrence = occurrencesMap.get(date);
				if (!existingOccurrence) return null; // Sécurité

				// Logique de fusion des tâches
				const masterTasks = baseOccurrenceData.tasks || [];
				const occurrenceTasks = existingOccurrence.tasks || [];
				// Utiliser une Map pour dédoublonner en gardant la première occurrence de chaque nom
				const tasksMap = new Map<string, TaskType>();
				[...masterTasks, ...occurrenceTasks].forEach((task) => {
					if (task && task.name && !tasksMap.has(task.name)) {
						tasksMap.set(task.name, task);
					}
				});
				const mergedTasks = Array.from(tasksMap.values());

				return {
					...baseOccurrenceData, // Utilise les données de base préparées
					id: existingOccurrence.id,
					date_event: date,
					organizers: existingOccurrence.organizers,
					tasks: mergedTasks,
					recurrence: {
						...masterEvent.recurrence
					},
					dateStart: createDateFromString(date, masterEvent.time_start).toISOString(),
					dateEnd: createDateFromString(date, masterEvent.time_end).toISOString()
				};
			})
			.filter(Boolean); // Enlève les potentiels nulls si une occurrence disparaît entre get et map

		// $inspect('reccurenceDates', $state.snapshot(recurrenceDates));
		// $inspect('toCreate', toCreate);
		// $inspect('toDelete', toDelete);
		// $inspect('toUpdate', toUpdate);

		// 4. Exécuter les batches séparément
		// Batch de suppression
		if (toDelete.length > 0) {
			// try {
			// 	const deleteBatch = pb.createBatch();
			// 	toDelete.forEach((record) => {
			// 		console.log('record', record);
			// 		deleteBatch.collection('events').delete(`"${record}"`);
			// 	});
			// 	await deleteBatch.send();
			// 	console.log(`${toDelete.length} occurrences supprimées`);
			// } catch (error) {
			// 	console.warn(`Impossible de supprimer les occurrences:`, error);
			// }

			try {
				for (const recordId of toDelete) {
					if (recordId) {
						await pb.collection("events").delete(recordId);
					}
				}
			} catch (error) {
				console.warn(`Impossible de supprimer les occurrences:`, error);
			}
		}
		// Batch de création
		if (toCreate.length > 0) {
			try {
				const batch = pb.createBatch();
				toCreate.forEach((record) => {
					batch.collection("events").create(record);
				});
				await batch.send();
				console.log(`${toCreate.length} nouvelles occurrences créées`);
			} catch (error) {
				console.warn(`Erreur lors de la création des occurrences:`, error);
			}
		}

		// Batch de mise à jour
		if (toUpdate.length > 0) {
			try {
				const updateBatch = pb.createBatch();
				toUpdate.forEach((record) => {
					const recordId = record.id;
					const updateData = { ...record };
					delete updateData.id; // On retire l'ID des données à mettre à jour
					updateBatch.collection("events").update(recordId, updateData);
				});
				await updateBatch.send();
				console.log(`${toUpdate.length} occurrences mises à jour`);
			} catch (error) {
				console.warn(`Erreur lors de la mise à jour des occurrences:`, error);
			}
		}
	} catch (error) {
		console.error("Erreur lors de la mise à jour des occurrences:", error);
		throw error;
	}
};

//::: Email send
export async function sendEmail(html: string, text: string, recipient: string) {
	try {
		// Encoder le HTML pour éviter les problèmes de caractères spéciaux
		const response = await pb.send("/api/send_email", {
			method: "POST",
			body: {
				html: html,
				text: text,
				recipient: recipient
			}
		});

		// Gérer la réponse
		if (response.success) {
			console.log("Email envoyé avec succès !");
		}
	} catch (error) {
		console.error("Erreur lors de l'envoi de l'email:", error);
	}
}

// TEST add to records then hook sendEmail
// export const sendEmail = async (data) => {
// 	const id = 'xl69b9bu7yjbaj7'; // TODO space ID
// 	const mailSend = {
// 		mailSend: data
// 	};
// 	try {
// 		await pb.collection('spaces_options').update(id, mailSend);
// 	} catch (error) {
// 		console.error(error);
// 	}
// };
// // TEST hook (dans pb_hooks/send_email.pb.js) →

// onRecordUpdate((e) => {
// 	console.log('onRecordUpdate', e);
// 	e.next();
// });

// Message
export const loadMessages = async (eventId: string) => {
	try {
		const messages = (await pb.collection("messages").getList(1, 20, {
			filter: `event = "${eventId}"`,
			sort: "created",
			expand: "user"
		})) as ListResult<MessagesResponse>;
		console.log("Messages chargés:", messages);
		return messages;
	} catch (error) {
		console.error("Error fetching messages:", error);
		throw error;
	}
};

export const sendMessage = async (
	eventId: string,
	content: string,
	parentId: string | null = null
) => {
	try {
		await pb.collection("messages").create({
			event: eventId,
			user: pb.authStore.model?.id,
			content: content,
			replyingTo: parentId,
			space: getSpace.id
		});
	} catch (error) {
		console.error("Error sending message:", error);
		throw error;
	}
};

// FIXIT ?
export const updateMessage = async (
	editContent: string,
	message: MessagesResponse,
	isEditing: boolean
) => {
	try {
		if (!editContent.trim() || editContent === message.content) {
			isEditing = false;
			return;
		}

		await pb.collection("messages").update(message.id, {
			content: editContent,
			isEdited: true
		});
	} catch (error) {
		console.error("Error updating message:", error);
		throw error;
	}
};

export const deleteMessage = async (message: MessagesResponse) => {
	try {
		if (confirm("Voulez-vous vraiment supprimer ce message ?")) {
			await pb.collection("messages").delete(message.id);
		}
	} catch (error) {
		console.error("Error deleting message:", error);
		throw error;
	}
};

// ::: locker edition

/**
 * Acquiert un verrou d'édition sur un document
 * @param collection Nom de la collection
 * @param recordId ID du document à verrouiller
 * @returns Le document mis à jour avec les informations de verrouillage, ou null en cas d'échec
 */
export async function acquireLock<T extends RecordModel>(
	collection: string,
	recordId: string
): Promise<T | null> {
	try {
		console.log(
			`Tentative d'acquisition du verrou pour le document ${recordId} dans ${collection}`
		);

		const userId = pb.authStore.model?.id;
		if (!userId) {
			console.error("Utilisateur non authentifié.");
			return null;
		}

		const data = {
			isEditing: true,
			editingUser: userId,
			lastEditHeartbeat: new Date().toISOString()
		};

		const record = await pb.collection(collection).update<T>(recordId, data);
		console.log(
			`Verrou acquis avec succès pour le document ${recordId} par l'utilisateur ${userId}`
		);
		return record;
	} catch (error) {
		console.error(`Erreur lors de l'acquisition du verrou pour le document ${recordId}:`, error);
		return null;
	}
}

/**
 * Rafraîchit le timestamp du verrou pour indiquer que l'utilisateur est toujours actif
 * @param collection Nom de la collection
 * @param recordId ID du document verrouillé
 * @returns Le document mis à jour, ou null si l'utilisateur n'a plus le verrou
 */
export async function refreshLock<T extends RecordModel>(
	collection: string,
	recordId: string
): Promise<T | null> {
	try {
		const userId = pb.authStore.model?.id;
		if (!userId) {
			console.error("Utilisateur non authentifié pour rafraîchir le verrou.");
			return null;
		}

		const data = {
			lastEditHeartbeat: new Date().toISOString()
		};

		// Utilise une condition dans l'update pour s'assurer qu'on est toujours l'éditeur
		const record = await pb
			.collection(collection)
			.update<T>(recordId, data, { filter: `editingUser = '${userId}'` });

		console.log(`Heartbeat rafraîchi pour le document ${recordId} par l'utilisateur ${userId}`);
		return record;
	} catch (error) {
		// Si le filter échoue (l'utilisateur n'est plus l'éditeur), PocketBase lèvera une erreur
		console.error(`Erreur lors du rafraîchissement du verrou pour le document ${recordId}:`, error);
		return null;
	}
}

/**
 * Libère le verrou d'édition sur un document
 * @param collection Nom de la collection
 * @param recordId ID du document à déverrouiller
 * @returns Le document mis à jour sans verrou
 */
export async function releaseLock<T extends RecordModel>(
	collection: string,
	recordId: string
): Promise<T> {
	try {
		console.log(`Libération du verrou pour le document ${recordId} dans ${collection}`);

		const data = {
			isEditing: false,
			editingUser: null
		};

		const record = await pb.collection(collection).update<T>(recordId, data);
		console.log(`Verrou libéré avec succès pour le document ${recordId}`);
		return record;
	} catch (error) {
		console.error(`Erreur lors de la libération du verrou pour le document ${recordId}:`, error);
		throw error;
	}
}

/**
 * Vérifie l'état du verrou d'un document via l'API
 * Utile pour nettoyer les verrous expirés ou détecter les conflits
 * @param collection Nom de la collection
 * @param recordId ID du document à vérifier
 */
export async function checkAndCleanLock(
	collection: string,
	recordId: string
): Promise<{ cleanedUp: boolean } | null> {
	console.log(`[Client] Checking lock status via API for document ${recordId} in ${collection}`);
	try {
		// Utilise l'instance pb pour construire l'URL et gérer l'authentification
		const response = await pb.send(`/check_and_clean_lock/${collection}/${recordId}`, {
			method: "GET"
		});

		console.log("[Client] Lock check API response:", response);
		return response;
	} catch (error) {
		console.error(`[Client] Error checking/cleaning lock for document ${recordId}:`, error);
		return null;
	}
}

// XXX ? Dans $lib/types/notifications.ts ?
export interface GenericEmailPayload {
	subject: string;
	htmlContent: string;
	textContent?: string; // Optionnel
	recipients?: string[]; // Emails explicites
	recipientGroups?: ("otherOrganizers" | "recurrenceTeam" | "spaceAdmins" | "systemAdmins")[]; // Mots-clés
	fallbackRecipientGroups?: (
		| "otherOrganizers"
		| "recurrenceTeam"
		| "spaceAdmins"
		| "systemAdmins"
	)[];
	context?: {
		eventId?: string;
		spaceId?: string;
		excludeUserId?: string;
		// Autres données contextuelles si nécessaire
	};
}

export async function sendGenericEmail(payload: GenericEmailPayload): Promise<void> {
	try {
		console.log("Payload being sent to /api/send_email:", JSON.stringify(payload, null, 2));
		// Appel de la nouvelle route backend
		await pb.send("/api/send_email", {
			method: "POST",
			body: payload,
			headers: {
				"Content-Type": "application/json"
			}
		});
		console.log("Generic email request sent successfully.");
	} catch (error: any) {
		console.error("Failed to send generic email:", error);
		// Afficher plus de détails si disponibles
		if (error?.response) {
			console.error("PocketBase error response:", error.response);
		}
		// Gérer l'erreur (Sentry, toast, etc.)
		throw error; // Propager
	}
}
