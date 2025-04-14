/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // update field
  collection.fields.addAt(38, new Field({
    "hidden": false,
    "id": "json3057528519",
    "maxSize": 0,
    "name": "tasks",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // update field
  collection.fields.addAt(38, new Field({
    "hidden": false,
    "id": "json3057528519",
    "maxSize": 0,
    "name": "roles",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
})
