/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2605467279")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_event_date` ON `messages` (\n  `event`,\n  `user`\n)",
      "CREATE INDEX `idx_lBVYCXZT8b` ON `messages` (\n  `space`,\n  `event`\n)",
      "CREATE INDEX `idx_hOS2c5TOVP` ON `messages` (`user`)",
      "CREATE INDEX `idx_N00EkGUxIx` ON `messages` (`replyingTo`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2605467279")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_event_date` ON `messages` (\n  `event`,\n  `user`\n)"
    ]
  }, collection)

  return app.save(collection)
})
