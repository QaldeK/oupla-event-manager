/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("8xwnoxb0ap9cwzh");

		// remove field
		collection.fields.removeById("json4294699577");

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("8xwnoxb0ap9cwzh");

		// add field
		collection.fields.addAt(
			4,
			new Field({
				hidden: false,
				id: "json4294699577",
				maxSize: 0,
				name: "memberOfRecurrent",
				presentable: false,
				required: false,
				system: false,
				type: "json"
			})
		);

		return app.save(collection);
	}
);
