/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3434440329")

  // remove field
  collection.fields.removeById("bool2027588219")

  // remove field
  collection.fields.removeById("bool2085137391")

  // remove field
  collection.fields.removeById("text3658200307")

  // remove field
  collection.fields.removeById("text3665647835")

  // remove field
  collection.fields.removeById("json1357457025")

  // remove field
  collection.fields.removeById("json2441432270")

  // remove field
  collection.fields.removeById("url917281265")

  // remove field
  collection.fields.removeById("json630777325")

  // remove field
  collection.fields.removeById("file3309110367")

  // remove field
  collection.fields.removeById("json2090932886")

  // remove field
  collection.fields.removeById("json532148769")

  // remove field
  collection.fields.removeById("json1347970455")

  // remove field
  collection.fields.removeById("relation1629290822")

  // remove field
  collection.fields.removeById("date591627108")

  // remove field
  collection.fields.removeById("date3865544202")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3434440329")

  // add field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "bool2027588219",
    "name": "isSendToNewsletter",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "bool2085137391",
    "name": "isMasterRecurrent",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(14, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3658200307",
    "max": 5,
    "min": 5,
    "name": "time_start",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(15, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3665647835",
    "max": 5,
    "min": 5,
    "name": "time_end",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(18, new Field({
    "hidden": false,
    "id": "json1357457025",
    "maxSize": 0,
    "name": "external_proposal",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(19, new Field({
    "hidden": false,
    "id": "json2441432270",
    "maxSize": 2000000,
    "name": "dates_proposed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(21, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "url917281265",
    "name": "link",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "url"
  }))

  // add field
  collection.fields.addAt(22, new Field({
    "hidden": false,
    "id": "json630777325",
    "maxSize": 2000000,
    "name": "other_date_query",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(30, new Field({
    "hidden": false,
    "id": "file3309110367",
    "maxSelect": 3,
    "maxSize": 5242880,
    "mimeTypes": [
      "image/png",
      "image/webp",
      "image/gif",
      "image/jpeg"
    ],
    "name": "image",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }))

  // add field
  collection.fields.addAt(35, new Field({
    "hidden": false,
    "id": "json2090932886",
    "maxSize": 2000000,
    "name": "rooms",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(37, new Field({
    "hidden": false,
    "id": "json532148769",
    "maxSize": 2000000,
    "name": "recurrence",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(38, new Field({
    "hidden": false,
    "id": "json1347970455",
    "maxSize": 0,
    "name": "tasks",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(39, new Field({
    "cascadeDelete": false,
    "collectionId": "y2bmoym46ud46vm",
    "hidden": false,
    "id": "relation1629290822",
    "maxSelect": 999,
    "minSelect": 0,
    "name": "inConflictWith",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(40, new Field({
    "hidden": false,
    "id": "date591627108",
    "max": "",
    "min": "",
    "name": "dateStart",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(41, new Field({
    "hidden": false,
    "id": "date3865544202",
    "max": "",
    "min": "",
    "name": "dateEnd",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
})
