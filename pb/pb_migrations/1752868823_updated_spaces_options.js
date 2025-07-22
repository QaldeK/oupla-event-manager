/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("nrrz61kk7hwrf00")

  // add field
  collection.fields.addAt(11, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "email1866074113",
    "name": "mailContactSpace",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "email"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("nrrz61kk7hwrf00")

  // remove field
  collection.fields.removeById("email1866074113")

  return app.save(collection)
})
