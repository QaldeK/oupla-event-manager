/// pb_hooks/utils.js
/// <reference path="../pb_data/types.d.ts" />

/**
 * Résout les groupes de destinataires en listes d'emails.
 * @param {Array<string>} groups - Mots-clés des groupes (ex: ["otherOrganizers", "recurrenceTeam"])
 * @param {object} context - Données nécessaires pour la résolution (ex: { eventId: "...", excludeUserId: "..." })
 * @returns {Array<string>} Liste d'emails dédupliquée.
 */
function resolveRecipientGroups(groups, context) {
	console.log('--- resolveRecipientGroups ---');
	console.log('Received groups:', JSON.stringify(groups));
	console.log('Received context:', JSON.stringify(context));

	const emails = new Set();
	if (!groups || groups.length === 0 || !context) {
		return [];
	}

	// On ne charge l'événement qu'une seule fois si nécessaire
	let event = null;
	const needsEvent = groups.some((g) =>
		['otherOrganizers', 'recurrenceTeam', 'spaceAdmins'].includes(g)
	);
	if (needsEvent && context.eventId) {
		console.log(`Attempting to find event with ID: ${context.eventId}`);
		try {
			event = $app.findRecordById('events', context.eventId);
		} catch (err) {
			console.error(`resolveRecipientGroups: Event ${context.eventId} not found.`, err);
			// Si l'événement est crucial pour tous les groupes demandés, on pourrait retourner une erreur
			// return []; // Ou laisser continuer pour les groupes qui ne dépendent pas de l'événement
		}
	} else if (needsEvent) {
		console.log('Event needed but context.eventId is missing.'); // Log si eventId manque
	}

	for (const group of groups) {
		let groupEmails = [];
		try {
			switch (group) {
				case 'otherOrganizers':
					if (event && context.excludeUserId) {
						groupEmails = getOtherOrganizerEmails(event, context.excludeUserId);
					} else {
						console.warn(
							'resolveRecipientGroups: Missing event or excludeUserId for otherOrganizers'
						);
					}
					break;
				case 'recurrenceTeam':
					if (event) {
						groupEmails = getRecurrenceTeamEmails(event);
					} else {
						console.warn('resolveRecipientGroups: Missing event for recurrenceTeam');
					}
					break;
				case 'spaceAdmins':
					if (event) {
						groupEmails = getSpaceAdminEmails(event);
					} else if (context.spaceId) {
						// Alternative si spaceId est passé directement dans le contexte
						const space = $app.findRecordById('spaces', context.spaceId);
						groupEmails = getSpaceAdminEmailsDirectly(space);
					} else {
						console.warn('resolveRecipientGroups: Missing event or spaceId for spaceAdmins');
					}
					break;
				case 'systemAdmins':
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
		console.warn('getEmailsByIds: No user IDs provided.'); // Ajout d'un log pour le débogage
		return [];
	}
	try {
		const users = $app.findRecordsByIds('users', userIds);
		return users.map((user) => user.getString('email')).filter((email) => !!email); // Filtrer les emails vides ou nuls
	} catch (err) {
		console.error('Erreur lors de la récupération des emails par IDs:', err);
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
		const admins = $app.findRecordsByFilter('users', "role = 'admin'");
		return admins.map((admin) => admin.getString('email')).filter((email) => email);
	} catch (err) {
		console.error('Erreur lors de la récupération des emails admins:', err);
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
function sendEmail(recipients, subject, htmlContent, textContent = '') {
	if (!textContent) {
		textContent = generatePlainText(htmlContent); // Générer si non fourni
	}

	const message = new MailerMessage({
		from: {
			address: $app.settings().meta.senderAddress,
			name: $app.settings().meta.senderName
		},
		to: recipients.map((r) => ({ address: r })),
		subject: subject,
		html: htmlContent,
		text: textContent
	});

	try {
		$app.newMailClient().send(message);
		console.log(`Email "${subject}" sent successfully to ${recipients.join(', ')}`);
	} catch (err) {
		console.error(`Error sending email "${subject}" to ${recipients.join(', ')}:`, err);
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
	if (!htmlContent) return '';
	// Logique simple, peut être améliorée
	return htmlContent
		.replace(/<style[^>]*>.*<\/style>/gis, '') // Remove style blocks
		.replace(/<script[^>]*>.*<\/script>/gis, '') // Remove script blocks
		.replace(/<p>/gi, '\n')
		.replace(/<\/p>/gi, '\n')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<b>|<\/b>|<strong>|<\/strong>/gi, '*') // Bold to asterisks
		.replace(/<i>|<\/i>|<em>|<\/em>/gi, '_') // Italic to underscores
		.replace(/<a href="([^"]+)">([^<]+)<\/a>/gi, '$2 ($1)') // Convert links
		.replace(/<[^>]*>/g, '') // Remove remaining HTML tags
		.replace(/&nbsp;/gi, ' ')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&amp;/gi, '&')
		.replace(/\n\s*\n/g, '\n\n')
		.trim();
}

/**
 * Fonction utilitaire de formatage de date.
 * @param {string | undefined | null} dateString
 * @returns {string} Date formatée ou 'Date inconnue'
 */
function formatDate(dateString) {
	if (!dateString) return 'Date inconnue';
	try {
		const date = new Date(dateString);
		// Format manuel pour la cohérence (évite les dépendances locales du serveur)
		const year = date.getFullYear();
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');
		// Optionnel: ajouter l'heure si nécessaire
		// const hours = date.getHours().toString().padStart(2, '0');
		// const minutes = date.getMinutes().toString().padStart(2, '0');
		// return `${day}/${month}/${year} ${hours}:${minutes}`;
		return `${day}/${month}/${year}`; // Format JJ/MM/AAAA
	} catch (e) {
		console.error('Error formatting date:', dateString, e);
		return dateString; // Retourner la chaîne originale en cas d'erreur
	}
}

// --- Fonctions Helpers pour resolveRecipientGroups ---

function getOtherOrganizerEmails(event, excludeUserId) {
	const organizerIds = (event.get('organizers') || [])
		.map((org) => org && org.id)
		.filter((id) => id && id !== excludeUserId);
	return getEmailsByIds(organizerIds);
}

function getRecurrenceTeamEmails(event) {
	const recurrenceData = event.get('recurrence');
	if (
		!event.getBool('isRecurrent') ||
		!recurrenceData ||
		!recurrenceData.recurrenceTeam ||
		!Array.isArray(recurrenceData.recurrenceTeam)
	) {
		return [];
	}
	const teamMemberIds = recurrenceData.recurrenceTeam
		.map((member) => member && typeof member === 'object' && member.id)
		.filter((id) => typeof id === 'string' && id.trim() !== '');
	return getEmailsByIds(teamMemberIds);
}

function getSpaceAdminEmails(event) {
	const spaceId = event.getString('space');
	if (!spaceId) return [];
	try {
		const space = $app.findRecordById('spaces', spaceId);
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
			'spaceMembers',
			`space = '${space.id}' && role = 'admin'`
		);
		const adminUserIds = spaceAdmins.map((sm) => sm.getString('user'));
		return getEmailsByIds(adminUserIds);
	} catch (err) {
		console.error(`getSpaceAdminEmailsDirectly: Error fetching admins for space ${space.id}.`, err);
		return [];
	}
}

function getSystemAdminEmails() {
	try {
		// Adapte le filtre si tes admins système ont un rôle spécifique ou sont dans une collection dédiée
		const admins = $app.findRecordsByFilter('users', "role = 'admin'"); // Supposant un champ 'role'
		return getEmailsByIds(admins.map((a) => a.id));
	} catch (err) {
		console.error('getSystemAdminEmails: Error fetching system admins.', err);
		return [];
	}
}

// Exporter les fonctions pour les rendre disponibles via require()
module.exports = {
	getEmailsByIds,
	getAdminEmails,
	sendEmail,
	formatDate,
	generatePlainText,
	resolveRecipientGroups
};
