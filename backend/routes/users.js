const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.get("/", userController.GetAll);
router.get("/:id", asyncHandler(userController.GetById));
router.post("/", userController.Post);
router.put("/:id", userController.Update);
router.put("/details/:id", userController.UpdateDetails);
router.put("/password/:id", userController.UpdatePassword);
router.delete("/:id", userController.Delete);
router.post("/login", userController.Authenticate);
router.post("/loginAd", userController.AuthenticateAD);
router.post("/adhasuser", userController.userExistsInAd);
router.put("/activate/:id", userController.Activate);
router.put("/deactivate/:id", userController.Deactivate);

module.exports = router;
