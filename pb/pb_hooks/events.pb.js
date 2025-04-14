// <reference path="../pb_data/types.d.ts" />

// onRecordAfterCreateSuccess((e) => {
// 	const masterEvent = e.record;
// 	console.log('masterEvent hook', masterEvent);

// 	if (masterEvent.isMasterRecurrents) {
// 		console.log('masterEvent loop hook');
// 		try {
// 			// Création des events récurrents
// 			const recurrenceDates = masterEvent.recurrence.recurrenceDates;
// 			for (const date of recurrenceDates) {
// 				const childEvent = {
// 					...masterEvent,
// 					isMasterRecurrent: false,
// 					masterRecurrentId: masterEvent.id,
// 					date_event: date
// 				};

// 				// Supprime les propriétés réservées au master
// 				delete childEvent.id;
// 				delete childEvent.recurrenceDates;
// 				delete childEvent.created;
// 				delete childEvent.updated;

// 				$app.dao().save(childEvent);
// 			}
// 		} catch (err) {
// 			console.error('Error creating recurrent events:', err);
// 		}
// 	} else {
// 		console.log('no hook....');
// 	}
// });
