/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id = id && @collection.spaceMembers.role ?= \"admin\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "deleteRule": "@collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.role ?= \"admin\""
  }, collection)

  return app.save(collection)
})
