/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_446563808")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id "
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_446563808")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id && @collection.spaceMembers.role = \"admin\""
  }, collection)

  return app.save(collection)
})
