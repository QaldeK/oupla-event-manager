/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // remove field
  collection.fields.removeById("enve4zuz")

  // add field
  collection.fields.addAt(33, new Field({
    "cascadeDelete": true,
    "collectionId": "y2bmoym46ud46vm",
    "hidden": false,
    "id": "relation423292442",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "masterRecurrentId",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // add field
  collection.fields.addAt(34, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "enve4zuz",
    "max": 0,
    "min": 0,
    "name": "masterRecurrentId",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("relation423292442")

  return app.save(collection)
})
