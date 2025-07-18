/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm");

		// add field
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
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm");

		// remove field
		collection.fields.removeById("relation3190310418");

		return app.save(collection);
	}
);
