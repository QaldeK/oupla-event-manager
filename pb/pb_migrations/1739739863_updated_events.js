/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // update collection data
  unmarshal({
    "listRule": "isPublished = true || (@collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id)",
    "viewRule": "isPublished = true || (@collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // update collection data
  unmarshal({
    "listRule": "",
    "viewRule": ""
  }, collection)

  return app.save(collection)
})
