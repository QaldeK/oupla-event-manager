/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // add field
  collection.fields.addAt(39, new Field({
    "hidden": false,
    "id": "json3243623363",
    "maxSize": 0,
    "name": "proposedBy",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // remove field
  collection.fields.removeById("json3243623363")

  return app.save(collection)
})
