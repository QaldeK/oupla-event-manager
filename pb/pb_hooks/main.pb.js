/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((e) => {
	try {
		console.log('👉 Hook démarré - onRecordCreateRequest');

		const userId = e.record.created_by;
		const spaceId = e.record.space;

		console.log('userId:', userId, 'spaceId:', spaceId);

		// Si pas d'userId ou spaceId, on continue sans vérification
		if (!userId || !spaceId) {
			console.log('Pas de userId ou spaceId, continuation...');
			e.next();
			return;
		}

		// Vérification du membre
		const spaceMember = $app.findFirstRecordByFilter(
			'spaceMembers',
			'user = {:userId} && space = {:spaceId}',
			{
				userId,
				spaceId
			}
		);

		console.log('spaceMember trouvé:', spaceMember ? 'oui' : 'non');

		// Si pas membre ou pas external, on continue
		if (!spaceMember || spaceMember.get('role') !== 'external') {
			console.log('Utilisateur non external ou non membre, continuation...');
			e.next();
			return;
		}

		// Vérification du nombre d'événements
		const oneWeekAgo = new Date();
		oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

		const events = $app.findRecordsByFilter(
			'events',
			'created_by = {:userId} && created >= {:oneWeekAgo}',
			{
				userId,
				oneWeekAgo: oneWeekAgo.toISOString()
			}
		);

		console.log("Nombre d'événements trouvés:", events.length);

		if (events.length >= 2) {
			console.log("Limite d'événements atteinte, rejet...");
			throw new Error(
				'Les utilisateurs externes ne peuvent pas créer plus de 2 événements par semaine'
			);
		}

		console.log('Hook terminé avec succès, continuation...');
		e.next();
	} catch (error) {
		console.error('Erreur dans le hook:', error);
		throw error;
	}
}, 'events');
