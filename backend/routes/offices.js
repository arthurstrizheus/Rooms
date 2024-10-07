const express = require("express");
const router = express.Router();
const officeController = require("../controllers/officeController");

router.get("/", officeController.GetAll);
router.put("/:id", officeController.Update);
router.post("/", officeController.Post);
router.delete("/:id", officeController.Delete);

module.exports = router;
