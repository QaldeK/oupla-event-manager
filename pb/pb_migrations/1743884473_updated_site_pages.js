/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_446563808");

		// add field
		collection.fields.addAt(
			13,
			new Field({
				hidden: false,
				id: "bool1358543748",
				name: "enabled",
				presentable: false,
				required: false,
				system: false,
				type: "bool"
			})
		);

		// add field
		collection.fields.addAt(
			14,
			new Field({
				autogeneratePattern: "",
				hidden: false,
				id: "text666094940",
				max: 0,
				min: 0,
				name: "componentType",
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
		const collection = app.findCollectionByNameOrId("pbc_446563808");

		// remove field
		collection.fields.removeById("bool1358543748");

		// remove field
		collection.fields.removeById("text666094940");

		return app.save(collection);
	}
);
