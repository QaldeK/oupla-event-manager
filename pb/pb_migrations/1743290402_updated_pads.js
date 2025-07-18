/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_3976083202");

		// update collection data
		unmarshal(
			{
				createRule:
					"@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id ",
				listRule:
					"@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id ",
				updateRule:
					"@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id ",
				viewRule:
					"@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id "
			},
			collection
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_3976083202");

		// update collection data
		unmarshal(
			{
				createRule: null,
				listRule: null,
				updateRule: null,
				viewRule: null
			},
			collection
		);

		return app.save(collection);
	}
);
