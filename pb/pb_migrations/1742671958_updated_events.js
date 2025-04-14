/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // add field
  collection.fields.addAt(44, new Field({
    "hidden": false,
    "id": "bool1132860371",
    "name": "noOrganizerNotificationSent",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(45, new Field({
    "hidden": false,
    "id": "bool3612699270",
    "name": "notConfirmedNotificationSent",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // remove field
  collection.fields.removeById("bool1132860371")

  // remove field
  collection.fields.removeById("bool3612699270")

  return app.save(collection)
})
