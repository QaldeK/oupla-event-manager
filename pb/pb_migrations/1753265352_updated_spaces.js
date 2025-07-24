/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("x9nemirbltqou9s")

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text629030103",
    "max": 35,
    "min": 6,
    "name": "public_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // update field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "xbre26ne",
    "max": 35,
    "min": 3,
    "name": "name",
    "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("x9nemirbltqou9s")

  // remove field
  collection.fields.removeById("text629030103")

  // update field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "xbre26ne",
    "max": 25,
    "min": 3,
    "name": "name",
    "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
})
