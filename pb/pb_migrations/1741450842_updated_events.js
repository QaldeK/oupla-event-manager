/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // remove field
  collection.fields.removeById("yccgokog")

  // add field
  collection.fields.addAt(43, new Field({
    "hidden": false,
    "id": "json2076651072",
    "maxSize": 0,
    "name": "intervenantProposal",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("y2bmoym46ud46vm")

  // add field
  collection.fields.addAt(18, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "yccgokog",
    "max": 0,
    "min": 0,
    "name": "period_proposed",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("json2076651072")

  return app.save(collection)
})
