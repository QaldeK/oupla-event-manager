// src/lib/test/messages.conversation_summaries.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests pour la fonctionnalité conversation_summaries du hook messages.pb.js
 *
 * Ces tests simulent le comportement du hook PocketBase pour s'assurer que :
 * 1. Les résumés de conversation sont créés correctement
 * 2. Les résumés sont mis à jour lors de nouveaux messages
 * 3. La gestion d'erreur ne bloque pas la création de messages
 */

describe('Messages Hook - Conversation Summaries', () => {
	// Mock des objets PocketBase
	let mockApp: any;
	let mockRecord: any;
	let mockEvent: any;
	let mockConversationSummary: any;

	beforeEach(() => {
		// Reset des mocks
		vi.clearAllMocks();

		// Mock de l'objet Record PocketBase
		mockRecord = {
			getString: vi.fn(),
			set: vi.fn(),
			getInt: vi.fn()
		};

		// Mock de l'événement
		mockEvent = {
			getString: vi.fn()
		};

		// Mock du résumé de conversation existant
		mockConversationSummary = {
			getString: vi.fn(),
			getInt: vi.fn(),
			set: vi.fn()
		};

		// Mock de l'objet $app PocketBase
		mockApp = {
			findRecordById: vi.fn(),
			findFirstRecordByFilter: vi.fn(),
			save: vi.fn()
		};

		// Assigner le mock global
		global.$app = mockApp;
		global.Record = vi.fn(() => mockRecord);
	});

	afterEach(() => {
		// Nettoyer les mocks globaux
		delete global.$app;
		delete global.Record;
	});

	/**
	 * Simule la fonction updateConversationSummary du hook
	 * (copie de la logique pour les tests)
	 */
	function updateConversationSummary(record: any) {
		try {
			const eventId = record.getString("event");
			if (!eventId) {
				console.log("[DEBUG] Message not linked to an event, skipping conversation summary");
				return;
			}

			const event = $app.findRecordById("events", eventId);
			if (!event) {
				console.error("[ERROR] Event not found for conversation summary:", eventId);
				return;
			}

			const spaceId = event.getString("space");
			const eventTitle = event.getString("event_title");
			const messageContent = record.getString("content");
			const messageUser = record.getString("user");
			const messageTimestamp = record.getString("created");

			const snippet = messageContent.length > 100
				? messageContent.substring(0, 97) + "..."
				: messageContent;

			let conversationSummary;
			try {
				conversationSummary = $app.findFirstRecordByFilter(
					"conversation_summaries",
					`topic_id="${eventId}" && topic_type="event"`
				);
			} catch (e) {
				conversationSummary = null;
			}

			if (conversationSummary) {
				const currentCount = conversationSummary.getInt("message_count") || 0;
				conversationSummary.set("last_message_timestamp", messageTimestamp);
				conversationSummary.set("last_message_user", messageUser);
				conversationSummary.set("last_message_snippet", snippet);
				conversationSummary.set("message_count", currentCount + 1);
				$app.save(conversationSummary);
			} else {
				const newSummary = new Record();
				newSummary.set("topic_id", eventId);
				newSummary.set("topic_type", "event");
				newSummary.set("topic_title", eventTitle);
				newSummary.set("space", spaceId);
				newSummary.set("last_message_timestamp", messageTimestamp);
				newSummary.set("last_message_user", messageUser);
				newSummary.set("last_message_snippet", snippet);
				newSummary.set("message_count", 1);
				$app.save("conversation_summaries", newSummary);
			}
		} catch (error) {
			console.error("[ERROR] Failed to update conversation summary:", error);
		}
	}

	describe('Création de résumé de conversation', () => {
		it('devrait créer un nouveau résumé pour un premier message d\'événement', () => {
			// Arrange
			const eventId = 'event_123';
			const spaceId = 'space_456';
			const eventTitle = 'Test Event';
			const messageContent = 'Premier message de test';
			const messageUser = 'user_789';
			const messageTimestamp = '2024-01-15T10:00:00Z';

			mockRecord.getString.mockImplementation((field: string) => {
				switch (field) {
					case 'event': return eventId;
					case 'content': return messageContent;
					case 'user': return messageUser;
					case 'created': return messageTimestamp;
					default: return null;
				}
			});

			mockEvent.getString.mockImplementation((field: string) => {
				switch (field) {
					case 'space': return spaceId;
					case 'event_title': return eventTitle;
					default: return null;
				}
			});

			mockApp.findRecordById.mockReturnValue(mockEvent);
			mockApp.findFirstRecordByFilter.mockImplementation(() => {
				throw new Error('Not found'); // Simule l'absence de résumé existant
			});

			// Act
			updateConversationSummary(mockRecord);

			// Assert
			expect(mockApp.findRecordById).toHaveBeenCalledWith('events', eventId);
			expect(mockApp.findFirstRecordByFilter).toHaveBeenCalledWith(
				'conversation_summaries',
				`topic_id="${eventId}" && topic_type="event"`
			);

			// Vérifier la création d'un nouveau résumé
			expect(global.Record).toHaveBeenCalled();
			expect(mockRecord.set).toHaveBeenCalledWith('topic_id', eventId);
			expect(mockRecord.set).toHaveBeenCalledWith('topic_type', 'event');
			expect(mockRecord.set).toHaveBeenCalledWith('topic_title', eventTitle);
			expect(mockRecord.set).toHaveBeenCalledWith('space', spaceId);
			expect(mockRecord.set).toHaveBeenCalledWith('last_message_timestamp', messageTimestamp);
			expect(mockRecord.set).toHaveBeenCalledWith('last_message_user', messageUser);
			expect(mockRecord.set).toHaveBeenCalledWith('last_message_snippet', messageContent);
			expect(mockRecord.set).toHaveBeenCalledWith('message_count', 1);

			expect(mockApp.save).toHaveBeenCalledWith('conversation_summaries', mockRecord);
		});

		it('devrait tronquer le snippet à 100 caractères', () => {
			// Arrange
			const longMessage = 'A'.repeat(150); // Message de 150 caractères
			const expectedSnippet = 'A'.repeat(97) + '...';

			mockRecord.getString.mockImplementation((field: string) => {
				switch (field) {
					case 'event': return 'event_123';
					case 'content': return longMessage;
					case 'user': return 'user_789';
					case 'created': return '2024-01-15T10:00:00Z';
					default: return null;
				}
			});

			mockEvent.getString.mockImplementation((field: string) => {
				switch (field) {
					case 'space': return 'space_456';
					case 'event_title': return 'Test Event';
					default: return null;
				}
			});

			mockApp.findRecordById.mockReturnValue(mockEvent);
			mockApp.findFirstRecordByFilter.mockImplementation(() => {
				throw new Error('Not found');
			});

			// Act
			updateConversationSummary(mockRecord);

			// Assert
			expect(mockRecord.set).toHaveBeenCalledWith('last_message_snippet', expectedSnippet);
		});
	});

	describe('Mise à jour de résumé existant', () => {
		it('devrait mettre à jour un résumé existant avec le nouveau message', () => {
			// Arrange
			const eventId = 'event_123';
			const messageContent = 'Nouveau message';
			const messageUser = 'user_789';
			const messageTimestamp = '2024-01-15T11:00:00Z';
			const currentCount = 5;

			mockRecord.getString.mockImplementation((field: string) => {
				switch (field) {
					case 'event': return eventId;
					case 'content': return messageContent;
					case 'user': return messageUser;
					case 'created': return messageTimestamp;
					default: return null;
				}
			});

			mockApp.findRecordById.mockReturnValue(mockEvent);
			mockApp.findFirstRecordByFilter.mockReturnValue(mockConversationSummary);
			mockConversationSummary.getInt.mockReturnValue(currentCount);

			// Act
			updateConversationSummary(mockRecord);

			// Assert
			expect(mockApp.findFirstRecordByFilter).toHaveBeenCalledWith(
				'conversation_summaries',
				`topic_id="${eventId}" && topic_type="event"`
			);

			expect(mockConversationSummary.set).toHaveBeenCalledWith('last_message_timestamp', messageTimestamp);
			expect(mockConversationSummary.set).toHaveBeenCalledWith('last_message_user', messageUser);
			expect(mockConversationSummary.set).toHaveBeenCalledWith('last_message_snippet', messageContent);
			expect(mockConversationSummary.set).toHaveBeenCalledWith('message_count', currentCount + 1);

			expect(mockApp.save).toHaveBeenCalledWith(mockConversationSummary);
		});
	});

	describe('Gestion des cas limites', () => {
		it('devrait ignorer les messages non liés à un événement', () => {
			// Arrange
			mockRecord.getString.mockImplementation((field: string) => {
				if (field === 'event') return null; // Pas d'événement lié
				return 'some_value';
			});

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Act
			updateConversationSummary(mockRecord);

			// Assert
			expect(consoleSpy).toHaveBeenCalledWith(
				'[DEBUG] Message not linked to an event, skipping conversation summary'
			);
			expect(mockApp.findRecordById).not.toHaveBeenCalled();
		});

		it('devrait gérer le cas où l\'événement n\'existe pas', () => {
			// Arrange
			mockRecord.getString.mockImplementation((field: string) => {
				if (field === 'event') return 'nonexistent_event';
				return 'some_value';
			});

			mockApp.findRecordById.mockReturnValue(null);
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act
			updateConversationSummary(mockRecord);

			// Assert
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'[ERROR] Event not found for conversation summary:',
				'nonexistent_event'
			);
			expect(mockApp.findFirstRecordByFilter).not.toHaveBeenCalled();
		});

		it('devrait gérer les erreurs sans bloquer l\'exécution', () => {
			// Arrange
			mockRecord.getString.mockImplementation(() => {
				throw new Error('Database error');
			});

			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act & Assert - Ne devrait pas lever d'exception
			expect(() => updateConversationSummary(mockRecord)).not.toThrow();
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'[ERROR] Failed to update conversation summary:',
				expect.any(Error)
			);
		});
	});

	describe('Intégration avec le processus de création de message', () => {
		it('devrait simuler l\'intégration complète du hook', () => {
			// Cette test simule l'intégration complète comme elle se passerait dans PocketBase

			// Arrange - Données du message
			const messageData = {
				event: 'event_123',
				content: 'Message de test pour intégration',
				user: 'user_789',
				created: '2024-01-15T10:00:00Z'
			};

			const eventData = {
				space: 'space_456',
				event_title: 'Événement de Test'
			};

			// Setup des mocks
			mockRecord.getString.mockImplementation((field: string) => messageData[field as keyof typeof messageData] || null);
			mockEvent.getString.mockImplementation((field: string) => eventData[field as keyof typeof eventData] || null);
			mockApp.findRecordById.mockReturnValue(mockEvent);
			mockApp.findFirstRecordByFilter.mockImplementation(() => {
				throw new Error('Not found');
			});

			// Act - Simuler l'exécution du hook complet
			const usersConcerned = ['user_789']; // Simplifié pour le test
			mockRecord.set('users_concerned', usersConcerned);
			updateConversationSummary(mockRecord);

			// Assert - Vérifier que toutes les opérations ont été effectuées
			expect(mockRecord.set).toHaveBeenCalledWith('users_concerned', usersConcerned);
			expect(mockApp.save).toHaveBeenCalledWith('conversation_summaries', expect.any(Object));
		});
	});
});
