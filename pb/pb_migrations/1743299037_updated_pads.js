/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3976083202")

  // remove field
  collection.fields.removeById("file4274335913")

  // add field
  collection.fields.addAt(7, new Field({
    "convertURLs": false,
    "hidden": false,
    "id": "editor4274335913",
    "maxSize": 0,
    "name": "content",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "editor"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3976083202")

  // add field
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "file4274335913",
    "maxSelect": 1,
    "maxSize": 0,
    "mimeTypes": [],
    "name": "content",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  // remove field
  collection.fields.removeById("editor4274335913")

  return app.save(collection)
})
