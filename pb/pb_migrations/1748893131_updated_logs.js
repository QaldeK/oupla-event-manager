/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3615662572")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_logs_collection_target_record` ON `logs` (\n  `collection_target`,\n  `record_target_id`\n)",
      "CREATE INDEX `idx_logs_users_concerned` ON `logs` (`users_concerned`)",
      "CREATE INDEX `idx_ZylfnSPKvo` ON `logs` (\n  `space`,\n  `user_actor_id`,\n  `created`\n)",
      "CREATE INDEX `idx_5j5yaJnCN0` ON `logs` (\n  `space`,\n  `users_concerned`,\n  `created`\n)",
      "CREATE INDEX `idx_YXOl6DFmd4` ON `logs` (\n  `space`,\n  `action`,\n  `created`\n)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3615662572")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_logs_action` ON `logs` (`action`)",
      "CREATE INDEX `idx_logs_space` ON `logs` (`space`)",
      "CREATE INDEX `idx_user_actor` ON `logs` (`user_actor_id`)",
      "CREATE INDEX `idx_logs_collection_target_record` ON `logs` (\n  `collection_target`,\n  `record_target_id`\n)",
      "CREATE INDEX `idx_logs_created` ON `logs` (`created`)",
      "CREATE INDEX `idx_logs_users_concerned` ON `logs` (`users_concerned`)"
    ]
  }, collection)

  return app.save(collection)
})
