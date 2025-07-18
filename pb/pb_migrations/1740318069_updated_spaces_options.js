/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("nrrz61kk7hwrf00");

		// update collection data
		unmarshal(
			{
				createRule:
					"@request.auth.id != '' && @collection.spaceMembers.space ?= space.id &&  @collection.spaceMembers.role ?= \"admin\"\n"
			},
			collection
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("nrrz61kk7hwrf00");

		// update collection data
		unmarshal(
			{
				createRule:
					"@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id &&  @collection.spaceMembers.role ?= \"admin\"\n"
			},
			collection
		);

		return app.save(collection);
	}
);
