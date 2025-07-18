/// pb_hooks/pad_check_and_clean_lock.pb.js

/**
 * Définit une route API personnalisée pour vérifier et potentiellement nettoyer
 * un verrou expiré sur un pad spécifique.
 *
 * Route: GET /api/custom/pads/check_and_clean_lock/{id}
 */
routerAdd("GET", "/pad_check_and_clean_lock/{id}", (e) => {
	const recordId = e.request.pathValue("id");

	let record;
	try {
		record = $app.findRecordById("pads", recordId);
	} catch (err) {
		// Gérer le cas où le pad n'est pas trouvé
		if (err.toString().includes("NotFoundError") || err.status === 404) {
			return e.json(404, { error: "Pad not found." });
		}
		return e.json(500, { error: "Internal server error finding pad." });
	}

	let cleaned = false; // Pour indiquer si le nettoyage a eu lieu

	// Vérifier si le pad est verrouillé
	if (record && record.getBool("isEditing")) {
		const lastHeartbeat = record.getDateTime("lastEditHeartbeat");
		const LOCK_TIMEOUT_MS = 2.5 * 60 * 1000; // 2.5 minutes

		if (lastHeartbeat) {
			// Convertir en Date JavaScript
			const heartbeatDate = new Date(lastHeartbeat);
			const timeDiff = Date.now() - heartbeatDate.getTime();

			if (timeDiff > LOCK_TIMEOUT_MS) {
				// Préparer la mise à jour
				record.set("isEditing", false);
				record.set("editingUser", null);
				try {
					// Sauvegarder les modifications
					$app.save(record);
					cleaned = true; // Marquer comme nettoyé
				} catch (saveError) {
					console.error(`[CheckLock API] Pad ${recordId}: Error saving cleanup:`, saveError);
					// Ne pas retourner d'erreur 500 ici, car la lecture initiale a réussi
					// On pourrait logger l'erreur, mais répondre avec l'état actuel (non nettoyé).
				}
			}
		}
	}
	return;
});
