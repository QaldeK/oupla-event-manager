/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("x9nemirbltqou9s");

		// update field
		collection.fields.addAt(
			1,
			new Field({
				autogeneratePattern: "",
				hidden: false,
				id: "xbre26ne",
				max: 25,
				min: 3,
				name: "name",
				pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
				presentable: false,
				primaryKey: false,
				required: true,
				system: false,
				type: "text"
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("x9nemirbltqou9s");

		// update field
		collection.fields.addAt(
			1,
			new Field({
				autogeneratePattern: "",
				hidden: false,
				id: "xbre26ne",
				max: 25,
				min: 3,
				name: "name",
				pattern: "",
				presentable: false,
				primaryKey: false,
				required: true,
				system: false,
				type: "text"
			})
		);

		return app.save(collection);
	}
);
