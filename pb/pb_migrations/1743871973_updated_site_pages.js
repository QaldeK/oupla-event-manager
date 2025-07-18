/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_446563808");

		// add field
		collection.fields.addAt(
			12,
			new Field({
				hidden: false,
				id: "json3950243567",
				maxSize: 0,
				name: "uiPage",
				presentable: false,
				required: false,
				system: false,
				type: "json"
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_446563808");

		// remove field
		collection.fields.removeById("json3950243567");

		return app.save(collection);
	}
);
