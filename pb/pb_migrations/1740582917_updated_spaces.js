/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("x9nemirbltqou9s")

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "json3323650593",
    "maxSize": 0,
    "name": "deleted_records",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("x9nemirbltqou9s")

  // remove field
  collection.fields.removeById("json3323650593")

  return app.save(collection)
})
