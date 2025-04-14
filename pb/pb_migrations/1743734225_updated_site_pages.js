/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_446563808")

  // update collection data
  unmarshal({
    "listRule": "",
    "viewRule": ""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_446563808")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id ",
    "viewRule": "@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id "
  }, collection)

  return app.save(collection)
})
