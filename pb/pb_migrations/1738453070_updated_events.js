/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id != '' && space.spaceMembers_via_space.role = 'admin'"
  }, collection)

  return app.save(collection)
})
