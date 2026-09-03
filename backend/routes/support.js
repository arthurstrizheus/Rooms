const express = require("express");
const router = express.Router();
const { GetStatus, CreateTicket } = require("../controllers/supportController");

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Both routes sit behind the global auth middleware. Nothing here is public:
// a ticket is filed as the signed-in user, so an anonymous caller has no
// identity to file it under.
router.get("/status", asyncHandler(GetStatus));
router.post("/ticket", asyncHandler(CreateTicket));

module.exports = router;
