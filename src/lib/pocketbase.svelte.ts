import { eventsStore } from '$lib/shared/eventsStore.svelte';
import type {
	Collections,
	EventsRecord,
	EventsResponse,
	MessagesResponse,
	SpacesOptionsResponse,
	UsersResponse
} from '$lib/types/pocketbase';
import { createDateFromString } from '$lib/utils';
import { getSpace } from '$lib/shared/spaceOptions.svelte';
import PocketBase from 'pocketbase';
import type {
	ListOptions,
	ListResult,
	RecordModel,
	RecordService,
	SubscribeOptions,
	TypedPocketBase
} from 'pocketbase';

import type { EventType } from './types/event';

type GetOneOptions = {
	expand?: string;
	fields?: string;
};

// const pb = new PocketBase('https://oupla.pockethost.io/');
const pb = new PocketBase('http://127.0.0.1:8090') as TypedPocketBase;
export { pb };

// Pour les visiteurs non connectés
export async function loadPublicEvents(spaceId: string) {
	return await pb.collection('events').getFullList<EventType>({
		filter: `space = '${spaceId}' && isConfirmed = true && date_event >= '${new Date().toISOString().split('T')[0]}'`,
		sort: 'date_event'
	});
}

export const modifyRecord = async (collection: string, id: string, data: object) => {
	try {
		await pb.collection(collection).update(id, data);
	} catch (error) {
		console.error(error);
	}
};

export const updateEvent = async (eventID: string, data: Partial<EventsRecord>) => {
	try {
		await pb.collection('events').update(eventID, data);
	} catch (error) {
		console.error(error);
	}
};

export const createEvent = async (data: Partial<EventsRecord>) => {
	try {
		const record = await pb.collection('events').create({ ...data, space: getSpace.id });
		return record;
	} catch (error) {
		console.error(error);
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

// Fonction pour s'abonner aux changements d'une collection
export const subscribe = <T extends RecordModel>(
	collectionName: Collections,
	callback: (data: T) => void,
	options?: SubscribeOptions
) => {
	pb.collection(collectionName).subscribe(
		'*',
		(data) => {
			callback(data.record as T);
		},
		options
	);
};

// Fonction pour annuler l'abonnement
export const unsubscribe = (collectionName: string, topic: string = '*'): void => {
	pb.collection(collectionName).unsubscribe(topic);
};

// Fonction pour récupérer le premier élément d'une liste filtrée
export const getFirstListItem = async <T extends RecordModel>(
	collectionName: Collections,
	filter?: string,
	options?: GetOneOptions
): Promise<T> => {
	try {
		return await pb.collection(collectionName).getFirstListItem(filter || '', options);
	} catch (error) {
		console.error(
			`Erreur lors de la récupération du premier élément dans ${collectionName}:`,
			error
		);
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
			date_event: '', // on ne met pas de date à l'event master
			space: getSpace.id,
			recurrence: {
				...eventData.recurrence,
				tasks: eventData.tasks
			},
			dateStart: null,
			dateEnd: null
		};

		const masterRecord = await pb.collection('events').create({ ...masterEvent });
		console.log('Master event créé:', masterRecord.id);
		const recurrenceDates = eventData.recurrence.recurrenceDates;

		// Créer les occurrences
		const batch = pb.createBatch();
		recurrenceDates.forEach((date, index) => {
			const dateStart = createDateFromString(date, eventData.time_start);
			const dateEnd = createDateFromString(date, eventData.time_end);
			const occurrenceData = {
				...eventData,
				space: getSpace.id,
				date_event: date,
				masterRecurrentId: masterRecord.id,
				isMasterRecurrent: false,
				recurrence: {
					...eventData.recurrence,
					tasks: eventData.tasks
				},
				dateStart,
				dateEnd
			};

			batch.collection('events').create(occurrenceData);
		});

		// ts-int:disable-next-line: no-unused-expression
		const createOccurrences = await batch.send();
		console.log('Création des événements récurrents terminée');
	} catch (error) {
		console.error('Erreur lors de la création des événements récurrents:', error);
		throw error;
	}
};

// Ajout de la fonction pour mettre à jour toutes les occurrences d'un événement récurrent
// FIXIT
export const updateAllOccurrences = async (masterEvent: EventType) => {
	try {
		const recurrenceDates = masterEvent.recurrence.recurrenceDates;

		// Fonction utilitaire pour nettoyer les données avant l'envoi
		const cleanEventData = (event) => {
			// On crée une copie pour ne pas modifier l'original
			const cleanedData = { ...event };
			// Suppression des champs générés par PocketBase
			delete cleanedData.collectionId;
			delete cleanedData.collectionName;
			delete cleanedData.created;
			delete cleanedData.updated;
			return cleanedData;
		};

		// 1. Mise à jour du master event
		const cleanedMasterEvent = cleanEventData(masterEvent);
		cleanedMasterEvent.date_event = ''; // Master event n'a pas de date
		await pb.collection('events').update(masterEvent.id, cleanedMasterEvent);

		// 2. Récupérer les occurrences existantes liées à cet événement master
		const existingOccurrences = eventsStore.getEventsOccurences.filter(
			(event) => event.masterRecurrentId === masterEvent.id
		);

		const occurrencesMap = new Map(
			existingOccurrences
				.filter((event) => event.masterRecurrentId === masterEvent.id)
				.map((occ) => [occ.date_event, occ])
		);

		// Identification des actions nécessaires
		const toDelete = existingOccurrences
			.filter((occ) => !recurrenceDates.includes(occ.date_event))
			.map((occ) => occ.id);

		const toCreate = recurrenceDates
			.filter((occ) => !occurrencesMap.has(occ))
			.map((occ) => ({
				...cleanEventData(masterEvent),
				date_event: occ,
				masterRecurrentId: masterEvent.id,
				isMasterRecurrent: false,
				tasks: masterEvent.recurrence.tasks,
				dateStart: createDateFromString(occ, masterEvent.time_start),
				dateEnd: createDateFromString(occ, masterEvent.time_end)
			}));

		const toUpdate = recurrenceDates
			.filter((date) => occurrencesMap.has(date))
			.map((date) => {
				const existingOccurrence = occurrencesMap.get(date);
				return {
					...cleanEventData(masterEvent),
					id: existingOccurrence.id,
					date_event: date,
					isMasterRecurrent: false,
					isRecurrent: true,
					masterRecurrentId: masterEvent.id,
					organizers: existingOccurrence.organizers,
					tasks: existingOccurrence.tasks,
					recurrence: {
						...masterEvent.recurrence
					},
					dateStart: createDateFromString(date, masterEvent.time_start),
					dateEnd: createDateFromString(date, masterEvent.time_end)
				};
			});

		// $inspect('reccurenceDates', $state.snapshot(recurrenceDates));
		// $inspect('toCreate', toCreate);
		// $inspect('toDelete', toDelete);
		// $inspect('toUpdate', toUpdate);

		// 4. Exécuter les batches séparément
		// Batch de suppression
		if (toDelete.length) {
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
						await pb.collection('events').delete(recordId);
					}
				}
			} catch (error) {
				console.warn(`Impossible de supprimer les occurrences:`, error);
			}
		}
		// Batch de création
		if (toCreate.length) {
			try {
				const createBatch = pb.createBatch();
				toCreate.forEach((record) => {
					delete record.id; // On reset les donnée
					createBatch.collection('events').create(record);
				});
				await createBatch.send();
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
					delete record.id; // On retire l'ID des données à mettre à jour
					updateBatch.collection('events').update(recordId, record);
				});
				await updateBatch.send();
				console.log(`${toUpdate.length} occurrences mises à jour`);
			} catch (error) {
				console.warn(`Erreur lors de la mise à jour des occurrences:`, error);
			}
		}
	} catch (error) {
		console.error('Erreur lors de la mise à jour des occurrences:', error);
		throw error;
	}
};

//::: Email send
export async function sendEmail(html: string, text: string, recipient: string) {
	try {
		// Encoder le HTML pour éviter les problèmes de caractères spéciaux
		const response = await pb.send('/api/send_email', {
			method: 'POST',
			body: {
				html: html,
				text: text,
				recipient: recipient
			}
		});

		// Gérer la réponse
		if (response.success) {
			console.log('Email envoyé avec succès !');
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
		const messages = (await pb.collection('messages').getList(1, 20, {
			filter: `event = "${eventId}"`,
			sort: 'created',
			expand: 'user'
		})) as ListResult<MessagesResponse>;
		console.log('Messages chargés:', messages);
		return messages;
	} catch (error) {
		console.error('Error fetching messages:', error);
		throw error;
	}
};

export const sendMessage = async (
	eventId: string,
	content: string,
	parentId: string | null = null
) => {
	try {
		await pb.collection('messages').create({
			event: eventId,
			user: pb.authStore.model?.id,
			content: content,
			replyingTo: parentId,
			space: getSpace.id
		});
	} catch (error) {
		console.error('Error sending message:', error);
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

		await pb.collection('messages').update(message.id, {
			content: editContent,
			isEdited: true
		});
	} catch (error) {
		console.error('Error updating message:', error);
		throw error;
	}
};

export const deleteMessage = async (message: MessagesResponse) => {
	try {
		if (confirm('Voulez-vous vraiment supprimer ce message ?')) {
			await pb.collection('messages').delete(message.id);
		}
	} catch (error) {
		console.error('Error deleting message:', error);
		throw error;
	}
};
