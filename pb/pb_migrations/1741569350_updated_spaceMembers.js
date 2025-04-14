/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("8xwnoxb0ap9cwzh")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "eh8mku8c",
    "maxSelect": 1,
    "name": "role",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "admin",
      "helpers",
      "invited",
      "external"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("8xwnoxb0ap9cwzh")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "eh8mku8c",
    "maxSelect": 1,
    "name": "role",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "admin",
      "helpers",
      "invited"
    ]
  }))

  return app.save(collection)
})
