const express = require("express");
const router = express.Router();
const assetTaxMetaController = require("../controllers/assetTaxMetaController");

// Asset tax meta routes
router.get("/:assetId", assetTaxMetaController.GetByAssetId);
router.post("/:assetId", assetTaxMetaController.Upsert);
router.put("/:assetId", assetTaxMetaController.Upsert);
router.delete("/:assetId", assetTaxMetaController.Delete);

module.exports = router;
