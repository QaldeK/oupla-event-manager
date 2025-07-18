/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_446563808");

		// update field
		collection.fields.addAt(
			8,
			new Field({
				hidden: false,
				id: "select2363381545",
				maxSelect: 1,
				name: "section",
				presentable: false,
				required: false,
				system: false,
				type: "select",
				values: ["page", "leftSide", "header", "top", "rightSide", "footer"]
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_446563808");

		// update field
		collection.fields.addAt(
			8,
			new Field({
				hidden: false,
				id: "select2363381545",
				maxSelect: 1,
				name: "section",
				presentable: false,
				required: false,
				system: false,
				type: "select",
				values: ["pad", "page", "leftSide", "header", "top", "rightSide", "footer"]
			})
		);

		return app.save(collection);
	}
);
