/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm");

		// add field
		collection.fields.addAt(
			8,
			new Field({
				hidden: false,
				id: "bool2085137391",
				name: "isMasterRecurrent",
				presentable: false,
				required: false,
				system: false,
				type: "bool"
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm");

		// remove field
		collection.fields.removeById("bool2085137391");

		return app.save(collection);
	}
);
