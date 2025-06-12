// src/lib/services/notificationService.svelte.ts
import { sendGenericEmail, type GenericEmailPayload } from "$lib/pocketbase.svelte";
import { showAlert } from "$lib/shared/states.svelte";
import type { DateProposedType, EventType, UserType } from "$lib/types/types";

/**
 * Types de notification gérés par le service
 */
export enum NotificationType {
	TASK_UNSUBSCRIPTION = "task_unsubscription",
	SONDAGE_VALIDATION = "sondage_validation",
	NEW_EVENT = "new_event",
	EVENT_CONFIRMATION = "event_confirmation",
	EVENT_CANCELLATION = "event_cancellation",
	SONDAGE_VALIDATION_WITH_CONFIRMATION = "sondage_validation_with_confirmation"
}

/**
 * Interface pour les options de notification
 */
export interface NotificationOptions {
	showUserFeedback?: boolean;
	customMessage?: string;
	additionalRecipients?: string[];
	notifyOthers?: boolean;
	willBeConfirmed?: boolean; // Indique si l'événement sera aussi confirmé (pour éviter les doubles notifications)
	isLastOrganizer?: boolean; // Indique s'il s'agit du dernier organisateur qui se désinscrit
	noOrganizers?: boolean; // Indique si l'événement n'a plus d'organisateurs après mise à jour
	specificFeedbackMessage?: string; // Message personnalisé à afficher dans le feedback utilisateur
}

/**
 * Types de paramètres pour différents types de notifications
 */
type TaskUnsubscriptionParams = {
	event: EventType;
	user: { id: string; username: string };
	task?: string;
	options?: NotificationOptions;
};

type SondageValidationParams = {
	event: EventType;
	dateProposal: DateProposedType;
	user: UserType;
	options?: NotificationOptions;
};

type EventConfirmationParams = {
	event: EventType;
	user: UserType;
	options?: NotificationOptions;
};

type NotificationParams =
	| TaskUnsubscriptionParams
	| SondageValidationParams
	| EventConfirmationParams;

/**
 * Service centralisé pour gérer l'envoi de notifications
 */
class NotificationService {
	/**
	 * Envoie une notification pour une désinscription de tâche
	 */
	async sendTaskUnsubscriptionNotification(params: TaskUnsubscriptionParams): Promise<boolean> {
		const { event, user, task, options = {} } = params;
		const {
			notifyOthers = true,
			customMessage,
			showUserFeedback = true,
			noOrganizers = false
		} = options;

		if (!notifyOthers) return true;

		try {
			// Récupère les IDs des autres organisateurs à notifier
			const otherOrganizerIds =
				event.organizers?.filter((org) => org.id !== user.id).map((org) => org.id) || [];

			const payload: GenericEmailPayload = {
				subject: "", // Le backend définira le sujet selon le contexte
				context: {
					eventId: event.id,
					excludeUserId: user.id,
					notificationType: "task_unsubscription",
					taskName: task || "toutes les tâches",
					userName: user.username,
					customMessage: customMessage || "",
					noOrganizers: noOrganizers, // Permet au backend de savoir s'il doit notifier les admins
					explicitOrganizerIds: otherOrganizerIds // Les IDs des organisateurs pour récupérer les emails
				},
				recipientGroups: otherOrganizerIds.length > 0 ? [] : ["spaceAdmins"] // Fallback vers les admins si pas d'organisateurs
			};

			await sendGenericEmail(payload);

			if (showUserFeedback) {
				if (options.specificFeedbackMessage) {
					showAlert(options.specificFeedbackMessage, "info");
				} else {
					showAlert(
						"Les autres organisateur·ices ont été notifié·es de votre désinscription.",
						"info"
					);
				}
			}

			return true;
		} catch (error) {
			console.error("Erreur lors de l'envoi de la notification de désinscription:", error);

			if (showUserFeedback) {
				showAlert(
					"L'inscription a été mise à jour, mais la notification n'a pas pu être envoyée.",
					"error"
				);
			}

			return false;
		}
	}

	/**
	 * Envoie une notification pour une validation de date de sondage
	 * avec gestion des cas de confirmation simultanée
	 */
	async sendSondageValidationNotification(params: SondageValidationParams): Promise<boolean> {
		const { event, dateProposal, user, options = {} } = params;
		const { showUserFeedback = true, willBeConfirmed = false } = options;

		try {
			// Récupérer les organisateurs qui ont confirmé leur présence
			const confirmedOrganizers = (dateProposal.organizers || [])
				.filter((org) => org.maybehere === "oui")
				.map((org) => org.username || "Sans nom");

			// Récupérer les IDs des autres organisateurs à notifier
			const otherOrganizerIds =
				event.organizers?.filter((org) => org.id !== user.id).map((org) => org.id) || [];

			const notificationType = willBeConfirmed
				? NotificationType.SONDAGE_VALIDATION_WITH_CONFIRMATION
				: NotificationType.SONDAGE_VALIDATION;

			// Le backend va résoudre les destinataires avec les IDs d'organisateurs
			const payload: GenericEmailPayload = {
				subject: "", // Le backend définira le sujet selon le contexte
				context: {
					eventId: event.id,
					notificationType: notificationType,
					userName: user.username,
					dateStart: dateProposal.dateStart,
					dateEnd: dateProposal.dateEnd,
					confirmedOrganizers: confirmedOrganizers,
					willBeConfirmed: willBeConfirmed, // Indique si l'événement sera aussi confirmé
					eventTitle: event.event_title,
					explicitOrganizerIds: otherOrganizerIds // Les IDs des organisateurs pour récupérer les emails
				},
				recipientGroups: otherOrganizerIds.length > 0 ? [] : ["spaceAdmins"] // Fallback vers les admins si pas d'organisateurs
			};

			await sendGenericEmail(payload);

			if (showUserFeedback) {
				if (options.specificFeedbackMessage) {
					showAlert(options.specificFeedbackMessage, "success");
				} else {
					showAlert("Notification envoyée à tous les participants du sondage.", "success");
				}
			}

			return true;
		} catch (error) {
			console.error("Erreur lors de l'envoi de la notification de validation du sondage:", error);

			if (showUserFeedback) {
				showAlert(
					"La date a été validée, mais la notification n'a pas pu être envoyée à tous les participants.",
					"error"
				);
			}

			return false;
		}
	}

	/**
	 * Envoie une notification pour une confirmation d'événement
	 */
	async sendEventConfirmationNotification(params: EventConfirmationParams): Promise<boolean> {
		const { event, user, options = {} } = params;
		const { showUserFeedback = true } = options;

		try {
			// Récupérer les IDs des autres organisateurs à notifier
			const otherOrganizerIds =
				event.organizers?.filter((org) => org.id !== user.id).map((org) => org.id) || [];

			// Le backend va résoudre les destinataires avec les IDs d'organisateurs
			const payload: GenericEmailPayload = {
				subject: "", // Le backend définira le sujet selon le contexte
				context: {
					eventId: event.id,
					notificationType: NotificationType.EVENT_CONFIRMATION,
					userName: user.username,
					dateEvent: event.date_event,
					timeStart: event.time_start,
					timeEnd: event.time_end,
					eventTitle: event.event_title,
					explicitOrganizerIds: otherOrganizerIds // Les IDs des organisateurs pour récupérer les emails
				},
				recipientGroups: otherOrganizerIds.length > 0 ? [] : ["spaceAdmins"] // Fallback vers les admins si pas d'organisateurs
			};

			await sendGenericEmail(payload);

			if (showUserFeedback) {
				if (options.specificFeedbackMessage) {
					showAlert(options.specificFeedbackMessage, "success");
				} else {
					showAlert(
						"Tous les organisateurs ont été notifiés de la confirmation de l'événement.",
						"success"
					);
				}
			}

			return true;
		} catch (error) {
			console.error(
				"Erreur lors de l'envoi de la notification de confirmation d'événement:",
				error
			);

			if (showUserFeedback) {
				showAlert(
					"L'événement a été confirmé, mais la notification n'a pas pu être envoyée.",
					"error"
				);
			}

			return false;
		}
	}

	/**
	 * Méthode générique pour envoyer n'importe quel type de notification
	 */
	async sendNotification(
		type: NotificationType,
		params: NotificationParams
		// options?: NotificationOptions
	): Promise<boolean> {
		switch (type) {
			case NotificationType.TASK_UNSUBSCRIPTION:
				return this.sendTaskUnsubscriptionNotification(params as TaskUnsubscriptionParams);

			case NotificationType.SONDAGE_VALIDATION:
			case NotificationType.SONDAGE_VALIDATION_WITH_CONFIRMATION:
				return this.sendSondageValidationNotification(params as SondageValidationParams);

			case NotificationType.EVENT_CONFIRMATION:
				return this.sendEventConfirmationNotification(params as EventConfirmationParams);

			// Ajouter les autres types au besoin

			default:
				console.error(`Type de notification non géré: ${type}`);
				return false;
		}
	}
}

// Exporter une instance singleton
export const notificationService = new NotificationService();
