/// pb_hooks/send_notification.pb.js
/// <reference path="../pb_data/types.d.ts" />

routerAdd('POST', '/api/send_notification', (e) => {
	// --- Charger le module utilitaire ---
	// Utilise la variable globale __hooks pour obtenir le chemin absolu
	// et require pour charger le module CommonJS.
	const utils = require(`${__hooks}/utils.js`);

	// --- Vérification d'authentification ---
	const authRecord = e.auth;
	if (!authRecord) {
		throw new UnauthorizedError('Authentication required.');
	}

	// --- Récupération des données de la requête ---
	const requestData = e.requestInfo().body;
	if (
		!requestData ||
		!requestData.eventId ||
		!requestData.notificationType ||
		!requestData.leavingUserId ||
		!requestData.leavingUsername
	) {
		throw new BadRequestError('Missing required notification data.');
	}

	try {
		const event = $app.findRecordById('events', requestData.eventId);
		// Vérifier si l'événement a été trouvé
		if (!event) {
			throw new NotFoundError(`Event with ID ${requestData.eventId} not found.`);
		}
		const spaceId = event.getString('space');
		if (!spaceId) {
			throw new InternalServerError(`Event ${requestData.eventId} has no associated space.`);
		}
		const space = $app.findRecordById('spaces', spaceId);
		if (!space) {
			throw new NotFoundError(`Space with ID ${spaceId} not found.`);
		}

		let recipients = [];
		let subject = '';
		let htmlContent = '';

		// --- Logique spécifique au type de notification ---
		if (requestData.notificationType === 'organizerLeft') {
			const otherOrganizers = (event.get('organizers') || [])
				.map((org) => org && org.id)
				.filter((id) => id && id !== requestData.leavingUserId);

			if (otherOrganizers.length > 0) {
				// ---> Notifier les autres organisateurs <---
				// 👉 Utiliser la fonction importée
				recipients = utils.getEmailsByIds(otherOrganizers);
				subject = `[Oupla] Départ d'un·e organisateur·ice : ${event.getString('event_title')}`;
				// 👉 Utiliser utils.formatDate
				htmlContent = `
                        <p>Bonjour,</p>
                        <p>L'utilisateur·ice <b>${requestData.leavingUsername}</b> s'est désinscrit·e de la tâche "<b>${requestData.taskName || 'inconnue'}</b>" pour l'événement "<b>${event.getString('event_title')}</b>" prévu le ${utils.formatDate(event.get('dateStart'))}.</p>
                        <p>Merci de vérifier si la couverture des tâches est toujours assurée.</p>
                        <p>Cordialement,<br>L'équipe Oupla</p>
                    `;
			} else {
				// ---> Notifier les admins de l'espace (plus d'organisateurs) <---
				subject = `[Oupla - Action Requise] Plus d'organisateur·ice pour : ${event.getString('event_title')}`;
				// 👉 Utiliser utils.formatDate
				htmlContent = `
                        <p>Bonjour,</p>
                        <p>L'utilisateur·ice <b>${requestData.leavingUsername}</b> était le dernier ou la dernière organisateur·ice inscrit·e pour l'événement "<b>${event.getString('event_title')}</b>" prévu le ${utils.formatDate(event.get('dateStart'))} et vient de se désinscrire de la tâche "<b>${requestData.taskName || 'inconnue'}</b>".</p>
                        <p>L'événement n'a actuellement plus aucun·e organisateur·ice.</p>
                        <p><b>Action requise :</b> Veuillez trouver des remplaçant·e·s ou envisager d'annuler cet événement.</p>
                        <p>Cordialement,<br>L'équipe Oupla</p>
                    `;
				const spaceAdmins = $app.findRecordsByFilter(
					'spaceMembers',
					`space = '${space.id}' && role = 'admin'`
				);
				const adminUserIds = spaceAdmins.map((sm) => sm.getString('user'));
				// 👉 Utiliser la fonction importée
				recipients = utils.getEmailsByIds(adminUserIds);
			}
		} else {
			console.warn(`Notification type "${requestData.notificationType}" not handled.`);
			return e.json(200, { message: 'Notification type not handled' });
		}

		// 👉 Ajouter les membres de l'équipe de récurrence si l'événement est récurrent
		if (event.getBool('isRecurrent') && event.get('recurrence')) {
			const recurrenceData = event.get('recurrence');

			if (
				recurrenceData &&
				typeof recurrenceData === 'object' &&
				recurrenceData.recurrenceTeam &&
				Array.isArray(recurrenceData.recurrenceTeam) &&
				recurrenceData.recurrenceTeam.length > 0
			) {
				const teamMemberIds = recurrenceData.recurrenceTeam
					.map((member) => member && typeof member === 'object' && member.id)
					.filter((id) => typeof id === 'string' && id.trim() !== '');

				if (teamMemberIds.length > 0) {
					// 👉 Utiliser la fonction importée
					const teamEmails = utils.getEmailsByIds(teamMemberIds);

					if (teamEmails.length > 0) {
						// Utiliser un Set pour dédupliquer facilement
						const combinedRecipients = new Set([...recipients, ...teamEmails]);
						recipients = Array.from(combinedRecipients);
					}
				}
			}
		}

		// --- Envoi de l'email ---
		if (recipients.length > 0) {
			// 👉 Utiliser la fonction importée
			utils.sendEmail(recipients, subject, htmlContent);
			return e.json(200, { message: 'Notification sent successfully.' });
		} else {
			console.log(
				`Aucun destinataire trouvé pour la notification ${requestData.notificationType} de l'événement ${requestData.eventId}`
			);
			return e.json(200, { message: 'No recipients found for notification.' });
		}
	} catch (err) {
		console.error(`Error processing notification for event ${requestData.eventId}:`, err);
		// Renvoyer l'erreur PocketBase ou une erreur serveur générique
		if (err instanceof ApiError) {
			throw err;
		}
		throw new InternalServerError('Failed to process notification due to server error.');
	}
});
