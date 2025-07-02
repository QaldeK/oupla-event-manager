/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_446563808")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_0xgVfyPUos` ON `site_pages` (`space`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_446563808")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
