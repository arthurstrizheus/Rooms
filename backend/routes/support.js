const express = require("express");
const router = express.Router();
const SupportController = require("../controllers/supportController");
const ClippyBadges = require("../controllers/clippyBadges");
const { badgePngForKey } = require("../controllers/clippyBadgeArt");

router.post("/clippy", SupportController.PostClippyTicket);

// No :userId in the path on purpose — a badge collection is read for whoever the
// JWT says you are, so there is nothing to tamper with.
router.get("/badges", ClippyBadges.GetMyBadges);

/**
 * The badge artwork, as a PNG. PUBLIC — see the allowlist in middleware/auth.js.
 *
 * It has to be: these URLs are embedded in support-ticket emails, and the thing
 * fetching them is a mail client or Gmail's image proxy, neither of which
 * carries a JWT. That is safe because the response is a picture of a paperclip —
 * twelve of them exist, they are identical for every user, and they contain no
 * personal data of any kind.
 *
 * `:key` is looked up against the fixed badge catalogue and anything unknown
 * 404s, so the path cannot be used to reach anything else.
 */
router.get("/badge/:key.png", (req, res) => {
    const png = badgePngForKey(req.params.key);
    if (!png) return res.status(404).end();
    res.set({
        "Content-Type": "image/png",
        "Content-Length": png.length,
        // The art only changes when the code does, so let every proxy between
        // here and the reader keep it.
        "Cache-Control": "public, max-age=604800, immutable",
    });
    return res.send(png);
});

module.exports = router;
