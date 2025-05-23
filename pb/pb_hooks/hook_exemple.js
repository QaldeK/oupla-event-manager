onRecordUpdateRequest(
	(e) => {
		console.log("e.app →", e.app);
		console.log("e.requestInfo →", e.requestInfo);
		// console.log("e.collection →", e.collection);
		console.log("e.record → ", e.record); // [object Object]
		console.log("e.record.get → ", e.record.get("event_title")); // new event title

		let record = e.record;
		console.log("record.clone() → ", record.clone()); // [object Object]
		console.log("JSON.stringify(record.clone())) → ", JSON.stringify(record.clone())); // objet complet

		console.log("JSON.stringify(record.fresh()) → ", JSON.stringify(record.fresh())); // objet complet, mais pas de diff avec clone pouet un events, testé sur un record user ?

		let original = e.record.original(); // retourne une copie du record avant la mise à jour
		console.log(" e.record.original.get → ", original.get("event_title")); // old event title

		console.log("e.auth.get('id') → ", e.auth.get("id")); // id
		console.log("e.auth.get('email') → ", e.auth.get("email")); // email@mail.com

		// console.log("e.requestInfo.body → ", e.requestInfo.toString()); // function reflect.methodValueCall() { [native code] }

		let result = "";
		console.log("e.record.get('rooms') → ", e.record.get("rooms"));

		e.next(); // si avant, execute l'update avec la suite. Sinon placer à la fin
	},
	"message",
	"events"
);

onRecordAfterUpdateSuccess((e) => {
	// console.log("AfterUPDATESuccess");
	e.next(); // Important ! sinon bloque la suite (genre la reactivité svelte avec le syncState)
}, "events");
