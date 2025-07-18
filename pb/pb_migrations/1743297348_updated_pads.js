/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_3976083202");

		// add field
		collection.fields.addAt(
			5,
			new Field({
				hidden: false,
				id: "bool2928788026",
				name: "isEditing",
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
				collectionId: "_pb_users_auth_",
				hidden: false,
				id: "relation1106636067",
				maxSelect: 1,
				minSelect: 0,
				name: "editingUser",
				presentable: false,
				required: false,
				system: false,
				type: "relation"
			})
		);

		// add field
		collection.fields.addAt(
			7,
			new Field({
				hidden: false,
				id: "date1838275899",
				max: "",
				min: "",
				name: "lastEditHeartbeat",
				presentable: false,
				required: false,
				system: false,
				type: "date"
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_3976083202");

		// remove field
		collection.fields.removeById("bool2928788026");

		// remove field
		collection.fields.removeById("relation1106636067");

		// remove field
		collection.fields.removeById("date1838275899");

		return app.save(collection);
	}
);
