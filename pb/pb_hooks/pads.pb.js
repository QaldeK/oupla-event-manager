// pb_hooks/pads.pb.js
/// <reference path="../pb_data/types.d.ts" />

const { createLogEntry } = require(`${__hooks}/logs.shared.js`);
const { getActorId } = require(`${__hooks}/utils.js`);

/**
 * Hook de création de pad - génère un log create_pad
 */
onRecordCreateRequest((e) => {
	console.log("[DEBUG] Pads hook: Starting pad creation log");

	try {
		const actorId = getActorId(e, "system");
		const padTitle = e.record.getString("title") || "Pad sans titre";

		createLogEntry({
			action: "create_pad",
			collection_target: "pads",
			record_target_id: e.record.getString("id"),
			user_actor_id: actorId,
			space_id: e.record.getString("space"),
			users_concerned: [actorId].filter(Boolean),
			details: {
				pad_title: padTitle,
				message: `Nouveau pad "${padTitle}" créé`
			}
		});

		console.log("[DEBUG] Pads hook: create_pad log created successfully");
	} catch (error) {
		console.error("[ERROR] Pads hook: Failed to create pad creation log:", error);
	}

	e.next();
}, "pads");

/**
 * Hook de modification de pad - génère un log update_pad
 */
onRecordUpdateRequest((e) => {
	console.log("[DEBUG] Pads hook: Starting pad update log");

	try {
		const actorId = getActorId(e, "system");
		const padTitle = e.record.getString("title") || "Pad sans titre";
		const oldRecord = e.record.original();

		// Vérifier si le contenu a changé (pas juste les métadonnées comme lastEditHeartbeat)
		const contentChanged = oldRecord.getString("content") !== e.record.getString("content");
		const titleChanged = oldRecord.getString("title") !== e.record.getString("title");

		// Ne générer un log que si le contenu ou le titre a réellement changé
		if (contentChanged || titleChanged) {
			let message = `Le pad "${padTitle}" a été modifié`;

			if (titleChanged && !contentChanged) {
				message = `Le pad a été renommé en "${padTitle}"`;
			} else if (contentChanged && titleChanged) {
				message = `Le pad "${padTitle}" a été modifié (titre et contenu)`;
			}

			createLogEntry({
				action: "update_pad",
				collection_target: "pads",
				record_target_id: e.record.getString("id"),
				user_actor_id: actorId,
				space_id: e.record.getString("space"),
				users_concerned: [actorId].filter(Boolean),
				details: {
					pad_title: padTitle,
					message: message
				}
			});

			console.log("[DEBUG] Pads hook: update_pad log created successfully");
		} else {
			console.log("[DEBUG] Pads hook: No significant changes detected, skipping log");
		}
	} catch (error) {
		console.error("[ERROR] Pads hook: Failed to create pad update log:", error);
	}

	e.next();
}, "pads");
