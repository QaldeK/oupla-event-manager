/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = new Collection({
			createRule:
				"@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id ",
			deleteRule: null,
			fields: [
				{
					autogeneratePattern: "[a-z0-9]{15}",
					hidden: false,
					id: "text3208210256",
					max: 15,
					min: 15,
					name: "id",
					pattern: "^[a-z0-9]+$",
					presentable: false,
					primaryKey: true,
					required: true,
					system: true,
					type: "text"
				},
				{
					autogeneratePattern: "",
					hidden: false,
					id: "text724990059",
					max: 0,
					min: 0,
					name: "title",
					pattern: "",
					presentable: false,
					primaryKey: false,
					required: true,
					system: false,
					type: "text"
				},
				{
					cascadeDelete: false,
					collectionId: "_pb_users_auth_",
					hidden: false,
					id: "relation3725765462",
					maxSelect: 1,
					minSelect: 0,
					name: "created_by",
					presentable: false,
					required: true,
					system: false,
					type: "relation"
				},
				{
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
				},
				{
					hidden: false,
					id: "bool2928788026",
					name: "isEditing",
					presentable: false,
					required: false,
					system: false,
					type: "bool"
				},
				{
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
				},
				{
					hidden: false,
					id: "date1838275899",
					max: "",
					min: "",
					name: "lastEditHeartbeat",
					presentable: false,
					required: false,
					system: false,
					type: "date"
				},
				{
					convertURLs: false,
					hidden: false,
					id: "editor4274335913",
					maxSize: 0,
					name: "content",
					presentable: false,
					required: false,
					system: false,
					type: "editor"
				},
				{
					hidden: false,
					id: "autodate2990389176",
					name: "created",
					onCreate: true,
					onUpdate: false,
					presentable: false,
					system: false,
					type: "autodate"
				},
				{
					hidden: false,
					id: "autodate3332085495",
					name: "updated",
					onCreate: true,
					onUpdate: true,
					presentable: false,
					system: false,
					type: "autodate"
				}
			],
			id: "pbc_446563808",
			indexes: [],
			listRule:
				"@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id ",
			name: "site_pages",
			system: false,
			type: "base",
			updateRule:
				"@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id ",
			viewRule:
				"@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id "
		});

		return app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId("pbc_446563808");

		return app.delete(collection);
	}
);
