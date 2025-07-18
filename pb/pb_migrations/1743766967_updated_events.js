/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm");

		// remove field
		collection.fields.removeById("2hkkraq2");

		// add field
		collection.fields.addAt(
			45,
			new Field({
				hidden: false,
				id: "number2105242618",
				max: 99,
				min: null,
				name: "age_advice",
				onlyInt: false,
				presentable: false,
				required: false,
				system: false,
				type: "number"
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm");

		// add field
		collection.fields.addAt(
			23,
			new Field({
				autogeneratePattern: "",
				hidden: false,
				id: "2hkkraq2",
				max: 255,
				min: 0,
				name: "age_advice",
				pattern: "",
				presentable: false,
				primaryKey: false,
				required: false,
				system: false,
				type: "text"
			})
		);

		// remove field
		collection.fields.removeById("number2105242618");

		return app.save(collection);
	}
);
