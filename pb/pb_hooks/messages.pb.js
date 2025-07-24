// pb_hooks/messages.pb.js
/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de création de message - calcule et remplit le champ users_concerned
 */
onRecordCreateRequest((e) => {
	/**
	 * Extrait tous les utilisateurs impliqués dans un événement
	 * @param {string} eventId - L'ID de l'événement
	 * @returns {string[]} - Tableau des IDs utilisateurs
	 */
	function getEventActors(eventId) {
		try {
			const event = $app.findRecordById("events", eventId);
			const userIds = new Set();


			// Ajouter les organisateurs
			const organizersJson = event.getString("organizers");
			if (organizersJson) {
				try {
					const organizers = JSON.parse(organizersJson);
					if (Array.isArray(organizers)) {
						organizers.forEach((org) => {
							if (org.id) {
								userIds.add(org.id);
							}
						});
					}
				} catch (e) {
					console.error("[ERROR] Failed to parse organizers JSON:", e);
				}
			}

			// Ajouter les participants aux sondages (dates_proposed)
			const datesProposedJson = event.getString("dates_proposed");
			if (datesProposedJson) {
				try {
					const datesProposed = JSON.parse(datesProposedJson);
					if (Array.isArray(datesProposed)) {
						datesProposed.forEach((dateProposal) => {
							if (dateProposal.organizers && Array.isArray(dateProposal.organizers)) {
								dateProposal.organizers.forEach((org) => {
									if (org.id) {
										userIds.add(org.id);
									}
								});
							}
						});
					}
				} catch (e) {
					console.error("[ERROR] Failed to parse dates_proposed JSON:", e);
				}
			}

			// Ajouter l'équipe de récurrence si événement récurrent
			const recurrenceJson = event.getString("recurrence");
			if (recurrenceJson) {
				try {
					const recurrence = JSON.parse(recurrenceJson);
					if (recurrence.recurrenceTeam && Array.isArray(recurrence.recurrenceTeam)) {
						recurrence.recurrenceTeam.forEach((member) => {
							if (member.id) {
								userIds.add(member.id);
							}
						});
					}
				} catch (e) {
					console.error("[ERROR] Failed to parse recurrence JSON:", e);
				}
			}

			return Array.from(userIds);
		} catch (error) {
			console.error("[ERROR] Failed to retrieve event actors for ID:", eventId, error);
			return [];
		}
	}

	/**
	 * Récupère tous les participants précédents à la discussion d'un événement
	 * @param {string} eventId - L'ID de l'événement
	 * @param {string} currentMessageId - L'ID du message actuel (pour l'exclure)
	 * @returns {string[]} - Tableau des IDs utilisateurs ayant participé à la discussion
	 */
	function getPreviousDiscussionParticipants(eventId, currentMessageId) {
		try {
			// Récupérer tous les messages de cet événement (sauf le message actuel)
			const filter = `event="${eventId}" && id!="${currentMessageId}"`;
			const previousMessages = $app.findRecordsByFilter("messages", filter, "-created", 500);

			const participantIds = new Set();
			previousMessages.forEach((message) => {
				const userId = message.getString("user");
				if (userId) {
					participantIds.add(userId);
				}
			});

			return Array.from(participantIds);
		} catch (error) {
			console.error("[ERROR] Failed to retrieve previous discussion participants:", error);
			return [];
		}
	}

	/**
	 * Calcule la liste des utilisateurs concernés par un message
	 * @param {Object} record - L'enregistrement du message
	 * @returns {string[]} - Tableau des IDs utilisateurs concernés
	 */
	function calculateUsersConcerned(record) {
		const userIds = new Set();

		// 1. Ajouter l'auteur du message
		const authorId = record.getString("user");
		if (authorId) {
			userIds.add(authorId);
		}

		//... Suppression de replyingTo → inclus dans previousParticipants

		// 3. Si lié à un événement, ajouter tous les acteurs de l'événement
		const eventId = record.getString("event");
		if (eventId) {
			const eventActors = getEventActors(eventId);
			eventActors.forEach((actorId) => userIds.add(actorId));

			// 4. Ajouter tous les participants précédents à la discussion
			const previousParticipants = getPreviousDiscussionParticipants(eventId, record.getString("id"));
			previousParticipants.forEach((participantId) => userIds.add(participantId));
		}

		// Filtrer les valeurs nulles/undefined et retourner le tableau
		return Array.from(userIds).filter(Boolean);
	}

	console.log("[DEBUG] Messages hook: Starting users_concerned calculation");

	try {
		const usersConcerned = calculateUsersConcerned(e.record);
		console.log("[DEBUG] Messages hook: Calculated users_concerned:", usersConcerned);

		// Définir le champ users_concerned
		e.record.set("users_concerned", usersConcerned);

		console.log("[DEBUG] Messages hook: users_concerned field set successfully");
	} catch (error) {
		console.error("[ERROR] Messages hook: Failed to calculate users_concerned:", error);
		// En cas d'erreur, on laisse le champ vide plutôt que de bloquer la création
		e.record.set("users_concerned", []);
	}

	e.next();
}, "messages");
