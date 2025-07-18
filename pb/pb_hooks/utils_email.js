/// pb_hooks/utils_email.js
/// <reference path="../pb_data/types.d.ts" />

/**
 * Résout les groupes de destinataires en listes d'emails.
 * @param {Array<string>} groups - Mots-clés des groupes (ex: ["otherOrganizers", "recurrenceTeam"])
 * @param {object} context - Données nécessaires pour la résolution (ex: { eventId: "...", excludeUserId: "..." })
 * @returns {Array<string>} Liste d'emails dédupliquée.
 */
function resolveRecipientGroups(groups, context) {
	console.log("--- resolveRecipientGroups ---");
	console.log("Received groups:", JSON.stringify(groups));
	console.log("Received context:", JSON.stringify(context));

	const emails = new Set();
	if (!groups || groups.length === 0 || !context) {
		return [];
	}

	// On ne charge l'événement qu'une seule fois si nécessaire
	let event = null;
	const needsEvent = groups.some((g) =>
		["otherOrganizers", "recurrenceTeam", "spaceAdmins"].includes(g)
	);
	if (needsEvent && context.eventId) {
		console.log(`Attempting to find event with ID: ${context.eventId}`);
		try {
			event = $app.findRecordById("events", context.eventId);
		} catch (err) {
			console.error(`resolveRecipientGroups: Event ${context.eventId} not found.`, err);
			// Si l'événement est crucial pour tous les groupes demandés, on pourrait retourner une erreur
			// return []; // Ou laisser continuer pour les groupes qui ne dépendent pas de l'événement
		}
	} else if (needsEvent) {
		console.log("Event needed but context.eventId is missing."); // Log si eventId manque
	}

	for (const group of groups) {
		let groupEmails = [];
		try {
			switch (group) {
				case "recurrenceTeam":
					if (event) {
						groupEmails = getRecurrenceTeamEmails(event);
					} else {
						console.warn("resolveRecipientGroups: Missing event for recurrenceTeam");
					}
					break;
				case "spaceAdmins":
					if (event) {
						groupEmails = getSpaceAdminEmails(event);
					} else if (context.spaceId) {
						// Alternative si spaceId est passé directement dans le contexte
						const space = $app.findRecordById("spaces", context.spaceId);
						groupEmails = getSpaceAdminEmailsDirectly(space);
					} else {
						console.warn("resolveRecipientGroups: Missing event or spaceId for spaceAdmins");
					}
					break;
				case "systemAdmins":
					groupEmails = getSystemAdminEmails();
					break;
				// Ajouter d'autres cas si nécessaire
				default:
					console.warn(`resolveRecipientGroups: Unknown group "${group}"`);
			}
			groupEmails.forEach((email) => emails.add(email));
		} catch (err) {
			console.error(`resolveRecipientGroups: Error resolving group "${group}":`, err);
			// Continuer avec les autres groupes
		}
	}

	return Array.from(emails);
}

/**
 * Récupère les emails des utilisateurs par leurs IDs.
 * @param {Array<string>} userIds - Liste des IDs utilisateurs.
 * @returns {Array<string>} Liste des emails.
 */
function getEmailsByIds(userIds) {
	if (!userIds || userIds.length === 0) {
		console.warn("getEmailsByIds: No user IDs provided."); // Ajout d'un log pour le débogage
		return [];
	}
	try {
		const users = $app.findRecordsByIds("users", userIds);
		return users.map((user) => user.getString("email")).filter((email) => !!email); // Filtrer les emails vides ou nuls
	} catch (err) {
		console.error("Erreur lors de la récupération des emails par IDs:", err);
		return [];
	}
}

/**
 * Récupère les emails des administrateurs système.
 * @returns {Array<string>} Liste des emails des administrateurs.
 */
function getAdminEmails() {
	// Cette fonction n'est pas utilisée dans la logique principale mais peut être gardée si utile ailleurs
	try {
		// Assurez-vous que le champ 'role' existe et que 'admin' est une valeur valide
		const admins = $app.findRecordsByFilter("users", "role = 'admin'");
		return admins.map((admin) => admin.getString("email")).filter((email) => email);
	} catch (err) {
		console.error("Erreur lors de la récupération des emails admins:", err);
		return [];
	}
}

/**
 * Fonction générique d'envoi d'email.
 * @param {Array<string>} recipients - Liste des adresses email des destinataires.
 * @param {string} subject - Sujet de l'email.
 * @param {string} htmlContent - Contenu HTML de l'email.
 * @param {string} textContent - Contenu Text de l'email. Optionnel. Généré automatiquement si absent.
 */

function sendEmail(recipients, subject, htmlContent, textContent = "", replyTo = null) {
	if (!textContent) {
		textContent = generatePlainText(htmlContent); // Générer si non fourni
	}
	// Créer un objet MailerMessage
	const message = new MailerMessage({
		from: {
			address: $app.settings().meta.senderAddress,
			name: $app.settings().meta.senderName
		},
		to: recipients.map((r) => ({ address: r })),
		subject: subject,
		html: htmlContent,
		text: textContent,
		headers: replyTo ? { "Reply-To": replyTo } : {}
	});

	try {
		$app.newMailClient().send(message);
		console.log(`Email "${subject}" sent successfully to ${recipients.join(", ")}`);
	} catch (err) {
		console.error(`Error sending email "${subject}" to ${recipients.join(", ")}:`, err);
		// Optionnel : relancer l'erreur si l'appelant doit savoir que l'envoi a échoué
		// throw new Error(`Failed to send email: ${err.message}`);
	}
}

/**
 * Génère une version texte brut à partir de HTML.
 * @param {string} htmlContent
 * @returns {string}
 */
function generatePlainText(htmlContent) {
	if (!htmlContent) return "";
	// Logique simple, peut être améliorée
	return htmlContent
		.replace(/<style[^>]*>.*<\/style>/gis, "") // Remove style blocks
		.replace(/<script[^>]*>.*<\/script>/gis, "") // Remove script blocks
		.replace(/<p>/gi, "\n")
		.replace(/<\/p>/gi, "\n")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<b>|<\/b>|<strong>|<\/strong>/gi, "*") // Bold to asterisks
		.replace(/<i>|<\/i>|<em>|<\/em>/gi, "_") // Italic to underscores
		.replace(/<a href="([^"]+)">([^<]+)<\/a>/gi, "$2 ($1)") // Convert links
		.replace(/<[^>]*>/g, "") // Remove remaining HTML tags
		.replace(/&nbsp;/gi, " ")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&amp;/gi, "&")
		.replace(/\n\s*\n/g, "\n\n")
		.trim();
}

/**
 * Fonction utilitaire de formatage de date.
 * @param {string | undefined | null} dateString
 * @returns {string} Date formatée ou 'Date inconnue'
 */
function formatDate(dateString) {
	if (!dateString) return "Date inconnue";
	try {
		const date = new Date(dateString);
		// Format manuel pour la cohérence (évite les dépendances locales du serveur)
		const year = date.getFullYear();
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const day = date.getDate().toString().padStart(2, "0");
		// Optionnel: ajouter l'heure si nécessaire
		// const hours = date.getHours().toString().padStart(2, '0');
		// const minutes = date.getMinutes().toString().padStart(2, '0');
		// return `${day}/${month}/${year} ${hours}:${minutes}`;
		return `${day}/${month}/${year}`; // Format JJ/MM/AAAA
	} catch (e) {
		console.error("Error formatting date:", dateString, e);
		return dateString; // Retourner la chaîne originale en cas d'erreur
	}
}

function getSpaceName(spaceId) {
	if (!spaceId) return "Oupla";
	try {
		return $app.findRecordById("spaces", spaceId).getString("name");
	} catch (e) {
		console.error("Error get spaceName", spaceId, e);
		return "Oupla";
	}
}

function getRecurrenceTeamEmails(event) {
	const recurrenceData = event.get("recurrence");
	if (
		!event.getBool("isRecurrent") ||
		!recurrenceData ||
		!recurrenceData.recurrenceTeam ||
		!Array.isArray(recurrenceData.recurrenceTeam)
	) {
		return [];
	}
	const teamMemberIds = recurrenceData.recurrenceTeam
		.map((member) => member && typeof member === "object" && member.id)
		.filter((id) => typeof id === "string" && id.trim() !== "");
	return getEmailsByIds(teamMemberIds);
}

function getSpaceAdminEmails(event) {
	const spaceId = event.getString("space");
	if (!spaceId) return [];
	try {
		const space = $app.findRecordById("spaces", spaceId);
		return getSpaceAdminEmailsDirectly(space);
	} catch (err) {
		console.error(`getSpaceAdminEmails: Space ${spaceId} not found for event ${event.id}.`, err);
		return [];
	}
}

function getSpaceAdminEmailsDirectly(space) {
	if (!space) return [];
	try {
		const spaceAdmins = $app.findRecordsByFilter(
			"spaceMembers",
			`space = '${space.id}' && role = 'admin'`
		);
		const adminUserIds = spaceAdmins.map((sm) => sm.getString("user"));
		return getEmailsByIds(adminUserIds);
	} catch (err) {
		console.error(`getSpaceAdminEmailsDirectly: Error fetching admins for space ${space.id}.`, err);
		return [];
	}
}

function getSystemAdminEmails() {
	try {
		// Adapte le filtre si tes admins système ont un rôle spécifique ou sont dans une collection dédiée
		const admins = $app.findRecordsByFilter("users", "role = 'admin'"); // Supposant un champ 'role'
		return getEmailsByIds(admins.map((a) => a.id));
	} catch (err) {
		console.error("getSystemAdminEmails: Error fetching system admins.", err);
		return [];
	}
}

/**
 * Traite une notification de désinscription de tâche
 */
function processTaskUnsubscription(context, event, utils, result) {
	// Récupérer les données nécessaires
	const userName = context.userName || "Utilisateur inconnu";
	const taskName = context.taskName || "inconnue";
	const noOrganizers = context.noOrganizers || false;

	// Variable pour le destinataire de la notification
	let recipientGroups = [];
	let fallbackRecipientGroups = ["spaceAdmins"];

	// Formater la date de l'événement
	const eventDateStr = event.get("date_event")
		? utils.formatDate(event.get("date_event"))
		: "date non définie";

	// Construire le contenu selon qu'il reste des organisateurs ou non
	if (noOrganizers) {
		// Si c'est le dernier organisateur qui se désinscrit
		result.subject = `[${getSpaceName(event.getString("space"))}] Plus d'organisateur·ice pour : ${event.getString("event_title")} - Oupla notification`;
		result.htmlContent = `
			<p>Bonjour,</p>
			<p>L'utilisateur·ice <b>${userName}</b> était le dernier ou la dernière organisateur·ice inscrit·e pour l'événement "<b>${event.getString("event_title")}</b>" prévu le ${eventDateStr} et vient de se désinscrire de la tâche "<b>${taskName}</b>".</p>
			<p>L'événement n'a actuellement plus aucun·e organisateur·ice.</p>
			<p>Songez à trouver des remplaçant·es ou envisager d'annuler cet événement.</p>
			<p style="margin-top: 1.5em;"><a href="${$app.settings().meta.appURL}/dashboard/events#${event.id}">Voir l'événement</a></p>
			<p style="margin-top: 1.5em; color: #666; font-style: italic;">Ceci est un message automatique envoyé par le système Oupla. Il vous à été envoyé parce que vous faites partie des administrateur·ices de cet espace.</p>
		`;

		// Récupérer les administrateurs de l'espace
		if (event.getBool("isRecurrent") || event.get("masterRecurrentId")) {
			recipientGroups = ["recurrenceTeam"];
		} else {
			recipientGroups = ["spaceAdmins"];
		}
	} else {
		// Notification standard aux autres organisateurs

		result.subject = `[${getSpaceName(event.getString("space"))}] Désinscription de ${userName} : ${event.getString("event_title")}`;

		let htmlBody = `
			<p>Bonjour,</p>
			<p>L'utilisateur·ice <b>${userName}</b> s'est désinscrit·e de la tâche "<b>${taskName}</b>" pour l'événement "<b>${event.getString("event_title")}</b>" prévu le ${eventDateStr}.</p>
		`;

		// Ajouter le message personnalisé si présent
		if (context.customMessage && context.customMessage.trim() !== "") {
			const escapedCustomMessage = context.customMessage
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/\n/g, "<br>");

			htmlBody = `
				<p><b>Message de ${userName} :</b></p>
				<blockquote style="padding-left: 1em; border-left: 3px solid #ccc; margin-left: 0.5em; font-style: italic;">
					${escapedCustomMessage}
				</blockquote>
				<hr style="margin: 1em 0;">
				${htmlBody}
			`;
		}

		htmlBody += `<p style="margin-top: 1.5em;"><a href="${$app.settings().meta.appURL}/dashboard/events#${event.id}">Voir l'événement</a></p>`;
		htmlBody += `<p style="margin-top: 1.5em; color: #666; font-style: italic;">Ceci est un message automatique envoyé par le système Oupla. Il vous à été envoyé parce que vous faites partie des organisateur·ices / participant·es de cet événement.</p>`;

		result.htmlContent = htmlBody;

		// déterminer le destinataire
		// Les IDs explicites sont maintenant traités au niveau de processNotification
		// et transformés directement en emails dans result.recipients
		if (
			context.explicitOrganizerIds &&
			Array.isArray(context.explicitOrganizerIds) &&
			context.explicitOrganizerIds.length > 0
		) {
			// Ne pas définir de groupes, nous avons déjà résolu les emails directement
			result.recipientGroups = [];
			// Garder le fallback pour la sécurité
			result.fallbackRecipientGroups = ["spaceAdmins"];

			// Pas besoin de logger les IDs ici, c'est fait dans processNotification
		} else {
			// Fallback pour les cas où les IDs explicites ne sont pas fournis
			if (event.getBool("isRecurrent") || event.get("masterRecurrentId")) {
				result.recipientGroups = ["recurrenceTeam"];
			} else {
				// N'utiliser que spaceAdmins comme groupe principal
				result.recipientGroups = ["spaceAdmins"];
			}
			result.fallbackRecipientGroups = ["systemAdmins"];
		}

		return result;
	}
}

/**
 * Traite une notification de validation de sondage
 */
function processSondageValidation(context, event, utils, result, withConfirmation) {
	// Récupérer les données nécessaires
	const userName = context.userName || "Utilisateur inconnu";
	const dateStart = context.dateStart ? new Date(context.dateStart) : null;
	const dateEnd = context.dateEnd ? new Date(context.dateEnd) : null;
	const confirmedOrganizers = context.confirmedOrganizers || [];
	const eventTitle = context.eventTitle || event.getString("event_title");

	// Formater les dates
	const eventDateStr = dateStart ? utils.formatDate(dateStart) : "date non définie";

	const timeStart = dateStart
		? dateStart.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
		: "heure non définie";

	const timeEnd = dateEnd
		? dateEnd.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
		: "heure non définie";

	// Message sur les organisateurs confirmés
	const organizersHtml =
		confirmedOrganizers.length > 0
			? `<p>Les organisateur·ices confirmé·es sont : <b>${confirmedOrganizers.join(", ")}</b></p>`
			: "<p>Aucun·e organisateur·ice n'a encore confirmé sa présence pour cette date.</p>";

	// Définir le sujet en fonction du contexte
	result.subject = withConfirmation
		? `[${getSpaceName(event.getString("space"))}] Événement confirmé : "${eventTitle}"`
		: `[${getSpaceName(event.getString("space"))}] Date confirmée pour "${eventTitle}"`;

	// Construire le contenu HTML en fonction du contexte
	let htmlContent = `
		<p>Bonjour,</p>
		<p>La date du sondage pour l'événement "<b>${eventTitle}</b>" a été validée par <b>${userName}</b>.</p>
		<p>L'événement aura lieu le <b>${eventDateStr}</b> de <b>${timeStart}</b> à <b>${timeEnd}</b>.</p>
		${organizersHtml}
	`;

	// Ajouter l'information sur la confirmation si applicable
	if (withConfirmation) {
		htmlContent += `
			<p><b>L'événement a également été confirmé</b> et est maintenant visible dans l'agenda public.</p>
		`;
	} else {
		htmlContent += `
			<p>L'événement n'est pas encore confirmé. Il ne sera pas visible dans l'agenda public tant qu'il n'aura pas été confirmé.</p>
		`;
	}

	htmlContent += `
		<p>Merci de votre participation au sondage !</p>
		<p style="margin-top: 1.5em;"><a href="${$app.settings().meta.appURL}/dashboard/events#${event.id}">Voir l'événement</a></p>
		<p style="margin-top: 1.5em; color: #666; font-style: italic;">Ceci est un message automatique envoyé par le système Oupla. Il vous à été envoyé parce que vous avez participé au sondage concernant cet événement.</p>
	`;

	result.htmlContent = htmlContent;

	// Les IDs explicites sont maintenant traités au niveau de processNotification
	// et transformés directement en emails dans result.recipients
	if (
		context.explicitOrganizerIds &&
		Array.isArray(context.explicitOrganizerIds) &&
		context.explicitOrganizerIds.length > 0
	) {
		// Ne pas définir de groupes, nous avons déjà résolu les emails directement
		result.recipientGroups = [];
	} else {
		// Fallback si aucun ID explicite n'est fourni
		result.recipientGroups = ["spaceAdmins"];
	}
	result.fallbackRecipientGroups = ["systemAdmins"];

	return result;
}

/**
 * Traite une notification de confirmation d'événement
 */
function processEventConfirmation(context, event, utils, result) {
	// Récupérer les données nécessaires
	const userName = context.userName || "Utilisateur inconnu";
	const eventTitle = context.eventTitle || event.getString("event_title");
	const dateStr = context.dateEvent ? utils.formatDate(context.dateEvent) : "date non définie";
	const timeStart = context.timeStart || "heure non définie";
	const timeEnd = context.timeEnd || "heure non définie";

	// Définir le sujet
	result.subject = `[${getSpaceName(event.getString("space"))}] Événement confirmé : "${eventTitle}"`;

	// Construire le contenu HTML
	result.htmlContent = `
		<p>Bonjour,</p>
		<p>L'événement "<b>${eventTitle}</b>" a été confirmé par <b>${userName}</b>.</p>
		<p>Il aura lieu le <b>${dateStr}</b> de <b>${timeStart}</b> à <b>${timeEnd}</b>.</p>
		<p>Cet événement est maintenant visible dans l'agenda public.</p>
		<p style="margin-top: 1.5em;"><a href="${$app.settings().meta.appURL}/dashboard/events#${event.id}">Voir l'événement</a></p>
		<p style="margin-top: 1.5em; color: #666; font-style: italic;">Ceci est un message automatique envoyé par le système Oupla. Il vous à été envoyé parce que vous faites partie des organisateur·ices / participant·es de cet événement.</p>
	`;

	// Définir les groupes de destinataires
	// Note: Nous privilégions maintenant l'utilisation des IDs explicites (context.explicitOrganizerIds)
	// plutôt que le groupe "otherOrganizers"
	if (
		context.explicitOrganizerIds &&
		Array.isArray(context.explicitOrganizerIds) &&
		context.explicitOrganizerIds.length > 0
	) {
		// Ne pas définir de groupes, les IDs seront traités directement dans send_email.pb.js
		result.recipientGroups = [];
	} else {
		// Fallback si aucun ID explicite n'est fourni
		result.recipientGroups = ["spaceAdmins"];
	}
	result.fallbackRecipientGroups = ["systemAdmins"];

	return result;
}

/**
 * Traite une notification structurée basée sur son type
 * @param {object} context - Données contextuelles pour la notification
 * @param {object} utils - Utilitaires importés
 * @param {object} logger - Logger PocketBase
 * @returns {object} - Données d'email configurées
 */
function processNotification(context, utils, logger) {
	logger.info("Processing structured notification", {
		type: context.notificationType,
		context: JSON.stringify(context)
	});

	let event;
	if (context.eventId) {
		try {
			event = $app.findRecordById("events", context.eventId);
			if (!event) {
				logger.warn(`Event with ID ${context.eventId} not found.`);
				return null;
			}
		} catch (err) {
			logger.error(`Error finding event ${context.eventId}:`, err);
			return null;
		}
	}

	// Structure de retour par défaut
	const result = {
		subject: "",
		htmlContent: "",
		textContent: "",
		recipients: [], // Pour les emails directs (legacy)
		recipientGroups: [],
		fallbackRecipientGroups: []
	};

	// Transférer les IDs d'organisateurs explicites depuis le contexte vers result.recipients
	if (
		context.explicitOrganizerIds &&
		Array.isArray(context.explicitOrganizerIds) &&
		context.explicitOrganizerIds.length > 0
	) {
		try {
			const emails = getEmailsByIds(context.explicitOrganizerIds);
			result.recipients = emails;
			logger.info(
				`Résolu ${emails.length} emails à partir de ${context.explicitOrganizerIds.length} IDs explicites`
			);
		} catch (err) {
			logger.error("Erreur lors de la résolution des emails à partir des IDs explicites:", err);
		}
	}

	// Configuration spécifique par type de notification
	switch (context.notificationType) {
		case "task_unsubscription":
			return processTaskUnsubscription(context, event, utils, result);

		case "sondage_validation":
			return processSondageValidation(context, event, utils, result, false);

		case "sondage_validation_with_confirmation":
			return processSondageValidation(context, event, utils, result, true);

		case "event_confirmation":
			return processEventConfirmation(context, event, utils, result);

		default:
			logger.warn(`Unknown notification type: ${context.notificationType}`);
			return null;
	}
}

// Exporter les fonctions pour les rendre disponibles via require()
module.exports = {
	getEmailsByIds,
	getAdminEmails,
	sendEmail,
	formatDate,
	generatePlainText,
	resolveRecipientGroups,
	processNotification,
	processEventConfirmation,
	processTaskUnsubscription,
	processSondageValidation
};
