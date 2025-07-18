/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_2605467279");

		// update collection data
		unmarshal(
			{
				createRule: "@request.auth.id != '' ",
				listRule: "@request.auth.id != '' && space.id = @collection.spaceMembers.space",
				viewRule: "@request.auth.id != '' "
			},
			collection
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_2605467279");

		// update collection data
		unmarshal(
			{
				createRule: "@request.auth.id != '' && @collection.spaceMembers.space ?= space.id",
				listRule: "@request.auth.id != '' && @collection.spaceMembers.space ?= space.id",
				viewRule: "@request.auth.id != '' && @collection.spaceMembers.space ?= space.id"
			},
			collection
		);

		return app.save(collection);
	}
);
