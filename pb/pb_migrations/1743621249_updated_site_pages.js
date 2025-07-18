/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_446563808");

		// add field
		collection.fields.addAt(
			9,
			new Field({
				hidden: false,
				id: "select2363381545",
				maxSelect: 2,
				name: "type",
				presentable: false,
				required: false,
				system: false,
				type: "select",
				values: ["pad", "page", "left_side", "header", "right_side", "footer"]
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_446563808");

		// remove field
		collection.fields.removeById("select2363381545");

		return app.save(collection);
	}
);
