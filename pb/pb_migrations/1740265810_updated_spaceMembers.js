/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("8xwnoxb0ap9cwzh")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_G1oustgqBS` ON `spaceMembers` (`space`)",
      "CREATE INDEX `idx_LalmB88E1f` ON `spaceMembers` (`user`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("8xwnoxb0ap9cwzh")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
