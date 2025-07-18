/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("_pb_users_auth_");

		// add field
		collection.fields.addAt(
			10,
			new Field({
				hidden: false,
				id: "bool3865754731",
				name: "isInvited",
				presentable: false,
				required: false,
				system: false,
				type: "bool"
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("_pb_users_auth_");

		// remove field
		collection.fields.removeById("bool3865754731");

		return app.save(collection);
	}
);
