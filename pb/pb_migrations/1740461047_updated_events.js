/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm");

		// add field
		collection.fields.addAt(
			41,
			new Field({
				hidden: false,
				id: "date591627108",
				max: "",
				min: "",
				name: "dateStart",
				presentable: false,
				required: false,
				system: false,
				type: "date"
			})
		);

		// add field
		collection.fields.addAt(
			42,
			new Field({
				hidden: false,
				id: "date3865544202",
				max: "",
				min: "",
				name: "dateEnd",
				presentable: false,
				required: false,
				system: false,
				type: "date"
			})
		);

		// update field
		collection.fields.addAt(
			40,
			new Field({
				cascadeDelete: false,
				collectionId: "y2bmoym46ud46vm",
				hidden: false,
				id: "relation3190310418",
				maxSelect: 999,
				minSelect: 0,
				name: "inConflictWith",
				presentable: false,
				required: false,
				system: false,
				type: "relation"
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm");

		// remove field
		collection.fields.removeById("date591627108");

		// remove field
		collection.fields.removeById("date3865544202");

		// update field
		collection.fields.addAt(
			40,
			new Field({
				cascadeDelete: false,
				collectionId: "y2bmoym46ud46vm",
				hidden: false,
				id: "relation3190310418",
				maxSelect: 999,
				minSelect: 0,
				name: "inConlictWith",
				presentable: false,
				required: false,
				system: false,
				type: "relation"
			})
		);

		return app.save(collection);
	}
);
