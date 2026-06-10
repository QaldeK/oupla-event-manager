/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration de sécurité — Correction des API Rules critiques
 *
 * C1: users.deleteRule    → null (superuser only)
 * C2: users.listRule      → restreint (soi-même + admin via spaceMembers)
 * C3: site_pages.deleteRule → restreint aux admins de l'espace
 * C4: spaceMembers.createRule → vérification rôle existant
 * C5: spaceMembers.updateRule → vérification rôle existant
 * H1: events.listRule     → restreint aux membres de l'espace
 */
migrate(
	(app) => {
		// --- C1: users.deleteRule → null (superuser only) ---
		const users = app.findCollectionByNameOrId("_pb_users_auth_");
		unmarshal(
			{
				deleteRule: null
			},
			users
		);
		app.save(users);

		// --- C2: users.listRule → restreint ---
		// soi-même OU membre de l'espace (sans vérification de rôle)
		const users2 = app.findCollectionByNameOrId("_pb_users_auth_");
		unmarshal(
			{
				listRule:
					"@request.auth.id != '' && (@request.auth.id = id || @collection.spaceMembers.user ?= @request.auth.id)"
			},
			users2
		);
		app.save(users2);

		// --- C3: site_pages.deleteRule → admin de l'espace ---
		const sitePages = app.findCollectionByNameOrId("site_pages");
		unmarshal(
			{
				deleteRule:
					"@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id && @collection.spaceMembers.role ?= 'admin'"
			},
			sitePages
		);
		app.save(sitePages);

		// --- C4: spaceMembers.createRule → créateur ou admin existant ---
		const spaceMembers = app.findCollectionByNameOrId("spaceMembers");
		unmarshal(
			{
				createRule:
					"@request.auth.id != '' && (space.created_by = @request.auth.id || (@collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space && @collection.spaceMembers.role ?= 'admin'))"
			},
			spaceMembers
		);
		app.save(spaceMembers);

		// --- C5: spaceMembers.updateRule → créateur ou admin existant ---
		const spaceMembers2 = app.findCollectionByNameOrId("spaceMembers");
		unmarshal(
			{
				updateRule:
					"@request.auth.id != '' && (space.created_by = @request.auth.id || (@collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space && @collection.spaceMembers.role ?= 'admin'))"
			},
			spaceMembers2
		);
		app.save(spaceMembers2);

		// --- H1: events.listRule → membres de l'espace ---
		const events = app.findCollectionByNameOrId("events");
		unmarshal(
			{
				listRule:
					"@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id"
			},
			events
		);
		app.save(events);
	},
	(app) => {
		// --- Rollback C1: users.deleteRule → "" (PUBLIC) ---
		const users = app.findCollectionByNameOrId("_pb_users_auth_");
		unmarshal(
			{
				deleteRule: ""
			},
			users
		);
		app.save(users);

		// --- Rollback C2: users.listRule → "" (PUBLIC) ---
		const users2 = app.findCollectionByNameOrId("_pb_users_auth_");
		unmarshal(
			{
				listRule: ""
			},
			users2
		);
		app.save(users2);

		// --- Rollback C3: site_pages.deleteRule → "" (PUBLIC) ---
		const sitePages = app.findCollectionByNameOrId("site_pages");
		unmarshal(
			{
				deleteRule: ""
			},
			sitePages
		);
		app.save(sitePages);

		// --- Rollback C4: spaceMembers.createRule → ancienne valeur ---
		const spaceMembers = app.findCollectionByNameOrId("spaceMembers");
		unmarshal(
			{
				createRule:
					"@request.auth.id != '' && (user = @request.auth.id || space.created_by = @request.auth.id || (role = 'admin' || role = 'helpers'))"
			},
			spaceMembers
		);
		app.save(spaceMembers);

		// --- Rollback C5: spaceMembers.updateRule → ancienne valeur ---
		const spaceMembers2 = app.findCollectionByNameOrId("spaceMembers");
		unmarshal(
			{
				updateRule:
					"@request.auth.id != '' && (user = @request.auth.id || space.created_by = @request.auth.id || role = \"admin\")"
			},
			spaceMembers2
		);
		app.save(spaceMembers2);

		// --- Rollback H1: events.listRule → "" (PUBLIC) ---
		const events = app.findCollectionByNameOrId("events");
		unmarshal(
			{
				listRule: ""
			},
			events
		);
		app.save(events);
	}
);
