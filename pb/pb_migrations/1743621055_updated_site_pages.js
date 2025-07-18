/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_446563808");

		// remove field
		collection.fields.removeById("select2363381545");

		// add field
		collection.fields.addAt(
			8,
			new Field({
				hidden: false,
				id: "json1874629670",
				maxSize: 0,
				name: "tags",
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

		// add field
		collection.fields.addAt(
			8,
			new Field({
				hidden: false,
				id: "select2363381545",
				maxSelect: 1,
				name: "type",
				presentable: false,
				required: false,
				system: false,
				type: "select",
				values: ["news", "head", "left", "right"]
			})
		);

		// remove field
		collection.fields.removeById("json1874629670");

		return app.save(collection);
	}
);
