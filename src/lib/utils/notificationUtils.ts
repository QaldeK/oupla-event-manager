// src/lib/utils/notificationUtils.ts
import { notificationSystem } from "$lib/shared/notificationSystem.svelte";
import type { LogsResponse, MessagesResponse } from "$lib/types/pocketbase";

/**
 * Type pour une notification groupée
 */
export interface GroupedNotification {
	id: string;
	type: "grouped_messages";
	eventId: string;
	eventTitle: string;
	count: number;
	created: string;
	latestMessage: MessagesResponse;
	isUnread: boolean;
}

/**
 * Union type pour tous les types de notifications
 */
export type NotificationItem = LogsResponse | GroupedNotification;

/**
 * Utilitaires partagés pour la gestion des notifications
 */
export class NotificationUtils {
	/**
	 * Récupère l'activité combinée avec messages regroupés
	 */
	static getGroupedActivity(limit: number = 20): NotificationItem[] {
		return notificationSystem.getGroupedActivity(limit);
	}

	/**
	 * Génère le message d'affichage d'une notification
	 */
	static generateMessage(notification: NotificationItem): string {
		// Messages groupés
		if ("type" in notification && notification.type === "grouped_messages") {
			const count = notification.count;
			const eventTitle = notification.eventTitle;
			return `${count} nouveau${count > 1 ? "x" : ""} message${count > 1 ? "s" : ""} dans "${eventTitle}"`;
		}

		// Logs
		if ("action" in notification) {
			return notificationSystem.generateLogMessage(notification as LogsResponse);
		}

		// Messages individuels (ne devrait pas arriver avec le regroupement)
		return notificationSystem.generateMessageNotification(notification as MessagesResponse);
	}

	/**
	 * Formate le temps relatif d'une notification
	 */
	static formatRelativeTime(dateString: string): string {
		return notificationSystem.formatRelativeTime(dateString);
	}

	/**
	 * Détermine le type d'une notification
	 */
	static getNotificationType(notification: NotificationItem): "log" | "grouped" | "message" {
		if ("type" in notification && notification.type === "grouped_messages") {
			return "grouped";
		}
		if ("action" in notification) {
			return "log";
		}
		return "message";
	}

	/**
	 * Vérifie si une notification est non lue
	 */
	static isUnread(notification: NotificationItem): boolean {
		if ("isUnread" in notification) {
			return notification.isUnread;
		}
		return notificationSystem.isUnread(notification as LogsResponse | MessagesResponse);
	}

	/**
	 * Gère l'ouverture du dropdown de notifications
	 */
	static handleNotificationOpen(): void {
		if (notificationSystem.unreadCount > 0) {
			notificationSystem.markAsRead();
		}
	}

	/**
	 * Obtient le nombre de notifications non lues
	 */
	static getUnreadCount(): number {
		return notificationSystem.unreadCount;
	}

	/**
	 * Vérifie si le système de notifications est initialisé
	 */
	static isInitialized(): boolean {
		return notificationSystem.isInitialized;
	}

	/**
	 * Obtient l'état de chargement
	 */
	static isLoading(): boolean {
		return notificationSystem.isLoading;
	}
}
