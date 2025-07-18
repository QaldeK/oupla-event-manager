/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm");

		// remove field
		collection.fields.removeById("wf7r2fav");

		// update field
		collection.fields.addAt(
			34,
			new Field({
				autogeneratePattern: "",
				hidden: false,
				id: "enve4zuz",
				max: 0,
				min: 0,
				name: "recurrentId",
				pattern: "",
				presentable: false,
				primaryKey: false,
				required: false,
				system: false,
				type: "text"
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm");

		// add field
		collection.fields.addAt(
			35,
			new Field({
				hidden: false,
				id: "wf7r2fav",
				name: "isRecurrentMaster",
				presentable: false,
				required: false,
				system: false,
				type: "bool"
			})
		);

		// update field
		collection.fields.addAt(
			34,
			new Field({
				autogeneratePattern: "",
				hidden: false,
				id: "enve4zuz",
				max: 0,
				min: 0,
				name: "recurrentMasterId",
				pattern: "",
				presentable: false,
				primaryKey: false,
				required: false,
				system: false,
				type: "text"
			})
		);

		return app.save(collection);
	}
);
