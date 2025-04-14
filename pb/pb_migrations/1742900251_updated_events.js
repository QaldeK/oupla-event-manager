/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // update collection data
  unmarshal({
    "listRule": " (isPublic = true && isConfirmed = true) \n  || (@request.auth.id != \"\" && created_by = @request.auth.id) \n  || (@collection.spaceMembers.user ?= @request.auth.id \n    && @collection.spaceMembers.space ?= space.id )",
    "viewRule": " (isPublic = true && isConfirmed = true) \n  || (@request.auth.id != \"\" && created_by = @request.auth.id) \n  || (@collection.spaceMembers.user ?= @request.auth.id \n    && @collection.spaceMembers.space ?= space.id )"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // update collection data
  unmarshal({
    "listRule": " (isPublished = true && isConfirmed = true) \n  || (@request.auth.id != \"\" && created_by = @request.auth.id) \n  || (@collection.spaceMembers.user ?= @request.auth.id \n    && @collection.spaceMembers.space ?= space.id )",
    "viewRule": " (isPublished = true && isConfirmed = true) \n  || (@request.auth.id != \"\" && created_by = @request.auth.id) \n  || (@collection.spaceMembers.user ?= @request.auth.id \n    && @collection.spaceMembers.space ?= space.id )"
  }, collection)

  return app.save(collection)
})
