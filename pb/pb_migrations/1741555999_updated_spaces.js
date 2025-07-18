/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("x9nemirbltqou9s");

		// update collection data
		unmarshal(
			{
				indexes: ["CREATE UNIQUE INDEX `idx_z6HpgYmsQI` ON `spaces` (`name`)"]
			},
			collection
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("x9nemirbltqou9s");

		// update collection data
		unmarshal(
			{
				indexes: []
			},
			collection
		);

		return app.save(collection);
	}
);
