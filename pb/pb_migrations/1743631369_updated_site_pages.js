/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_446563808")

  // remove field
  collection.fields.removeById("json1874629670")

  // add field
  collection.fields.addAt(10, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1874629670",
    "max": 0,
    "min": 0,
    "name": "tags",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_446563808")

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "json1874629670",
    "maxSize": 0,
    "name": "tags",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // remove field
  collection.fields.removeById("text1874629670")

  return app.save(collection)
})
