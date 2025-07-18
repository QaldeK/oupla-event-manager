/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_446563808");

		// add field
		collection.fields.addAt(
			11,
			new Field({
				hidden: false,
				id: "select3830517522",
				maxSelect: 1,
				name: "bg_color",
				presentable: false,
				required: false,
				system: false,
				type: "select",
				values: ["primary", "secondary", "outline", "warning", "error", "success"]
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_446563808");

		// remove field
		collection.fields.removeById("select3830517522");

		return app.save(collection);
	}
);
