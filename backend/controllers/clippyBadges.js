const { ClippyBadge } = require("../models");
const { logErrorToFile } = require("../functions/logErrorToFile.js");

/**
 * The Clippy badge catalogue.
 *
 * ⚠ MIRRORED ON THE FRONTEND at `src/Views/Components/Clippy/clippyBadges.js`.
 * Both copies must move together. The duplication is deliberate and cannot be
 * removed: the frontend has to pick a Clippy variant live, as the click count
 * rises with no server round-trip, and the server can never take the client's
 * word for which badge was earned. Two deciders, two copies. THIS one is
 * authoritative for what actually gets awarded.
 *
 * A user earns EVERY tier at or below their click count, not just the one they
 * landed in. Reaching 26 clicks hands over Standard Issue, Bronze and Gold
 * together. (An earlier version awarded only the single band reached, which
 * meant a big tantrum skipped the small badges and left permanent holes in the
 * collection that could only be filled by deliberately having a *smaller*
 * tantrum later — backwards, and the reason it works this way now.)
 *
 * `art` is used by `clippyBadgeSvg.js` to draw the badge attached to a support
 * ticket. It matches the client's art EXCEPT that the two token-valued colours
 * are resolved to their light-scheme hex — `cc.mute` -> #7C6E73 and `cc.red` ->
 * #C8102E — because an email has no `--cc-*` custom properties to read.
 */
const TIERS = [
    {
        key: "standard",
        at: 6,
        name: "Standard Issue",
        flavour: "Six clicks and a dream.",
        art: {
            wire: "#7C6E73",
            accent: "#7C6E73",
            accessory: "none",
            mood: "concerned",
            shape: "plain",
            eyes: "normal",
        },
    },
    {
        key: "bronze",
        at: 12,
        name: "Bronze Clip",
        flavour: "A dozen clicks. The button remains unmoved.",
        art: {
            wire: "#B0764A",
            accent: "#5B9DD9",
            accessory: "sweat",
            mood: "concerned",
            shape: "lean",
            eyes: "normal",
        },
    },
    {
        key: "gold",
        at: 20,
        name: "Gold Clip",
        flavour: "Twenty clicks. Somebody get this person a coffee.",
        art: {
            wire: "#D9A521",
            accent: "#D9A521",
            accessory: "crown",
            mood: "cheerful",
            shape: "tall",
            eyes: "normal",
        },
    },
    {
        key: "rainbow",
        at: 32,
        name: "Rainbow Clip",
        flavour: "Thirty-two clicks. This is now a hobby.",
        art: {
            wire: "rainbow",
            accent: "#8E5BD9",
            accessory: "sparkles",
            mood: "cheerful",
            shape: "wavy",
            eyes: "normal",
        },
    },
    {
        key: "void",
        at: 50,
        name: "Void Clip",
        flavour:
            "Fifty clicks. Clippy has stopped taking notes and started taking sides.",
        art: {
            wire: "#C8102E",
            accent: "#C8102E",
            accessory: "spiral",
            mood: "furious",
            shape: "spiral",
            eyes: "spiral",
        },
    },
    {
        key: "bandaged",
        at: 75,
        name: "Field Repair",
        flavour: "Seventy-five. We've had to tape the mouse back together.",
        art: {
            wire: "#8A9BA8",
            accent: "#F0E2CE",
            accessory: "bandage",
            mood: "concerned",
            shape: "kinked",
            eyes: "wink",
        },
    },
    {
        key: "shades",
        at: 110,
        name: "Unbothered",
        flavour:
            "A hundred and ten clicks, and an expression of total calm. Nobody is fooled.",
        art: {
            wire: "#3A4550",
            accent: "#1D242B",
            accessory: "shades",
            mood: "cheerful",
            shape: "recline",
            eyes: "normal",
        },
    },
    {
        key: "dizzy",
        at: 160,
        name: "Seeing Stars",
        flavour: "A hundred and sixty. The room is spinning, slightly.",
        art: {
            wire: "#6A8FBF",
            accent: "#E0B62E",
            accessory: "stars",
            mood: "furious",
            shape: "squat",
            eyes: "cross",
        },
    },
    {
        key: "bolt",
        at: 250,
        name: "Overclocked",
        flavour: "Two hundred and fifty clicks. Your mouse has filed its own ticket.",
        art: {
            wire: "#3B7FD4",
            accent: "#F2C230",
            accessory: "bolt",
            mood: "furious",
            shape: "zigzag",
            eyes: "wide",
        },
    },
    {
        key: "ember",
        at: 400,
        name: "Combustion",
        flavour: "Four hundred. Something is smoking and we think it's the desk.",
        art: {
            wire: "#E0562E",
            accent: "#F2A03D",
            accessory: "flames",
            mood: "furious",
            shape: "melting",
            eyes: "normal",
        },
    },
    {
        key: "glitch",
        at: 650,
        name: "Kernel Panic",
        flavour: "Six hundred and fifty. Clippy has begun to flicker.",
        art: {
            wire: "#35D6A0",
            accent: "#FF4FD8",
            accessory: "glitch",
            mood: "furious",
            shape: "broken",
            eyes: "offset",
        },
    },
    {
        key: "ascended",
        at: 1000,
        name: "Ascended",
        flavour:
            "One thousand clicks. You have transcended the software. It still doesn't work.",
        art: {
            wire: "#E4D9A6",
            accent: "#F5E27A",
            accessory: "halo",
            mood: "cheerful",
            shape: "unfurled",
            eyes: "serene",
        },
    },
];

/** The highest tier a click count reaches, or null below the lowest threshold. */
const tierFor = (clicks) => {
    let found = null;
    for (const tier of TIERS) {
        if (clicks >= tier.at) found = tier;
    }
    return found;
};

/** Every tier a click count reaches, lowest first. */
const tiersFor = (clicks) => TIERS.filter((tier) => clicks >= tier.at);

/**
 * Records every badge earned by `clicks`.
 *
 * Never throws and never blocks the caller's real work: a support ticket must
 * reach IT whether or not the joke achievements saved.
 *
 * Returns:
 *   `top`    — the highest tier reached, the one the ticket is headlined with
 *   `all`    — every tier reached, lowest first
 *   `newly`  — the subset written just now (empty if they were all already held)
 *   `status` — "ok" | "failed" | "none"
 *
 * "FAILED" MUST STAY DISTINGUISHABLE FROM "ALREADY HELD". An earlier version
 * collapsed the two into a bare `null`, so a ticket sent while the write was
 * broken told IT the badge was "already held" — simply untrue. A caller that
 * cannot tell a failure from a no-op will eventually report one as the other.
 *
 * Deliberately NOT `findOrCreate`: that wraps its insert in a transaction, and
 * when the insert fails MSSQL aborts the transaction, so what surfaces is a
 * misleading "COMMIT TRANSACTION request has no corresponding BEGIN TRANSACTION"
 * instead of the real cause. Find-then-create reports the real error, and the
 * unique index on (user_id, badge_key) still makes the race safe — a concurrent
 * insert loses with a unique-constraint violation, which is just "already held".
 */
const awardBadgesForClicks = async (userId, clicks) => {
    const all = tiersFor(clicks);
    const top = all.length ? all[all.length - 1] : null;
    if (!userId || !top) return { top: null, all: [], newly: [], status: "none" };

    try {
        const held = await ClippyBadge.findAll({
            where: { user_id: userId, badge_key: all.map((t) => t.key) },
        });
        const heldByKey = new Map(held.map((row) => [row.badge_key, row]));
        const newly = [];

        for (const tier of all) {
            const existing = heldByKey.get(tier.key);
            if (existing) {
                // Keep the personal best rather than the latest, so the number
                // on the badge is the user's proudest tantrum.
                if (clicks > (existing.clicks || 0)) {
                    await existing.update({ clicks });
                }
                continue;
            }
            try {
                await ClippyBadge.create({
                    user_id: userId,
                    badge_key: tier.key,
                    clicks,
                });
                newly.push(tier);
            } catch (error) {
                // Lost the race to a simultaneous request: the row exists now,
                // which is "already held", not a failure and not newly earned.
                if (error?.name !== "SequelizeUniqueConstraintError") throw error;
            }
        }

        return { top, all, newly, status: "ok" };
    } catch (error) {
        logErrorToFile(error);
        console.error("Failed to award Clippy badges:", error);
        return { top, all, newly: [], status: "failed" };
    }
};

/**
 * GET /api/support/badges — the signed-in user's collection.
 *
 * Returns the whole catalogue alongside what has been earned, so the client can
 * render locked slots without holding its own copy of the thresholds... except
 * for the live variant switching, which is why the mirror above exists anyway.
 */
const GetMyBadges = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "Not signed in." });
        }

        const rows = await ClippyBadge.findAll({
            where: { user_id: req.user.id },
        });
        const byKey = new Map(rows.map((r) => [r.badge_key, r]));

        return res.status(200).json({
            catalog: TIERS.map((tier) => {
                const earned = byKey.get(tier.key);
                return {
                    ...tier,
                    earned: !!earned,
                    clicks: earned?.clicks ?? null,
                    earnedAt: earned?.createdAt ?? null,
                };
            }),
        });
    } catch (error) {
        logErrorToFile(error);
        console.error("Failed to read Clippy badges:", error);
        // An empty catalogue would render as "you have nothing", which is a
        // different and wrong claim. Say the read failed instead.
        return res.status(500).json({ message: "Couldn't load your badges." });
    }
};

module.exports = { TIERS, tierFor, tiersFor, awardBadgesForClicks, GetMyBadges };
