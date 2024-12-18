const express = require("express");
const router = express.Router();
const matterManagerController = require("../controllers/matterManagerController");

router.get("/full", matterManagerController.getAllFullOUAssociates);

module.exports = router;
