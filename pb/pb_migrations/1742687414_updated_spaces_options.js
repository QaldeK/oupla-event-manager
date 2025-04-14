/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("nrrz61kk7hwrf00")

  // remove field
  collection.fields.removeById("text989021800")

  // remove field
  collection.fields.removeById("text2090932886")

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "json2090932886",
    "maxSize": 0,
    "name": "rooms",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "json989021800",
    "maxSize": 0,
    "name": "categories",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("nrrz61kk7hwrf00")

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text989021800",
    "max": 0,
    "min": 0,
    "name": "categories",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2090932886",
    "max": 0,
    "min": 0,
    "name": "rooms",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("json2090932886")

  // remove field
  collection.fields.removeById("json989021800")

  return app.save(collection)
})
