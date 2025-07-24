// <reference path="../pb_data/types.d.ts" />
// pb_hooks/events.pb.js

const { createLogEntry } = require(`${__hooks}/logs.shared.js`);
const { getActorId } = require(`${__hooks}/utils.js`);

/* --- LOGS DE CRÉATION D'ÉVÉNEMENT ---
Crée un log avec pour concerned users les organisateurs et les participants du sondage
*/
onRecordCreateRequest((e) => {
	e.next();

	// import des fonctions utilistaires
	const { createLogEntry } = require(`${__hooks}/logs.shared.js`);

	let record = e.record;

	// base info
	console.log("record → ", JSON.stringify(record));

	console.log("[DEBUG] Starting event creation process");
	const actorId = e.auth.get("id") || "system";
	console.log("[DEBUG] Actor ID for creation:", actorId);
	console.log("[DEBUG] Record ID for creation:", record.get("id"));
	console.log("[DEBUG] Record title for creation:", record.get("event_title"));

	console.log("[DEBUG] Creating log without users_concerned for create_event");
	createLogEntry({
		action: "create_event",
		collection_target: "events",
		record_target_id: e.record.get("id"),
		user_actor_id: actorId,
		space_id: e.record.get("space"),
		details: {
			event_title: record.get("event_title") || "Événement",
			date_event: record.get("date_event") || null,
			message: `Nouvel événement "${record.get("event_title") || "Événement"}" créé`
		}
	});
	console.log("[DEBUG] Event creation log created successfully");
}, "events");

// TODO:
// bien réfléchir aux message que l'on souhaite, comment les créer...
//
onRecordUpdateRequest(
	(e) => {
		e.next();

		const { createLogEntry } = require(`${__hooks}/logs.shared.js`);

		let record = e.record;
		let oldRecord = record.original();

		let actorId = e.auth.get("id");

		const record_target_name = record.get("event_title");
		const user_actor_name = e.auth.get("username");

		let created_by = record.get("created_by");
		console.log("created_by → ", created_by);

		let baseInfoLog = {
			collection_target: e.collection.name,
			record_target_id: e.record.id,
			user_actor_id: actorId,
			space_id: e.record.get("space")
		};

		const organizers = JSON.parse(record.get("organizers") || "[]");
		const organizersId = organizers.map((org) => org.id);

		const datesProposedChanged = () => {
			const oldDates = JSON.parse(oldRecord.get("dates_proposed") || "[]");
			const newDates = JSON.parse(record.get("dates_proposed") || "[]");
			return JSON.stringify(oldDates) !== JSON.stringify(newDates);
		};

		const isConfirmedChanged = () => {
			return oldRecord.getBool("isConfirmed") !== record.getBool("isConfirmed");
		};

		const canceledChanged = () => {
			return oldRecord.getBool("canceled") !== record.getBool("canceled");
		};

		const dateChanged = () => {
			return (
				oldRecord.getString("dateStart") !== record.getString("dateStart") ||
				oldRecord.getString("dateEnd") !== record.getString("dateEnd")
			);
		};

		const isSondageOpen = () => {
			return oldRecord.isSondage === false && record.isSondage === true;
		};

		const isSondageClosed = () => {
			return oldRecord.isSondage === true && record.isSondage === false;
		};

		let newMandatedOrganizers = [];
		let unmandatedOrganizers = [];

		const isOrganizersChanged = () => {
			const oldOrganizers = JSON.parse(oldRecord.get("organizers") || "[]");
			if (JSON.stringify(oldOrganizers) !== JSON.stringify(organizers)) {
				// Find organizers who were added
				newMandatedOrganizers = organizers
					.filter((newOrg) => !oldOrganizers.some((oldOrg) => oldOrg.id === newOrg.id) && newOrg.id)
					.map((org) => org.id);

				// Find organizers who were removed
				unmandatedOrganizers = oldOrganizers
					.filter((oldOrg) => !organizers.some((newOrg) => newOrg.id === oldOrg.id) && oldOrg.id)
					.map((org) => org.id);

				// // Add added users concerned IDs to newMandatedOrganizers set
				// addedUsersConcernedIds.forEach((id) => newMandatedOrganizers.add(id));

				// // Add removed users concerned IDs to unmandatedOrganizers set
				// removedUsersConcernedIds.forEach((id) => unmandatedOrganizers.add(id));

				// // Add the creator's ID to both sets if it exists
				// if (created_by && created_by.id) {
				// 	newMandatedOrganizers.add(created_by.id);
				// 	unmandatedOrganizers.add(created_by.id);
				// }

				return true; // Organizers list has changed
			}
			return false;
		};

		if (datesProposedChanged()) {
			createLogEntry({
				...baseInfoLog,
				action: "sondage_proposed",
				users_concerned: [...organizersId, created_by].filter(Boolean),
				details: {
					event_title: record.get("event_title") || "Événement",
					date_event: record.get("date_event") || null,
					message: `Nouvelles dates proposées pour "${record.get("event_title") || "Événement"}"`
				}
			});
		}

		if (isConfirmedChanged()) {
			createLogEntry({
				...baseInfoLog,
				action: "event_confirmed",
				users_concerned: [...organizersId, created_by].filter(Boolean),
				details: {
					event_title: record.get("event_title") || "Événement",
					date_event: record.get("date_event") || null,
					message: `L'événement "${record.get("event_title") || "Événement"}" a été confirmé`
				}
			});
		}

		// FIXIT : gérer les 'retabli' et 'reporté'
		if (canceledChanged()) {
			createLogEntry({
				...baseInfoLog,
				action: "event_canceled",
				users_concerned: [...organizersId, created_by].filter(Boolean),
				details: {
					event_title: record.get("event_title") || "Événement",
					date_event: record.get("date_event") || null,
					message: `L'événement "${record.get("event_title") || "Événement"}" a été annulé`
				}
			});
		}

		if (dateChanged()) {
			createLogEntry({
				...baseInfoLog,
				action: "event_date_changed",
				users_concerned: [...organizersId, created_by].filter(Boolean),
				details: {
					event_title: record.get("event_title") || "Événement",
					date_event: record.get("date_event") || null,
					message: `La date de "${record.get("event_title") || "Événement"}" a été modifiée`
				}
			});

			if (isSondageOpen()) {
				createLogEntry({
					...baseInfoLog,
					action: "sondage_opened",
					users_concerned: ["all"].filter(Boolean),
					details: {
						event_title: record.get("event_title") || "Événement",
						date_event: record.get("date_event") || null,
						message: `Sondage ouvert pour "${record.get("event_title") || "Événement"}"`
					}
				});
			}

			if (isSondageClosed()) {
				createLogEntry({
					...baseInfoLog,
					action: "sondage_closed",
					users_concerned: [...organizersId, created_by].filter(Boolean),
					details: {
						event_title: record.get("event_title") || "Événement",
						date_event: record.get("date_event") || null,
						message: `Sondage fermé pour "${record.get("event_title") || "Événement"}"`
					}
				});
			}

			// 👉 Gestion des changements d'organisateurs
			if (isOrganizersChanged()) {
				let messageParts = [];

				// Ajout du message pour les inscriptions
				if (newMandatedOrganizers.length > 0) {
					messageParts.push(
						`${newMandatedOrganizers.length} nouvelle${newMandatedOrganizers.length > 1 ? "s" : ""} inscription${newMandatedOrganizers.length > 1 ? "s" : ""}`
					);
				}

				// Ajout du message pour les désinscriptions
				if (unmandatedOrganizers.length > 0) {
					messageParts.push(
						`${unmandatedOrganizers.length} désinscription${unmandatedOrganizers.length > 1 ? "s" : ""}`
					);
				}

				// Construction du message final
				const message = `${messageParts.join(" et ")} pour l'organisation de l'événement ${record_target_name}`;

				// console.log("[DEBUG] Organizers changed:", message);
				const concernedUsers = [
					...new Set(
						[...organizersId, ...newMandatedOrganizers, ...unmandatedOrganizers, created_by].filter(
							Boolean
						)
					)
				];
				// console.log("[DEBUG]  ConcernedUser:", concernedUsers);
				createLogEntry({
					...baseInfoLog,
					action: "organizers_changed",
					users_concerned: concernedUsers,
					details: {
						event_title: record.get("event_title") || "Événement",
						date_event: record.get("date_event") || null,
						fields: ["organizers"],
						message: message
					}
				});
			}
		}
		// console.log("newMandatedOrganizers", newMandatedOrganizers);
		// console.log("unmandatedOrganizers", unmandatedOrganizers);
		// console.log("concernedOrgAndCreator", [organizersId, created_by]);
	},
	"message",
	"events"
);

// --- LOGS DE SUPPRESSION D'ÉVÉNEMENT ---
onRecordDeleteRequest((e) => {
	const { createLogEntry } = require(`${__hooks}/logs.shared.js`);
	const { getActorId, formatDate } = require(`${__hooks}/utils.js`);

	console.log("[DEBUG] Starting event deletion process");

	const actorId = getActorId(e, "system_deleted_event"); // Qui a supprimé ?
	// console.log("[DEBUG] Actor ID for deletion:", actorId);

	const lisibleDate = formatDate(e.record.getString("date_event"));
	console.log("[DEBUG] Event date for deletion:", lisibleDate);

	const eventTitle = e.record.getString("event_title") || "Événement";
	console.log("[DEBUG] Event title for deletion:", eventTitle);

	let message;

	const isRecurrent = e.record.getBool("isRecurrent");
	console.log("[DEBUG] Is recurrent event:", isRecurrent);

	let concernedUsers;

	try {
		if (isRecurrent) {
			const recurrence = JSON.parse(e.record.get("recurrence") || "{}");
			concernedUsers = [];
			if (recurrence.recurrenceTeam && Array.isArray(recurrence.recurrenceTeam)) {
				for (const teamMember of recurrence.recurrenceTeam) {
					concernedUsers.push(teamMember.id);
				}
			}
			console.log("[DEBUG] Concerned users for recurrent event:", concernedUsers);
			message = `L'occurrence "${eventTitle}" du ${lisibleDate} a été supprimé.`;
			console.log("[DEBUG] Message for recurrent event:", message);
		} else {
			const organizers = JSON.parse(e.record.get("organizers") || "[]");
			concernedUsers = organizers.map((org) => org.id);
			message = `L'événement "${eventTitle}" du ${lisibleDate} a été supprimé.`;
		}
	} catch (error) {
		console.error("[ERROR] Failed to parse recurrence or organizers:", error);
		concernedUsers = [];
		message = `L'événement "${eventTitle}" du ${lisibleDate} a été supprimé.`;
	}

	createLogEntry({
		action: "delete_event",
		collection_target: e.collection.name,
		record_target_id: e.record.id,
		user_actor_id: actorId,
		space_id: e.record.get("space"),
		users_concerned: concernedUsers,
		details: {
			event_title: eventTitle,
			date_event: e.record.getString("date_event") || null,
			message: message
		}
	});

	console.log("[DEBUG] Event deletion log created successfully");
	e.next();
}, "events");
