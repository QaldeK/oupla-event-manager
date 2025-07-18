/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_446563808");

		// add field
		collection.fields.addAt(
			10,
			new Field({
				hidden: false,
				id: "number2161764012",
				max: 100,
				min: 1,
				name: "pos",
				onlyInt: true,
				presentable: false,
				required: true,
				system: false,
				type: "number"
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_446563808");

		// remove field
		collection.fields.removeById("number2161764012");

		return app.save(collection);
	}
);
