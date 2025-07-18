/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_3976083202");

		// add field
		collection.fields.addAt(
			4,
			new Field({
				cascadeDelete: false,
				collectionId: "x9nemirbltqou9s",
				hidden: false,
				id: "relation695386426",
				maxSelect: 1,
				minSelect: 0,
				name: "space",
				presentable: false,
				required: true,
				system: false,
				type: "relation"
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_3976083202");

		// remove field
		collection.fields.removeById("relation695386426");

		return app.save(collection);
	}
);
