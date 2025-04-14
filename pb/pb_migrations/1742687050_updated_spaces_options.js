/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("nrrz61kk7hwrf00")

  // remove field
  collection.fields.removeById("text3006424384")

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "json1347970455",
    "maxSize": 0,
    "name": "tasks",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("nrrz61kk7hwrf00")

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3006424384",
    "max": 0,
    "min": 0,
    "name": "orgRoles",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("json1347970455")

  return app.save(collection)
})
