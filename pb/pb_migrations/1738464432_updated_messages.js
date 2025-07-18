/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_2605467279");

		// update collection data
		unmarshal(
			{
				createRule: "@request.auth.id != ''",
				deleteRule: "@request.auth.id = user.id",
				indexes: ["CREATE INDEX `idx_event_date` ON `messages` (\n  `event`,\n  `user`\n)"],
				listRule: "@request.auth.id != ''",
				updateRule: "@request.auth.id = user.id",
				viewRule: "@request.auth.id != ''"
			},
			collection
		);

		// add field
		collection.fields.addAt(
			1,
			new Field({
				cascadeDelete: false,
				collectionId: "y2bmoym46ud46vm",
				hidden: false,
				id: "relation1001261735",
				maxSelect: 1,
				minSelect: 0,
				name: "event",
				presentable: false,
				required: true,
				system: false,
				type: "relation"
			})
		);

		// add field
		collection.fields.addAt(
			2,
			new Field({
				cascadeDelete: false,
				collectionId: "_pb_users_auth_",
				hidden: false,
				id: "relation2375276105",
				maxSelect: 1,
				minSelect: 0,
				name: "user",
				presentable: false,
				required: true,
				system: false,
				type: "relation"
			})
		);

		// add field
		collection.fields.addAt(
			3,
			new Field({
				autogeneratePattern: "",
				hidden: false,
				id: "text4274335913",
				max: 0,
				min: 0,
				name: "content",
				pattern: "",
				presentable: false,
				primaryKey: false,
				required: true,
				system: false,
				type: "text"
			})
		);

		// add field
		collection.fields.addAt(
			4,
			new Field({
				cascadeDelete: false,
				collectionId: "pbc_2605467279",
				hidden: false,
				id: "relation1032740943",
				maxSelect: 1,
				minSelect: 0,
				name: "parent",
				presentable: false,
				required: false,
				system: false,
				type: "relation"
			})
		);

		// add field
		collection.fields.addAt(
			5,
			new Field({
				hidden: false,
				id: "bool60991163",
				name: "isEdited",
				presentable: false,
				required: false,
				system: false,
				type: "bool"
			})
		);

		// add field
		collection.fields.addAt(
			6,
			new Field({
				cascadeDelete: false,
				collectionId: "x9nemirbltqou9s",
				hidden: false,
				id: "relation695386426",
				maxSelect: 1,
				minSelect: 0,
				name: "space",
				presentable: false,
				required: true,
				system: false,
				type: "relation"
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_2605467279");

		// update collection data
		unmarshal(
			{
				createRule: null,
				deleteRule: null,
				indexes: [],
				listRule: null,
				updateRule: null,
				viewRule: null
			},
			collection
		);

		// remove field
		collection.fields.removeById("relation1001261735");

		// remove field
		collection.fields.removeById("relation2375276105");

		// remove field
		collection.fields.removeById("text4274335913");

		// remove field
		collection.fields.removeById("relation1032740943");

		// remove field
		collection.fields.removeById("bool60991163");

		// remove field
		collection.fields.removeById("relation695386426");

		return app.save(collection);
	}
);
