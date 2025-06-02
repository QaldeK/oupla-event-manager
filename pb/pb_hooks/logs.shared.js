/// pb_hooks/logs.shared.js
/// <reference path="../pb_data/types.d.ts" />

/**
 * Crée une nouvelle entrée de log.
 * @param {Object} param0
 * @param {string} param0.action - L'action effectuée (ex: "create_event", "delete_message", "notify_event_confirmed").
 * @param {string} [param0.collection_target] - Le nom de la collection cible (ex: "events", "messages").
 * @param {string} [param0.record_target_id] - L'ID de l'enregistrement cible.
 * @param {string} param0.user_actor_id - L'ID de l'utilisateur ayant effectué l'action.
 * @param {string} [param0.space_id] - L'ID de l'espace concerné.
 * @param {string[]} [param0.users_concerned] - Tableau des ID des utilisateurs concernés par ce log.
 * @param {Object} [param0.details] - Données JSON supplémentaires.
 */
function createLogEntry({
	action,
	collection_target,
	record_target_id,
	user_actor_id,
	space_id,
	users_concerned = [],
	details
}) {
	try {
		const logsCollection = $app.findCollectionByNameOrId("logs");
		const logRecord = new Record(logsCollection); // Crée une instance vide pour cette collection

		logRecord.set("action", action);
		if (collection_target) logRecord.set("collection_target", collection_target);
		if (record_target_id) logRecord.set("record_target_id", record_target_id);
		logRecord.set("user_actor_id", user_actor_id);
		if (space_id) logRecord.set("space", space_id);

		const finalUsersConcerned = [...new Set(users_concerned.filter(Boolean))];
		if (finalUsersConcerned.length > 0) {
			logRecord.set("users_concerned", finalUsersConcerned);
		}

		if (details) logRecord.set("details", details);

		$app.save(logRecord); 
	} catch (err) {
		console.error(`Failed to create log entry (action: ${action}): ${JSON.stringify(err)}`);
	}
}

module.exports = { createLogEntry };
