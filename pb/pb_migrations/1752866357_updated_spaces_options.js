/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("nrrz61kk7hwrf00")

  // add field
  collection.fields.addAt(9, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "email1011714883",
    "name": "newsletterPublic",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "email"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "email3379845033",
    "name": "newsletterMembers",
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
  collection.fields.removeById("email1011714883")

  // remove field
  collection.fields.removeById("email3379845033")

  return app.save(collection)
})
