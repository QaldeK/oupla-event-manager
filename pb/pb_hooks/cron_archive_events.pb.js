// Définition du cron pour l'archivage des événements
// S'exécute tous les jours à minuit : "0 2 1 * *" / valeur de test : * * * * *
cronAdd('archive_events', '0 2 1 * *', async () => {
	console.log(`👉 [${new Date().toISOString()}] Archivage des événements en cours...`);

	const today = new Date().toISOString().split('T')[0];

	try {
		// Récupérer les événements passés
		const pastEvents = await $app.findRecordsByFilter(
			'events',
			`date_event != '' && date_event < '${today}'`
		);

		// Utiliser une transaction pour garantir l'intégrité des données
		$app.runInTransaction((txApp) => {
			const eventsPastCollection = txApp.findCollectionByNameOrId('events_past');

			for (const event of pastEvents) {
				// Créer un nouvel enregistrement dans events_past
				const archiveRecord = new Record(eventsPastCollection);

				// Copier uniquement les champs nécessaires
				const fieldsToArchive = [
					'space',
					'event_title',
					'date_event',
					'isRecurrent',
					'masterRecurrentId',
					'created_by',
					'organizer',
					'isPublic',
					'isConfirmed',
					'start_public',
					'desc_public',
					'categories'
				];

				fieldsToArchive.forEach((field) => {
					archiveRecord.set(field, event.get(field));
				});

				// Sauvegarder le nouvel enregistrement et supprimer l'ancien
				txApp.save(archiveRecord);
				txApp.delete(event);
			}
		});

		console.log(
			`[${new Date().toISOString()}] Archivage terminé: ${pastEvents.length} événements archivés`
		);
	} catch (err) {
		console.error(`[${new Date().toISOString()}] Erreur lors de l'archivage:`, err);
	}
});
