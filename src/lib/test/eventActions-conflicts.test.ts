// src/lib/test/eventActions-conflicts.test.ts
/**
 * COMMANDES POUR EXÉCUTER CES TESTS :
 * 
 * # Exécuter tous les tests de ce fichier
 * bun run test eventActions-conflicts.test.ts
 * 
 * # Exécuter tous les tests
 * bun run test
 * 
 * # Exécuter un test spécifique par nom
 * bun run test:unit -- -t "handleEventConflictsAfterSave"
 * bun run test:unit -- -t "updateEventConflicts"
 * bun run test:unit -- -t "should handle conflicts for NEW_SINGLE event"
 * bun run test:unit -- -t "should handle conflicts for EDIT_SINGLE event"
 * bun run test:unit -- -t "should handle conflicts for NEW_RECURRENT event"
 * 
 * # Exécuter avec watch mode
 * bun run test --watch eventActions-conflicts.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleEventConflictsAfterSave, updateEventConflicts } from '$lib/services/eventActions';
import { updateEvent, updateReciprocalConflicts, pb } from '$lib/pocketbase.svelte';
import type { EventType } from '$lib/types/event.types';

// Mock des dépendances
vi.mock('$lib/pocketbase.svelte', () => ({
	updateEvent: vi.fn(),
	updateReciprocalConflicts: vi.fn(),
	pb: {
		collection: vi.fn(() => ({
			getOne: vi.fn().mockResolvedValue({
				id: 'mock-event',
				inConflictWith: []
			}),
			update: vi.fn()
		}))
	}
}));

vi.mock('$lib/shared', () => ({
	showAlert: vi.fn()
}));

describe('handleEventConflictsAfterSave', () => {
	const mockEvent: Partial<EventType> = {
		id: 'event-123',
		event_title: 'Test Event',
		date_event: '2024-01-01',
		time_start: '10:00',
		time_end: '12:00',
		rooms: ['room1'],
		categories: ['category1'],
		tasks: [],
		description: '',
		desc_public: '',
		is_prix_libre: true,
		isMixiteChoisie: false,
		is_age_no_restriction: true,
		isConfirmed: false,
		isPublic: true,
		isPublished: false,
		isSendToNewsletter: false,
		canceled: false,
		isRecurrent: false,
		isMasterRecurrent: false,
		isSondage: false,
		organizers: [],
		dates_proposed: [],
		other_date_query: [],
		inConflictWith: []
	};

	beforeEach(() => {
		vi.clearAllMocks();
		
		// Setup default mocks
		const mockGetOne = vi.fn();
		const mockUpdate = vi.fn();
		
		(pb.collection as any).mockReturnValue({
			getOne: mockGetOne.mockResolvedValue({
				id: 'mock-event',
				inConflictWith: []
			}),
			update: mockUpdate.mockResolvedValue({})
		});
		
		(updateEvent as any).mockResolvedValue({});
		(updateReciprocalConflicts as any).mockResolvedValue({});
	});

	it('should handle conflicts for NEW_SINGLE event', async () => {
		const conflictIds = ['conflict-1', 'conflict-2'];
		
		await handleEventConflictsAfterSave('NEW_SINGLE', mockEvent as EventType, conflictIds);

		expect(updateEvent).toHaveBeenCalledWith(mockEvent.id, { inConflictWith: conflictIds });
		expect(updateReciprocalConflicts).toHaveBeenCalledWith(mockEvent.id, conflictIds);
	});

	it('should handle conflicts for EDIT_SINGLE event', async () => {
		const conflictIds = ['conflict-1'];
		const eventWithPreviousConflicts = {
			...mockEvent,
			inConflictWith: ['old-conflict-1', 'old-conflict-2']
		};

		await handleEventConflictsAfterSave('EDIT_SINGLE', eventWithPreviousConflicts as EventType, conflictIds);

		expect(updateEvent).toHaveBeenCalledWith(mockEvent.id, { inConflictWith: conflictIds });
	});

	it('should handle conflicts for NEW_RECURRENT event', async () => {
		const conflictIds = ['conflict-1'];
		const eventIds = ['event-1', 'event-2', 'event-3'];
		
		// Mock l'événement avec des dates de récurrence
		const mockRecurrentEvent = {
			...mockEvent,
			recurrence: {
				recurrenceDates: ['2024-01-01', '2024-01-08', '2024-01-15']
			}
		};

		await handleEventConflictsAfterSave('NEW_RECURRENT', mockRecurrentEvent as EventType, conflictIds, eventIds);

		// Vérifie que updateEvent a été appelé pour gérer les conflits
		// Note: avec la nouvelle logique, les appels passent par updateEventConflicts
		expect(updateEvent).toHaveBeenCalled();
		expect(updateReciprocalConflicts).toHaveBeenCalled();
	});

	it('should handle no conflicts by clearing inConflictWith field', async () => {
		const conflictIds: string[] = [];
		const eventWithConflicts = {
			...mockEvent,
			inConflictWith: ['old-conflict-1']
		};

		await handleEventConflictsAfterSave('EDIT_SINGLE', eventWithConflicts as EventType, conflictIds);

		expect(updateEvent).toHaveBeenCalledWith(mockEvent.id, { inConflictWith: [] });
	});

	it('should handle unknown event mode gracefully', async () => {
		const conflictIds = ['conflict-1'];
		
		await handleEventConflictsAfterSave('UNKNOWN_MODE', mockEvent as EventType, conflictIds);

		// Should not throw, but should log warning (we can't easily test console.warn)
		expect(updateEvent).not.toHaveBeenCalled();
	});

	it('should not fail if event has no ID', async () => {
		const eventWithoutId = { ...mockEvent, id: undefined };
		const conflictIds = ['conflict-1'];
		
		await handleEventConflictsAfterSave('NEW_SINGLE', eventWithoutId as unknown as EventType, conflictIds);

		// Should not call updateEvent if no ID
		expect(updateEvent).not.toHaveBeenCalled();
	});
});

describe('updateEventConflicts', () => {
	const eventId = 'event-123';
	const conflictIds = ['conflict-1', 'conflict-2'];
	const previousConflictIds = ['old-conflict-1'];

	beforeEach(() => {
		vi.clearAllMocks();
		
		// Mock pb.collection().getOne() pour retourner un événement fictif
		const mockCollection = {
			getOne: vi.fn().mockResolvedValue({
				id: 'old-conflict-1',
				inConflictWith: ['event-123', 'other-event']
			}),
			update: vi.fn().mockResolvedValue({})
		};
		(pb.collection as any).mockReturnValue(mockCollection);
		
		// Mock updateEvent pour éviter les erreurs
		(updateEvent as any).mockResolvedValue({});
		(updateReciprocalConflicts as any).mockResolvedValue({});
	});

	it('should update event with new conflicts and manage reciprocal conflicts', async () => {
		await updateEventConflicts(eventId, conflictIds, previousConflictIds);

		// Vérifie que l'événement principal est mis à jour
		expect(updateEvent).toHaveBeenCalledWith(eventId, { inConflictWith: conflictIds });
		
		// Vérifie que les conflits réciproques sont mis à jour
		expect(updateReciprocalConflicts).toHaveBeenCalledWith(eventId, conflictIds);
		
		// Vérifie que les anciens conflits sont nettoyés
		expect(pb.collection).toHaveBeenCalledWith('events');
	});

	it('should handle empty conflict lists', async () => {
		await updateEventConflicts(eventId, [], []);

		expect(updateEvent).toHaveBeenCalledWith(eventId, { inConflictWith: [] });
		expect(updateReciprocalConflicts).not.toHaveBeenCalled();
	});

	it('should handle errors gracefully when cleaning old conflicts', async () => {
		const mockCollection = {
			getOne: vi.fn().mockRejectedValue(new Error('Event not found')),
			update: vi.fn()
		};
		(pb.collection as any).mockReturnValue(mockCollection);

		// Should not throw even if cleaning old conflicts fails
		await expect(updateEventConflicts(eventId, conflictIds, previousConflictIds))
			.resolves.not.toThrow();

		// Should still update the main event
		expect(updateEvent).toHaveBeenCalledWith(eventId, { inConflictWith: conflictIds });
	});
});