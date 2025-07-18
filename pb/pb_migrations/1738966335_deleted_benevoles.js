/// <reference path="../pb_data/types.d.ts" />
migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId("ht418buovyl73vb");

		return app.delete(collection);
	},
	(app) => {
		const collection = new Collection({
			createRule: "",
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
					id: "pwpyen04",
					max: 25,
					min: 0,
					name: "name",
					pattern: "",
					presentable: false,
					primaryKey: false,
					required: true,
					system: false,
					type: "text"
				},
				{
					exceptDomains: null,
					hidden: false,
					id: "e4rnj476",
					name: "mail",
					onlyDomains: null,
					presentable: false,
					required: true,
					system: false,
					type: "email"
				},
				{
					hidden: false,
					id: "s6gkpp5w",
					maxSelect: 1,
					name: "status",
					presentable: false,
					required: false,
					system: false,
					type: "select",
					values: ["1er", "2nd", "collectif", "autre"]
				},
				{
					autogeneratePattern: "",
					hidden: false,
					id: "ie6pz2a8",
					max: 25,
					min: 0,
					name: "space",
					pattern: "",
					presentable: false,
					primaryKey: false,
					required: false,
					system: false,
					type: "text"
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
			id: "ht418buovyl73vb",
			indexes: ["CREATE UNIQUE INDEX `idx_p3Fm5vJ` ON `benevoles` (\n  `mail`,\n  `name`\n)"],
			listRule: "",
			name: "benevoles",
			system: false,
			type: "base",
			updateRule: "",
			viewRule: ""
		});

		return app.save(collection);
	}
);
