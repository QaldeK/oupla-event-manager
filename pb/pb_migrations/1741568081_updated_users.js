/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("_pb_users_auth_");

		// update collection data
		unmarshal(
			{
				indexes: [
					"CREATE UNIQUE INDEX `__pb_users_auth__username_idx` ON `users` (`username` COLLATE NOCASE)",
					"CREATE UNIQUE INDEX `__pb_users_auth__email_idx` ON `users` (`email`) WHERE `email` != ''",
					"CREATE UNIQUE INDEX `__pb_users_auth__tokenKey_idx` ON `users` (`tokenKey`)"
				],
				passwordAuth: {
					identityFields: ["email"]
				}
			},
			collection
		);

		// update field
		collection.fields.addAt(
			6,
			new Field({
				autogeneratePattern: "users[0-9]{6}",
				hidden: false,
				id: "text4166911607",
				max: 150,
				min: 3,
				name: "username",
				pattern: "^[\\w][\\w\\.\\-]*$",
				presentable: false,
				primaryKey: false,
				required: false,
				system: false,
				type: "text"
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("_pb_users_auth_");

		// update collection data
		unmarshal(
			{
				indexes: [
					"CREATE UNIQUE INDEX `__pb_users_auth__username_idx` ON `users` (username COLLATE NOCASE)",
					"CREATE UNIQUE INDEX `__pb_users_auth__email_idx` ON `users` (`email`) WHERE `email` != ''",
					"CREATE UNIQUE INDEX `__pb_users_auth__tokenKey_idx` ON `users` (`tokenKey`)"
				],
				passwordAuth: {
					identityFields: ["email", "username"]
				}
			},
			collection
		);

		// update field
		collection.fields.addAt(
			6,
			new Field({
				autogeneratePattern: "users[0-9]{6}",
				hidden: false,
				id: "text4166911607",
				max: 150,
				min: 3,
				name: "username",
				pattern: "^[\\w][\\w\\.\\-]*$",
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
