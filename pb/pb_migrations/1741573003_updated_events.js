/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // update field
  collection.fields.addAt(18, new Field({
    "hidden": false,
    "id": "json2076651072",
    "maxSize": 0,
    "name": "external_proposal",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // update field
  collection.fields.addAt(18, new Field({
    "hidden": false,
    "id": "json2076651072",
    "maxSize": 0,
    "name": "dates_proposed_external",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
})
