/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // update collection data
  unmarshal({
    "listRule": " (isPublished = true && isConfirmed = true) \n  || (@request.auth.id != \"\" && created_by = @request.auth.id) \n  || (@collection.spaceMembers.user ?= @request.auth.id \n    && @collection.spaceMembers.space ?= space.id \n      && @collection.users.spaceMembers_via_user.role != 'external')"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // update collection data
  unmarshal({
    "listRule": " (isPublished = true && isConfirmed = true) \n  || (@request.auth.id != \"\" && created_by = @request.auth.id) \n  || (@collection.spaceMembers.user ?= @request.auth.id \n    && @collection.spaceMembers.space ?= space.id \n      )"
  }, collection)

  return app.save(collection)
})
