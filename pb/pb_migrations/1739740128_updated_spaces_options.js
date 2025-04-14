/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("nrrz61kk7hwrf00")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id &&  @collection.spaceMembers.role ?= \"admin\"\n",
    "deleteRule": "@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id && @collection.spaceMembers.space ?= space.id && @collection.spaceMembers.role ?= \"admin\"",
    "listRule": "@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id",
    "updateRule": "@request.auth.id != \"\" && @collection.spaceMembers.user.id ?= @request.auth.id && @collection.spaceMembers.space ?= space.id && @collection.spaceMembers.role ?= \"admin\"\n",
    "viewRule": "@request.auth.id != '' && @collection.spaceMembers.user ?= @request.auth.id && @collection.spaceMembers.space ?= space.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("nrrz61kk7hwrf00")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != '' \n",
    "deleteRule": "@request.auth.id != '' ",
    "listRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.id != \"\" && @collection.spaceMembers.user.id ?= @request.auth.id &&  @collection.spaceMembers.role ?= \"admin\"\n",
    "viewRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
})
