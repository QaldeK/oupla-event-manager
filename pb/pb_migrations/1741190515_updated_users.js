/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("_pb_users_auth_");

		// add field
		collection.fields.addAt(
			8,
			new Field({
				autogeneratePattern: "",
				hidden: false,
				id: "text248656496",
				max: 0,
				min: 0,
				name: "invitationToken",
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
			9,
			new Field({
				hidden: false,
				id: "date3759631705",
				max: "",
				min: "",
				name: "invitationExpires",
				presentable: false,
				required: false,
				system: false,
				type: "date"
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("_pb_users_auth_");

		// remove field
		collection.fields.removeById("text248656496");

		// remove field
		collection.fields.removeById("date3759631705");

		return app.save(collection);
	}
);
