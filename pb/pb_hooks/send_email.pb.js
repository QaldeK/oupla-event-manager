/// pb_hooks/send_email.pb.js
/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/send_email", (e) => {
	// --- Charger les utilitaires ---
	const utils = require(`${__hooks}/utils.js`);
	const logger = $app.logger();

	// --- Vérification d'authentification ---
	const authRecord = e.auth;
	if (!authRecord) {
		// Ou rendre l'authentification optionnelle/configurable selon les besoins
		throw new UnauthorizedError("Authentication required to send emails.");
	}

	let payload;
	try {
		payload = e.requestInfo().body;
	} catch (parseErr) {
		logger.error("Failed to parse request body JSON.", {
			error: parseErr.message,
			body: e.request.body
		});
		throw new BadRequestError("Invalid JSON payload provided.");
	}

	let subject = payload.subject;
	let htmlContent = payload.htmlContent;
	let textContent = payload.textContent; // Sera éventuellement généré plus tard si manquant
	let recipients = payload.recipients || [];
	let recipientGroups = payload.recipientGroups || [];
	let fallbackRecipientGroups = payload.fallbackRecipientGroups || [];
	const context = payload.context || {}; // Récupérer l'objet context

	logger.info("Parsed payload", { payload: JSON.stringify(payload) });
	logger.info("Parsed context", { context: JSON.stringify(context) });
	logger.info("Parsed eventId from context", { eventId: context?.eventId });

	// --- Vérifier si nous avons affaire à une notification structurée ---
	if (context.notificationType) {
		// Traiter comme une notification avancée
		const result = utils.processNotification(context, utils, logger);
		if (result) {
			subject = result.subject;
			htmlContent = result.htmlContent;
			textContent = result.textContent;
			recipients = result.recipients || [];
			recipientGroups = result.recipientGroups || [];
			fallbackRecipientGroups = result.fallbackRecipientGroups || [];
		}
	}

	// Validation minimale
	if (!subject || !htmlContent) {
		throw new BadRequestError("Missing required fields: subject and htmlContent.");
	}
	if (recipients.length === 0 && recipientGroups.length === 0) {
		throw new BadRequestError(
			"Missing recipients information: provide recipients or recipientGroups."
		);
	}

	// --- Préparation de l'email ---
	// Générer le texte brut si nécessaire (le faire ici plutôt que dans le DynamicModel)
	const finalTextContent = textContent || utils.generatePlainText(htmlContent);

	// --- Résolution des destinataires ---
	let finalRecipients = new Set(recipients);

	// Traiter les IDs d'organisateurs explicites si présents dans le contexte
	if (
		context?.explicitOrganizerIds &&
		Array.isArray(context.explicitOrganizerIds) &&
		context.explicitOrganizerIds.length > 0
	) {
		logger.info("Using explicit organizer IDs from context", { ids: context.explicitOrganizerIds });
		try {
			const explicitEmails = utils.getEmailsByIds(context.explicitOrganizerIds);
			explicitEmails.forEach((email) => finalRecipients.add(email));
			logger.info("Added explicit organizer emails from context", { count: explicitEmails.length });
		} catch (err) {
			logger.error("Error resolving explicit organizer IDs from context", { error: err.message });
		}
	}

	try {
		if (recipientGroups && recipientGroups.length > 0) {
			const resolvedGroupEmails = utils.resolveRecipientGroups(recipientGroups, context);
			resolvedGroupEmails.forEach((email) => finalRecipients.add(email));
		}

		// Appliquer le fallback si les groupes primaires n'ont rien donné ET qu'il n'y avait pas d'emails explicites
		if (
			finalRecipients.size === 0 &&
			fallbackRecipientGroups &&
			fallbackRecipientGroups.length > 0
		) {
			console.log("Applying fallback recipient groups..."); // Log pour débogage
			const resolvedFallbackEmails = utils.resolveRecipientGroups(fallbackRecipientGroups, context);
			resolvedFallbackEmails.forEach((email) => finalRecipients.add(email));
		}
	} catch (resolveErr) {
		logger.error("Error resolving recipient groups.", {
			error: resolveErr.message,
			context: context
		});
		// Décider si l'erreur de résolution doit empêcher l'envoi
		// Si des destinataires explicites existent, on pourrait choisir de continuer
		if (finalRecipients.size === 0) {
			throw new InternalServerError(`Failed to resolve recipient groups: ${resolveErr.message}`);
		} else {
			logger.warn(
				"Could not resolve all recipient groups, sending only to explicit/previously resolved recipients."
			);
		}
	}

	const recipientsArray = Array.from(finalRecipients);

	// --- Envoi ---
	if (recipientsArray.length > 0) {
		try {
			utils.sendEmail(recipientsArray, subject, htmlContent, finalTextContent);
			return e.json(200, {
				message: "Email sent successfully.",
				recipientCount: recipientsArray.length
			});
		} catch (sendErr) {
			console.error("Error during email sending:", sendErr);
			throw new InternalServerError(`Failed to send email: ${sendErr.message}`);
		}
	} else {
		console.log("No valid recipients found after resolving groups.");
		logger.warn("No valid recipients found after resolving groups. Email not sent.", {
			subject: subject,
			initialRecipients: recipients,
			groups: recipientGroups,
			fallbacks: fallbackRecipientGroups
		});
		return e.json(200, { message: "No recipients found, email not sent." });
	}
});
