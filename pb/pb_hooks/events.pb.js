// <reference path="../pb_data/types.d.ts" />
// pb_hooks/events.pb.js

const { createLogEntry } = require(`${__hooks}/logs.shared.js`);
const { getActorId } = require(`${__hooks}/utils.js`);

// --- LOGS DE SUPPRESSION D'ÉVÉNEMENT ---
onRecordAfterDeleteSuccess((e) => {
	const { createLogEntry } = require(`${__hooks}/logs.shared.js`);
	const { getActorId } = require(`${__hooks}/utils.js`);

	console.log("[DEBUG] Starting event deletion process");
	const actorId = getActorId(e, "system_deleted_event"); // Qui a supprimé ?
	console.log("[DEBUG] Actor ID for deletion:", actorId);

	createLogEntry({
		action: "delete_event",
		collection_target: e.collection.name,
		record_target_id: e.record.id,
		user_actor_id: actorId,
		space_id: e.record.get("space")
		// users_concerned: potentiellement tous les organisateurs précédents, ou les membres de l'espace
	});
	console.log("[DEBUG] Event deletion log created successfully");
}, "events");

// --- LOGS DE CRÉATION D'ÉVÉNEMENT ---
onRecordAfterCreateSuccess((e) => {
	const { createLogEntry } = require(`${__hooks}/logs.shared.js`);
	const { getActorId } = require(`${__hooks}/utils.js`);

	console.log("[DEBUG] Starting event creation process");
	const actorId = getActorId(e, "system_created_event");
	console.log("[DEBUG] Actor ID for creation:", actorId);

	createLogEntry({
		action: "create_event",
		collection_target: "events",
		record_target_id: e.record.id,
		user_actor_id: actorId,
		space_id: e.record.get("space")
		// users_concerned: Pourrait être vide, ou les admins de l'espace, etc.
	});
	console.log("[DEBUG] Event creation log created successfully");
}, "events");

// --- LOGS DE MISE À JOUR D'ÉVÉNEMENT (complexe pour users_concerned) ---

// onRecordAfterUpdateSuccess((e) => {
// 	const { createLogEntry } = require(`${__hooks}/logs.shared.js`);
// 	const { getActorId } = require(`${__hooks}/utils.js`);

// 	console.log("[DEBUG] Starting HOOK event update process → logs");

// 	const actorId = getActorId(e, "system_updated_event");
// 	const spaceId = e.record.get("space");
// 	const eventId = e.record.id;
// 	const updatedEvent = e.record; // L'enregistrement avec les données mises à jour

// 	console.log("[DEBUG] Event update details:", actorId, spaceId, eventId);

// 	const originalRecord = updatedEvent.original();
// 	console.log("[DEBUG] Original record retrieved", originalRecord);

// 	let usersToNotify = new Set();
// 	let notificationAction = null;
// 	let logDetails = {}; // Pour le log de notification spécifique

// 	// Comparaison entre updatedEvent (état après) et originalRecord (état avant)
// 	const originalEventData = {
// 		isConfirmed: originalRecord.getBool("isConfirmed"),
// 		canceled: originalRecord.getBool("canceled"),
// 		dateStart: originalRecord.getString("dateStart"),
// 		dateEnd: originalRecord.getString("dateEnd"),
// 		dates_proposed: originalRecord.get("dates_proposed") || [],
// 		organizers: originalRecord.get("organizers") || []
// 	};

// 	console.log("[DEBUG] Original event data:", originalEventData);

// 	const currentOrganizersIds = (updatedEvent.get("organizers") || []).map((org) => org.id);
// 	console.log("[DEBUG] Current organizers IDs:", currentOrganizersIds);

// 	let changedFieldsForOrganizers = [];
// 	if (updatedEvent.getBool("isConfirmed") !== originalEventData.isConfirmed)
// 		changedFieldsForOrganizers.push("isConfirmed");
// 	if (updatedEvent.getBool("canceled") !== originalEventData.canceled)
// 		changedFieldsForOrganizers.push("canceled");
// 	if (updatedEvent.getString("dateStart") !== originalEventData.dateStart)
// 		changedFieldsForOrganizers.push("dateStart");
// 	if (updatedEvent.getString("dateEnd") !== originalEventData.dateEnd)
// 		changedFieldsForOrganizers.push("dateEnd");

// 	console.log("[DEBUG] Changed fields:", changedFieldsForOrganizers);

// 	if (changedFieldsForOrganizers.length > 0) {
// 		console.log("[DEBUG] Processing changes for organizers");
// 		notificationAction = "notify_event_details_changed";
// 		currentOrganizersIds.forEach((id) => usersToNotify.add(id));
// 		logDetails.changedFields = changedFieldsForOrganizers;
// 		logDetails.from = {
// 			/* ... valeurs de originalEventData ... */
// 		};
// 		logDetails.to = {
// 			/* ... valeurs de updatedEvent.get... ... */
// 		};
// 	}

// 	const newDateStart = updatedEvent.getString("dateStart");
// 	const wasSondage =
// 		originalEventData.dates_proposed && originalEventData.dates_proposed.length > 0;
// 	const dateNewlySet = newDateStart && !originalEventData.dateStart;
// 	const newlyConfirmed = updatedEvent.getBool("isConfirmed") && !originalEventData.isConfirmed;

// 	console.log("[DEBUG] Sondage status:", { wasSondage, dateNewlySet, newlyConfirmed });

// 	if (wasSondage && (dateNewlySet || newlyConfirmed)) {
// 		console.log("[DEBUG] Processing sondage resolution");
// 		notificationAction = notificationAction || "notify_sondage_resolved";
// 		const participantsSondage = new Set();
// 		(originalEventData.dates_proposed || []).forEach((proposal) => {
// 			(proposal.organizers || []).forEach((org) => participantsSondage.add(org.id));
// 		});
// 		participantsSondage.forEach((id) => usersToNotify.add(id));
// 		logDetails.sondageResolvedInfo = {
// 			/* ... */
// 		};
// 	}

// 	console.log("[DEBUG] Creating generic update log");
// 	createLogEntry({
// 		action: "update_event",
// 		collection_target: e.collection.name,
// 		record_target_id: eventId,
// 		user_actor_id: actorId,
// 		space_id: spaceId,
// 		details: { generalUpdate: true }
// 	});

// 	if (notificationAction && usersToNotify.size > 0) {
// 		console.log("[DEBUG] Creating notification log for concerned users");
// 		createLogEntry({
// 			action: notificationAction,
// 			collection_target: e.collection.name,
// 			record_target_id: eventId,
// 			user_actor_id: actorId,
// 			space_id: spaceId,
// 			users_concerned: Array.from(usersToNotify),
// 			details: logDetails
// 		});
// 	}

// 	console.log("[DEBUG] Event update process completed");
// }, "events");

// TEST

// onRecordAfterUpdateSuccess((e) => {
// 	console.log("e → ", e); // → [object Object]
// 	console.log("e.record → ", e.record); // → [object Object]

// 	console.log("e.record.id → ", e.record.id); // → c3074410e73a692

// 	console.log("e.record.get('event_title) → ", e.record.get("event_title")); // → event title
// 	console.log("e.record.getString('event_title) → ", e.record.getString("event_title")); // → event Title

// 	// space is Relation row
// 	console.log(`e.record.get("space") → `, e.record.get("space")); // → xl69b9bu7yjbaj7 // id
// 	console.log(`e.record.expand("space") → `, e.record.expand("space")); // → [object Object]

// 	let record = e.record;
// 	$app.expandRecord(record, ["space", "created_by"], null);
// 	console.log(`e.record.expandedOne("space") → `, record.expandedOne("space")); // → [object Object]
// 	console.log(`e.record.expandedOne("space") → `, record.expandedOne("space").get("name")); // → mofo  ^^
// 	console.log(`e.record.expandedAll("created_by") → `, e.record.expandedAll("created_by")); // → [object Object]

// 	console.log();

// 	console.log("e.record.get('dates_proposed') → ", e.record.get("dates_proposed")); // → [{"dateEnd":"2025-05-24T18:00:00.000Z","dateStart":"2025-05-24T15:00:00.000Z","organizers":[{"id":"o48pvotsdr2o7gt","maybehere":"oui","tasks":[],"username":"aldek"}]},{"dateEnd":"2025-05-25T18:00:00.000Z","dateStart":"2025-05-25T15:00:00.000Z","organizers":[{"id":"o48pvotsdr2o7gt","maybehere":"oui","tasks":[],"username":"aldek"}]},{"dateEnd":"2025-05-30T18:00:00.000Z","dateStart":"2025-05-30T15:00:00.000Z","organizers":[{"id":"o48pvotsdr2o7gt","maybehere":"oui","tasks":[],"username":"aldek"}]}]

// 	// console.log(
// 	// 	"e.record.get('dates_proposed') → ",
// 	// 	e.record.get("dates_proposed").expandedAll("organizers")
// 	// ); // ERROR

// 	// let result = new DynamicModel({ "organizers"})
// 	// console.log(
// 	// 	"e.record.unmarshalJSONField('dates_proposed') → ",
// 	// 	e.record.unmarshalJSONField("dates_proposed", result)
// 	// ); // →

// 	//	console.log(`e.requestInfo() → `, e.requestInfo());
// 	/* → ERROR PATCH /api/collections/events/records/ms85e39bs6ud016
// └─ Failed to update record.
// └─ TypeError: Object has no member 'requestInfo' */

// 	console.log("e.record.original() → ", e.record.original()); // [object Object]

// 	// const original = e.record.original();
// 	// console.log("e.record.get(original) → ", e.record.get(original)); // null

// 	// console.log("e.requestInfo.auth →", e.requestInfo.auth); // ERROR

// 	e.next();
// }, "events");

onRecordUpdateRequest(
	// TODO:
	// bien réfléchir aux message que l'on souhaite, comment les créer...
	//
	(e) => {
		let record = e.record;
		let oldRecord = record.original();

		let actorId = e.auth.get("id");

		let created_by = record.get("created_by");
		console.log("created_by → ", created_by);

		let baseInfoLog = {
			collection_target: e.collection.name,
			record_target_id: e.record.id,
			record_target_name: record.get("event_title"),
			user_actor_name: e.auth.get("username"),
			user_actor_id: actorId,
			space_id: e.record.get("space")
		};

		const organizers = JSON.parse(record.get("organizers") || "[]");
		const organizersId = organizers.map((org) => org.id);

		const datesProposedChanged = () => {
			console.log("datesProposedChanged");

			const oldDates = JSON.parse(oldRecord.get("dates_proposed") || "[]");
			const newDates = JSON.parse(record.get("dates_proposed") || "[]");
			return JSON.stringify(oldDates) !== JSON.stringify(newDates);
		};

		const isConfirmedChanged = () => {
			console.log("isConfirmedChanged");
			return oldRecord.getBool("isConfirmed") !== record.getBool("isConfirmed");
		};

		const canceledChanged = () => {
			console.log("canceledChanged");
			return oldRecord.getBool("canceled") !== record.getBool("canceled");
		};

		const dateChanged = () => {
			console.log("dateChanged");
			return (
				oldRecord.getString("dateStart") !== record.getString("dateStart") ||
				oldRecord.getString("dateEnd") !== record.getString("dateEnd")
			);
		};

		const isSondageOpen = () => {
			console.log("isSondageOpen");
			return oldRecord.isSondage === false && record.isSondage === true;
		};

		const isSondageClosed = () => {
			console.log("isSondageClosed");
			return oldRecord.isSondage === true && record.isSondage === false;
		};

		let newMandatedOrganizers = [];
		let unmandatedOrganizers = [];

		const isOrganizersChanged = () => {
			console.log("isOrganizersChanged");
			const oldOrganizers = JSON.parse(oldRecord.get("organizers") || "[]");
			if (JSON.stringify(oldOrganizers) !== JSON.stringify(organizers)) {
				// Find organizers who were added (concerned users, excluding actor)
				newMandatedOrganizers = organizers
					.filter(
						(newOrg) =>
							!oldOrganizers.some((oldOrg) => oldOrg.id === newOrg.id) && newOrg.id !== actorId
					)
					.map((org) => org.id);

				// Find organizers who were removed (concerned users, excluding actor)
				unmandatedOrganizers = oldOrganizers
					.filter(
						(oldOrg) =>
							!organizers.some((newOrg) => newOrg.id === oldOrg.id) && oldOrg.id !== actorId
					)
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
				action: "notify_sondage_proposed",
				users_concerned: [...(organizersId + created_by)],
				details: {
					fields: ["dates_proposed"]
				}
			});
		}

		if (isConfirmedChanged()) {
			createLogEntry({
				...baseInfoLog,
				action: "notify_event_confirmed",
				users_concerned: [...(organizersId + created_by)],
				details: {
					fields: ["isConfirmed"]
				}
			});
		}

		if (canceledChanged()) {
			createLogEntry({
				...baseInfoLog,
				action: "notify_event_canceled",
				users_concerned: [...(organizersId + created_by)],
				details: {
					fields: ["canceled"]
				}
			});
		}
		// TEST Debug
		console.log("isOrganizersChanged", isOrganizersChanged());
		console.log("newMandatedOrganizers", newMandatedOrganizers);
		console.log("unmandatedOrganizers", unmandatedOrganizers);
		console.log("concernedOrgAndCreator", [organizersId, created_by]);

		e.next(); // si avant, execute l'update avec la suite. Sinon placer à la fin
	},
	"message",
	"events"
);

onRecordAfterUpdateSuccess((e) => {
	// console.log("AfterUPDATESuccess");
	e.next(); // Important ! sinon bloque la suite (genre la reactivité svelte avec le syncState)
}, "events");
