/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("nrrz61kk7hwrf00")

  // update field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "json2996989855",
    "maxSize": 0,
    "name": "publicSiteTheme",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("nrrz61kk7hwrf00")

  // update field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "json2996989855",
    "maxSize": 0,
    "name": "publicSiteConfig",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
})
