/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm");

		// update field
		collection.fields.addAt(
			1,
			new Field({
				cascadeDelete: false,
				collectionId: "x9nemirbltqou9s",
				hidden: false,
				id: "fbsdvhu5",
				maxSelect: 1,
				minSelect: 0,
				name: "space",
				presentable: false,
				required: true,
				system: false,
				type: "relation"
			})
		);

		// update field
		collection.fields.addAt(
			42,
			new Field({
				cascadeDelete: false,
				collectionId: "_pb_users_auth_",
				hidden: false,
				id: "relation3725765462",
				maxSelect: 1,
				minSelect: 0,
				name: "created_by",
				presentable: false,
				required: true,
				system: false,
				type: "relation"
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm");

		// update field
		collection.fields.addAt(
			1,
			new Field({
				cascadeDelete: false,
				collectionId: "x9nemirbltqou9s",
				hidden: false,
				id: "fbsdvhu5",
				maxSelect: 1,
				minSelect: 0,
				name: "space",
				presentable: false,
				required: false,
				system: false,
				type: "relation"
			})
		);

		// update field
		collection.fields.addAt(
			42,
			new Field({
				cascadeDelete: false,
				collectionId: "_pb_users_auth_",
				hidden: false,
				id: "relation3725765462",
				maxSelect: 1,
				minSelect: 0,
				name: "created_by",
				presentable: false,
				required: false,
				system: false,
				type: "relation"
			})
		);

		return app.save(collection);
	}
);
