/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_3976083202");

		// add field
		collection.fields.addAt(
			9,
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
		const collection = app.findCollectionByNameOrId("pbc_3976083202");

		// remove field
		collection.fields.removeById("date2550482046");

		return app.save(collection);
	}
);
