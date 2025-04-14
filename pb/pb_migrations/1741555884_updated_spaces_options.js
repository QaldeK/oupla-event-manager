/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("nrrz61kk7hwrf00")

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "bool303975221",
    "name": "public_site",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("nrrz61kk7hwrf00")

  // remove field
  collection.fields.removeById("bool303975221")

  return app.save(collection)
})
