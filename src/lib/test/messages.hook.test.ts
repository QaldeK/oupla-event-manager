// src/lib/test/messages.hook.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests unitaires pour le hook messages.pb.js
 *
 * Note: Ces tests simulent le comportement du hook backend
 * car nous ne pouvons pas tester directement le code PocketBase
 */

// Mock des fonctions PocketBase
const mockFindRecordById = vi.fn();
const mockFindRecordsByFilter = vi.fn();

// Mock de l'objet global $app de PocketBase
globalThis.$app = {
	findRecordById: mockFindRecordById,
	findRecordsByFilter: mockFindRecordsByFilter
};

// Simulation des fonctions du hook messages.pb.js
function getEventActors(eventId: string): string[] {
	try {
		const event = mockFindRecordById('events', eventId);
		const userIds = new Set<string>();

		// Ajouter le créateur
		const createdBy = event.created_by;
		if (createdBy) {
			userIds.add(createdBy);
		}

		// Ajouter les organisateurs
		if (event.organizers) {
			const organizers = JSON.parse(event.organizers);
			if (Array.isArray(organizers)) {
				organizers.forEach(org => {
					if (org.id) {
						userIds.add(org.id);
					}
				});
			}
		}

		// Ajouter les participants aux sondages (dates_proposed)
		if (event.dates_proposed) {
			const datesProposed = JSON.parse(event.dates_proposed);
			if (Array.isArray(datesProposed)) {
				datesProposed.forEach(dateProposal => {
					if (dateProposal.organizers && Array.isArray(dateProposal.organizers)) {
						dateProposal.organizers.forEach(org => {
							if (org.id) {
								userIds.add(org.id);
							}
						});
					}
				});
			}
		}

		// Ajouter l'équipe de récurrence
		if (event.recurrence) {
			const recurrence = JSON.parse(event.recurrence);
			if (recurrence.recurrenceTeam && Array.isArray(recurrence.recurrenceTeam)) {
				recurrence.recurrenceTeam.forEach(member => {
					if (member.id) {
						userIds.add(member.id);
					}
				});
			}
		}

		return Array.from(userIds);
	} catch (error) {
		console.error('[ERROR] Failed to retrieve event actors for ID:', eventId, error);
		return [];
	}
}

function getPreviousDiscussionParticipants(eventId: string, currentMessageId: string): string[] {
	try {
		const filter = `event="${eventId}" && id!="${currentMessageId}"`;
		const previousMessages = mockFindRecordsByFilter('messages', filter, '-created', 500);

		const participantIds = new Set<string>();
		previousMessages.forEach(message => {
			const userId = message.user;
			if (userId) {
				participantIds.add(userId);
			}
		});

		return Array.from(participantIds);
	} catch (error) {
		console.error('[ERROR] Failed to retrieve previous discussion participants:', error);
		return [];
	}
}

function calculateUsersConcerned(record: any): string[] {
	const userIds = new Set<string>();

	// 1. Ajouter l'auteur du message
	const authorId = record.user;
	if (authorId) {
		userIds.add(authorId);
	}

	// 2. Si c'est une réponse, ajouter l'auteur du message original
	const replyingToId = record.replyingTo;
	if (replyingToId) {
		try {
			const originalMessage = mockFindRecordById('messages', replyingToId);
			const originalAuthorId = originalMessage.user;
			if (originalAuthorId) {
				userIds.add(originalAuthorId);
			}
		} catch (error) {
			console.error('[ERROR] Failed to retrieve original message author:', error);
		}
	}

	// 3. Si lié à un événement, ajouter tous les acteurs de l'événement
	const eventId = record.event;
	if (eventId) {
		const eventActors = getEventActors(eventId);
		eventActors.forEach(actorId => userIds.add(actorId));

		// 4. Ajouter tous les participants précédents à la discussion
		const previousParticipants = getPreviousDiscussionParticipants(eventId, record.id);
		previousParticipants.forEach(participantId => userIds.add(participantId));
	}

	// Filtrer les valeurs nulles/undefined et retourner le tableau
	return Array.from(userIds).filter(Boolean);
}

describe('Messages Hook Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getEventActors', () => {
		it('devrait retourner le créateur de l\'événement', () => {
			const mockEvent = {
				id: 'event1',
				created_by: 'user1',
				organizers: null,
				dates_proposed: null,
				recurrence: null
			};

			mockFindRecordById.mockReturnValue(mockEvent);

			const result = getEventActors('event1');

			expect(result).toEqual(['user1']);
			expect(mockFindRecordById).toHaveBeenCalledWith('events', 'event1');
		});

		it('devrait retourner le créateur et les organisateurs', () => {
			const mockEvent = {
				id: 'event1',
				created_by: 'user1',
				organizers: JSON.stringify([
					{ id: 'user2', username: 'organizer1' },
					{ id: 'user3', username: 'organizer2' }
				]),
				dates_proposed: null,
				recurrence: null
			};

			mockFindRecordById.mockReturnValue(mockEvent);

			const result = getEventActors('event1');

			expect(result).toEqual(expect.arrayContaining(['user1', 'user2', 'user3']));
			expect(result).toHaveLength(3);
		});

		it('devrait inclure les participants aux sondages', () => {
			const mockEvent = {
				id: 'event1',
				created_by: 'user1',
				organizers: null,
				dates_proposed: JSON.stringify([
					{
						dateStart: '2024-01-01T10:00:00Z',
						dateEnd: '2024-01-01T12:00:00Z',
						organizers: [
							{ id: 'user4', username: 'participant1' },
							{ id: 'user5', username: 'participant2' }
						]
					}
				]),
				recurrence: null
			};

			mockFindRecordById.mockReturnValue(mockEvent);

			const result = getEventActors('event1');

			expect(result).toEqual(expect.arrayContaining(['user1', 'user4', 'user5']));
			expect(result).toHaveLength(3);
		});

		it('devrait inclure l\'équipe de récurrence', () => {
			const mockEvent = {
				id: 'event1',
				created_by: 'user1',
				organizers: null,
				dates_proposed: null,
				recurrence: JSON.stringify({
					recurrenceTeam: [
						{ id: 'user6', username: 'team1' },
						{ id: 'user7', username: 'team2' }
					]
				})
			};

			mockFindRecordById.mockReturnValue(mockEvent);

			const result = getEventActors('event1');

			expect(result).toEqual(expect.arrayContaining(['user1', 'user6', 'user7']));
			expect(result).toHaveLength(3);
		});

		it('devrait gérer les erreurs gracieusement', () => {
			mockFindRecordById.mockImplementation(() => {
				throw new Error('Event not found');
			});

			const result = getEventActors('nonexistent');

			expect(result).toEqual([]);
		});

		it('devrait éviter les doublons', () => {
			const mockEvent = {
				id: 'event1',
				created_by: 'user1',
				organizers: JSON.stringify([
					{ id: 'user1', username: 'creator_also_organizer' }, // Même que created_by
					{ id: 'user2', username: 'organizer' }
				]),
				dates_proposed: null,
				recurrence: null
			};

			mockFindRecordById.mockReturnValue(mockEvent);

			const result = getEventActors('event1');

			expect(result).toEqual(['user1', 'user2']);
			expect(result).toHaveLength(2);
		});
	});

	describe('getPreviousDiscussionParticipants', () => {
		it('devrait retourner les participants précédents', () => {
			const mockMessages = [
				{ id: 'msg1', user: 'user1', event: 'event1' },
				{ id: 'msg2', user: 'user2', event: 'event1' },
				{ id: 'msg3', user: 'user1', event: 'event1' } // Doublon, devrait être déupliqué
			];

			mockFindRecordsByFilter.mockReturnValue(mockMessages);

			const result = getPreviousDiscussionParticipants('event1', 'current_msg');

			expect(result).toEqual(['user1', 'user2']);
			expect(mockFindRecordsByFilter).toHaveBeenCalledWith(
				'messages',
				'event="event1" && id!="current_msg"',
				'-created',
				500
			);
		});

		it('devrait retourner un tableau vide s\'il n\'y a pas de messages précédents', () => {
			mockFindRecordsByFilter.mockReturnValue([]);

			const result = getPreviousDiscussionParticipants('event1', 'current_msg');

			expect(result).toEqual([]);
		});

		it('devrait gérer les erreurs gracieusement', () => {
			mockFindRecordsByFilter.mockImplementation(() => {
				throw new Error('Database error');
			});

			const result = getPreviousDiscussionParticipants('event1', 'current_msg');

			expect(result).toEqual([]);
		});
	});

	describe('calculateUsersConcerned', () => {
		it('devrait calculer les utilisateurs concernés pour un message simple', () => {
			const mockRecord = {
				id: 'msg1',
				user: 'user1',
				event: null,
				replyingTo: null
			};

			const result = calculateUsersConcerned(mockRecord);

			expect(result).toEqual(['user1']);
		});

		it('devrait inclure l\'auteur du message original en cas de réponse', () => {
			const mockRecord = {
				id: 'msg2',
				user: 'user2',
				event: null,
				replyingTo: 'msg1'
			};

			const mockOriginalMessage = {
				id: 'msg1',
				user: 'user1'
			};

			mockFindRecordById.mockReturnValue(mockOriginalMessage);

			const result = calculateUsersConcerned(mockRecord);

			expect(result).toEqual(['user2', 'user1']);
			expect(mockFindRecordById).toHaveBeenCalledWith('messages', 'msg1');
		});

		it('devrait calculer les utilisateurs pour un message lié à un événement', () => {
			const mockRecord = {
				id: 'msg1',
				user: 'user1',
				event: 'event1',
				replyingTo: null
			};

			const mockEvent = {
				id: 'event1',
				created_by: 'user2',
				organizers: JSON.stringify([{ id: 'user3', username: 'org1' }]),
				dates_proposed: null,
				recurrence: null
			};

			const mockPreviousMessages = [
				{ id: 'msg0', user: 'user4', event: 'event1' }
			];

			mockFindRecordById.mockReturnValue(mockEvent);
			mockFindRecordsByFilter.mockReturnValue(mockPreviousMessages);

			const result = calculateUsersConcerned(mockRecord);

			expect(result).toEqual(expect.arrayContaining(['user1', 'user2', 'user3', 'user4']));
			expect(result).toHaveLength(4);
		});

		it('devrait éviter les doublons dans le calcul final', () => {
			const mockRecord = {
				id: 'msg2',
				user: 'user1', // Même utilisateur que l'auteur original
				event: 'event1',
				replyingTo: 'msg1'
			};

			const mockOriginalMessage = {
				id: 'msg1',
				user: 'user1' // Même utilisateur que l'auteur du message actuel
			};

			const mockEvent = {
				id: 'event1',
				created_by: 'user1', // Encore le même utilisateur
				organizers: JSON.stringify([{ id: 'user2', username: 'org1' }]),
				dates_proposed: null,
				recurrence: null
			};

			const mockPreviousMessages = [
				{ id: 'msg1', user: 'user1', event: 'event1' } // Encore le même
			];

			mockFindRecordById
				.mockReturnValueOnce(mockOriginalMessage) // Premier appel pour replyingTo
				.mockReturnValueOnce(mockEvent); // Second appel pour l'événement

			mockFindRecordsByFilter.mockReturnValue(mockPreviousMessages);

			const result = calculateUsersConcerned(mockRecord);

			expect(result).toEqual(['user1', 'user2']);
			expect(result).toHaveLength(2);
		});

		it('devrait filtrer les valeurs nulles/undefined', () => {
			const mockRecord = {
				id: 'msg1',
				user: 'user1',
				event: 'event1',
				replyingTo: null
			};

			const mockEvent = {
				id: 'event1',
				created_by: null, // Valeur nulle
				organizers: JSON.stringify([
					{ id: 'user2', username: 'org1' },
					{ id: null, username: 'invalid_org' } // ID null
				]),
				dates_proposed: null,
				recurrence: null
			};

			const mockPreviousMessages = [
				{ id: 'msg0', user: undefined, event: 'event1' } // Utilisateur undefined
			];

			mockFindRecordById.mockReturnValue(mockEvent);
			mockFindRecordsByFilter.mockReturnValue(mockPreviousMessages);

			const result = calculateUsersConcerned(mockRecord);

			expect(result).toEqual(['user1', 'user2']);
			expect(result).toHaveLength(2);
		});
	});
});
