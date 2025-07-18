/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_3615662572");

		// update collection data
		unmarshal(
			{
				indexes: [
					"CREATE INDEX `idx_logs_action` ON `logs` (`action`)",
					"CREATE INDEX `idx_logs_space` ON `logs` (`space`)",
					"CREATE INDEX `idx_user_actor` ON `logs` (`user_actor_id`)",
					"CREATE INDEX `idx_logs_collection_target` ON `logs` (`collection_target`)",
					"CREATE INDEX `idx_logs_created` ON `logs` (`created`)",
					"CREATE INDEX `idx_logs_users_concerned` ON `logs` (`users_concerned`)"
				]
			},
			collection
		);

		// add field
		collection.fields.addAt(
			3,
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

		// add field
		collection.fields.addAt(
			4,
			new Field({
				autogeneratePattern: "",
				hidden: false,
				id: "text2401221378",
				max: 0,
				min: 0,
				name: "record_target_id",
				pattern: "",
				presentable: false,
				primaryKey: false,
				required: false,
				system: false,
				type: "text"
			})
		);

		// add field
		collection.fields.addAt(
			5,
			new Field({
				cascadeDelete: false,
				collectionId: "_pb_users_auth_",
				hidden: false,
				id: "relation4032239178",
				maxSelect: 1,
				minSelect: 0,
				name: "user_actor_id",
				presentable: false,
				required: true,
				system: false,
				type: "relation"
			})
		);

		// add field
		collection.fields.addAt(
			6,
			new Field({
				autogeneratePattern: "",
				hidden: false,
				id: "text1915095946",
				max: 0,
				min: 0,
				name: "details",
				pattern: "",
				presentable: false,
				primaryKey: false,
				required: false,
				system: false,
				type: "text"
			})
		);

		// add field
		collection.fields.addAt(
			7,
			new Field({
				cascadeDelete: false,
				collectionId: "_pb_users_auth_",
				hidden: false,
				id: "relation960522198",
				maxSelect: 999,
				minSelect: 0,
				name: "users_concerned",
				presentable: false,
				required: false,
				system: false,
				type: "relation"
			})
		);

		// update field
		collection.fields.addAt(
			2,
			new Field({
				autogeneratePattern: "",
				hidden: false,
				id: "text4232930610",
				max: 0,
				min: 0,
				name: "collection_target",
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
		const collection = app.findCollectionByNameOrId("pbc_3615662572");

		// update collection data
		unmarshal(
			{
				indexes: []
			},
			collection
		);

		// remove field
		collection.fields.removeById("relation695386426");

		// remove field
		collection.fields.removeById("text2401221378");

		// remove field
		collection.fields.removeById("relation4032239178");

		// remove field
		collection.fields.removeById("text1915095946");

		// remove field
		collection.fields.removeById("relation960522198");

		// update field
		collection.fields.addAt(
			2,
			new Field({
				autogeneratePattern: "",
				hidden: false,
				id: "text4232930610",
				max: 0,
				min: 0,
				name: "collection",
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
