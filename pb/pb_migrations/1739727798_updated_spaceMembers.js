/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("8xwnoxb0ap9cwzh");

		// add field
		collection.fields.addAt(
			5,
			new Field({
				cascadeDelete: false,
				collectionId: "y2bmoym46ud46vm",
				hidden: false,
				id: "relation2300873752",
				maxSelect: 999,
				minSelect: 0,
				name: "isOrganizerOf",
				presentable: false,
				required: false,
				system: false,
				type: "relation"
			})
		);

		// add field
		collection.fields.addAt(
			6,
			new Field({
				cascadeDelete: false,
				collectionId: "y2bmoym46ud46vm",
				hidden: false,
				id: "relation1419685594",
				maxSelect: 999,
				minSelect: 0,
				name: "isMemberOfRecurrent",
				presentable: false,
				required: false,
				system: false,
				type: "relation"
			})
		);

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("8xwnoxb0ap9cwzh");

		// remove field
		collection.fields.removeById("relation2300873752");

		// remove field
		collection.fields.removeById("relation1419685594");

		return app.save(collection);
	}
);
