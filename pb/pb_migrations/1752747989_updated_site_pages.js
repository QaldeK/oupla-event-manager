/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_446563808");

		// add field
		collection.fields.addAt(
			14,
			new Field({
				hidden: false,
				id: "date2550482046",
				max: "",
				min: "",
				name: "lastMod",
				presentable: false,
				required: false,
				system: false,
				type: "date"
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_446563808");

		// remove field
		collection.fields.removeById("date2550482046");

		return app.save(collection);
	}
);
