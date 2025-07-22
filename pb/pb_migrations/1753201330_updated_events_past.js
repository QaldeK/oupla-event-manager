/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3434440329")

  // update collection data
  unmarshal({
    "listRule": "  // Événements publics et publiés\n    (isConfirmed = true) ||\n    // OU événements créés par l'utilisateur externe\n    (@request.auth.id != \"\" && created_by = @request.auth.id) ||\n    // OU membre de l'espace avec accès complet\n    (@collection.spaceMembers.user ?= @request.auth.id && \n     @collection.spaceMembers.space ?= space.id && \n     @collection.spaceMembers.role != \"external\")",
    "viewRule": " (isConfirmed = true) ||\n    (@request.auth.id != \"\" && created_by = @request.auth.id) ||\n    (@collection.spaceMembers.user ?= @request.auth.id && \n     @collection.spaceMembers.space ?= space.id && \n     @collection.spaceMembers.role != \"external\")"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3434440329")

  // update collection data
  unmarshal({
    "listRule": "  // Événements publics et publiés\n    (isPublished = true && isConfirmed = true) ||\n    // OU événements créés par l'utilisateur externe\n    (@request.auth.id != \"\" && created_by = @request.auth.id) ||\n    // OU membre de l'espace avec accès complet\n    (@collection.spaceMembers.user ?= @request.auth.id && \n     @collection.spaceMembers.space ?= space.id && \n     @collection.spaceMembers.role != \"external\")",
    "viewRule": " (isPublished = true && isConfirmed = true) ||\n    (@request.auth.id != \"\" && created_by = @request.auth.id) ||\n    (@collection.spaceMembers.user ?= @request.auth.id && \n     @collection.spaceMembers.space ?= space.id && \n     @collection.spaceMembers.role != \"external\")"
  }, collection)

  return app.save(collection)
})
