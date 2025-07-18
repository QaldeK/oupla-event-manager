/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("x9nemirbltqou9s");

		// update collection data
		unmarshal(
			{
				listRule: ""
			},
			collection
		);

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
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("x9nemirbltqou9s");

		// update collection data
		unmarshal(
			{
				listRule: "@request.auth.id != ''"
			},
			collection
		);

		// update field
		collection.fields.addAt(
			1,
			new Field({
				autogeneratePattern: "",
				hidden: false,
				id: "xbre26ne",
				max: 25,
				min: 0,
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
