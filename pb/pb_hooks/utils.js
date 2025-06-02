/// pb_hooks/utils.js
/// <reference path="../pb_data/types.d.ts" />

/**
 * Récupère l'ID de l'acteur de l'action.
 * @param {Object} e - L'objet événement du hook.
 * @param {string} [fallback="system_operation"] - Valeur par défaut si aucun acteur n'est trouvé.
 * @returns {string}
 */
function getActorId(e, fallback = "system_operation") {
	if (e.auth && e.auth.id) {
		// Pour les requêtes authentifiées par des utilisateurs
		return e.auth.id;
	}
	if (e.admin && e.admin.id) {
		// Pour les actions effectuées par un admin via l'UI/API admin
		return e.admin.id; // ou "admin:" + e.admin.id pour distinguer
	}
	// Cas où le hook est déclenché par le système (ex: cron, ou une requête API sans auth mais autorisée)
	// e.httpContext n'est pas standard ici, on se base sur e.auth et e.admin
	return fallback;
}

/**
 * Récupère le titre d'un événement à partir de son ID.
 * @param {string} eventId - L'ID de l'événement.
 * @returns {string} - Le titre de l'événement ou une valeur par défaut.
 */
function getEventTitle(eventId) {
	try {
		const event = $app.findRecordById("events", eventId);
		return event.getString("event_title") || "Événement";
	} catch (error) {
		console.log("[ERROR] Failed to retrieve event title for ID:", eventId, error);
		return "Événement";
	}
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

module.exports = { getActorId, getEventTitle, formatDate };

/*
# LOADING MODULES

Please note that the embedded JavaScript engine is not a Node.js or browser environment, meaning that modules that relies on APIs like window, fs, fetch, buffer or any other runtime specific API not part of the ES5 spec may not work!

You can load modules either by specifying their local filesystem path or by using their name, which will automatically search in:

the current working directory (affects also relative paths)
any node_modules directory
any parent node_modules directory
Currently only CommonJS (CJS) modules are supported and can be loaded with const x = require(...).
ECMAScript modules (ESM) can be loaded by first precompiling and transforming your dependencies with a bundler like rollup, webpack, browserify, etc.

A common usage of local modules is for loading shared helpers or configuration parameters, for example:

// pb_hooks/utils.js
module.exports = {
    hello: (name) => {
        console.log("Hello " + name)
    }
}
// pb_hooks/main.pb.js
onBootstrap((e) => {
    e.next()

    const utils = require(`${__hooks}/utils.js`)
    utils.hello("world")
})
Loaded modules use a shared registry and mutations should be avoided when possible to prevent concurrency issues.
*/
