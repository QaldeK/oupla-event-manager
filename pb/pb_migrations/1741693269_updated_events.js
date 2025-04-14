/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // update collection data
  unmarshal({
    "listRule": " (isPublished = true && isConfirmed = true) \n|| (@request.auth.id != \"\" && created_by = @request.auth.id)  \n|| (@collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // update collection data
  unmarshal({
    "listRule": " (isPublished = true && isConfirmed = true) || (@request.auth.id != \"\" && created_by = @request.auth.id)  || (@collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id &&      @collection.spaceMembers.role != \"external\")"
  }, collection)

  return app.save(collection)
})
