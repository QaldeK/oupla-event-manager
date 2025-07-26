// src/lib/test/notificationUtils.test.ts
import { describe, it, expect } from "vitest";
import { NotificationUtils, type GroupedNotification } from "$lib/utils/notificationUtils";
import type { LogsResponse, MessagesResponse } from "$lib/types/pocketbase";

describe("NotificationUtils", () => {
	describe("generateMessage", () => {
		it("devrait générer un message pour une notification groupée avec plusieurs messages", () => {
			const groupedNotification: GroupedNotification = {
				id: "grouped_1",
				type: "grouped_messages",
				eventId: "event1",
				eventTitle: "Mon événement",
				count: 3,
				created: "2024-01-01T10:00:00.000Z",
				latestMessage: {} as MessagesResponse,
				isUnread: true
			};

			const result = NotificationUtils.generateMessage(groupedNotification);

			expect(result).toBe('3 nouveaux messages dans "Mon événement"');
		});

		it("devrait générer un message pour un seul message groupé", () => {
			const singleGroupedNotification: GroupedNotification = {
				id: "grouped_1",
				type: "grouped_messages",
				eventId: "event1",
				eventTitle: "Mon événement",
				count: 1,
				created: "2024-01-01T10:00:00.000Z",
				latestMessage: {} as MessagesResponse,
				isUnread: true
			};

			const result = NotificationUtils.generateMessage(singleGroupedNotification);

			expect(result).toBe('1 nouveau message dans "Mon événement"');
		});
	});

	describe("getNotificationType", () => {
		it('devrait retourner "grouped" pour une notification groupée', () => {
			const groupedNotification: GroupedNotification = {
				id: "grouped_1",
				type: "grouped_messages",
				eventId: "event1",
				eventTitle: "Mon événement",
				count: 3,
				created: "2024-01-01T10:00:00.000Z",
				latestMessage: {} as MessagesResponse,
				isUnread: true
			};

			const result = NotificationUtils.getNotificationType(groupedNotification);
			expect(result).toBe("grouped");
		});

		it('devrait retourner "log" pour un log', () => {
			const logNotification = {
				id: "log1",
				action: "create_event",
				created: "2024-01-01T10:00:00.000Z"
			} as LogsResponse;

			const result = NotificationUtils.getNotificationType(logNotification);
			expect(result).toBe("log");
		});

		it('devrait retourner "message" pour un message individuel', () => {
			const messageNotification = {
				id: "msg1",
				message: "Hello",
				created: "2024-01-01T10:00:00.000Z"
			} as MessagesResponse;

			const result = NotificationUtils.getNotificationType(messageNotification);
			expect(result).toBe("message");
		});
	});

	describe("isUnread", () => {
		it("devrait retourner la propriété isUnread pour les notifications groupées", () => {
			const groupedNotification: GroupedNotification = {
				id: "grouped_1",
				type: "grouped_messages",
				eventId: "event1",
				eventTitle: "Mon événement",
				count: 3,
				created: "2024-01-01T10:00:00.000Z",
				latestMessage: {} as MessagesResponse,
				isUnread: true
			};

			const result = NotificationUtils.isUnread(groupedNotification);
			expect(result).toBe(true);
		});

		it("devrait retourner false pour une notification groupée lue", () => {
			const readGroupedNotification: GroupedNotification = {
				id: "grouped_2",
				type: "grouped_messages",
				eventId: "event2",
				eventTitle: "Autre événement",
				count: 2,
				created: "2024-01-01T09:00:00.000Z",
				latestMessage: {} as MessagesResponse,
				isUnread: false
			};

			const result = NotificationUtils.isUnread(readGroupedNotification);
			expect(result).toBe(false);
		});
	});
});
