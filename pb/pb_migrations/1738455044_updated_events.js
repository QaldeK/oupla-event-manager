/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id",
    "deleteRule": "@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id",
    "updateRule": "@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != '' ",
    "deleteRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.id != '' "
  }, collection)

  return app.save(collection)
})
