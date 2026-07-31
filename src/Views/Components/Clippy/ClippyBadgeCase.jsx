/**
 * ClippyBadgeCase — the trophy cabinet, rendered on My Account.
 *
 * The catalogue comes from the SERVER (`GET /api/support/badges`) so the list of
 * what exists, and what has been earned, has one authority. The local
 * `clippyBadges` module is consulted only for how each key is DRAWN — art is
 * client-only and has no server counterpart.
 *
 * A key that the server knows and this client does not falls back to the default
 * finish rather than rendering nothing: a badge someone has actually earned must
 * never silently vanish because the two lists drifted.
 *
 * THE CARD ONLY EXISTS ONCE SOMETHING HAS BEEN EARNED, and it only ever shows
 * badges the user actually holds. No empty state, no error state, no locked
 * silhouettes, no "3 of 12" — a user who has never met Clippy sees an account
 * page with nothing unusual on it, which is the whole point of an easter egg,
 * and a user who has met him sees a shelf of things they earned rather than a
 * checklist of things they have not. It is also why a failed read renders
 * nothing rather than an error: an error card would announce the feature to
 * exactly the people who have not found it.
 */

import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { bp, type as ccType } from "../../../Utilites/concourse";
import { cc } from "../Concourse/ConcourseDialogKit";
import ClippyFigure from "./ClippyFigure";
import { DEFAULT_ART, badgeByKey } from "./clippyBadges";
import { GetClippyBadges } from "../../../Utilites/Functions/ApiFunctions/SupportFunctions";

const cardSx = {
    width: "100%",
    maxWidth: "720px",
    margin: "16px auto 0",
    background: cc.srf,
    borderRadius: "26px",
    boxShadow: cc.sh2,
    overflow: "hidden",
    boxSizing: "border-box",
    flexShrink: 0,
    animation: "cc-rise 500ms var(--cc-sp) 140ms both",
    [`@media (max-width:${bp.sheet}px)`]: { borderRadius: "22px" },
};

const headerSx = {
    padding: "19px 22px 4px",
    display: "grid",
    gap: "4px",
    flexShrink: 0,
    boxSizing: "border-box",
};

const gridSx = {
    padding: "14px 22px 22px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(122px, 1fr))",
    gap: "12px",
    boxSizing: "border-box",
};

const slotSx = {
    display: "grid",
    justifyItems: "center",
    gap: "4px",
    textAlign: "center",
    background: cc.srf2,
    border: `1.5px solid ${cc.line}`,
    borderRadius: "20px",
    padding: "14px 10px 12px",
    minWidth: 0,
    boxSizing: "border-box",
};

const ClippyBadgeCase = () => {
    // null = nothing to show (still loading, read failed, or none earned). All
    // three render the same thing — nothing — so they need no separate states.
    const [catalog, setCatalog] = useState(null);

    useEffect(() => {
        let cancelled = false;
        GetClippyBadges().then((result) => {
            if (cancelled || !result?.some((badge) => badge.earned)) return;
            setCatalog(result);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    if (!catalog) return null;

    // Earned only. The locked tiers are not rendered and their names are not
    // revealed — finding out what is above you is the point of going and
    // getting it.
    const earned = catalog.filter((b) => b.earned);

    return (
        <Box sx={cardSx}>
            <Box sx={headerSx}>
                <Box
                    component="h2"
                    sx={{ ...ccType.dialogTitle, color: cc.ink, margin: 0 }}
                >
                    Clippy Badges
                </Box>
                <Box sx={{ fontSize: "13.5px", color: cc.mute }}>
                    {earned.length === 1
                        ? "One badge. A promising start."
                        : `${earned.length} badges. Each one is a separate incident, which is the concerning part.`}
                </Box>
            </Box>

            <Box sx={gridSx}>
                {earned.map((badge) => (
                    <Box key={badge.key} sx={slotSx}>
                        <ClippyFigure
                            size={44}
                            art={badgeByKey(badge.key)?.art || DEFAULT_ART}
                        />
                        <Box
                            sx={{
                                fontSize: "12.5px",
                                fontWeight: 700,
                                letterSpacing: "-.014em",
                                color: cc.ink,
                            }}
                        >
                            {badge.name}
                        </Box>
                        <Box
                            sx={{
                                fontSize: "10.5px",
                                fontFamily: cc.mono,
                                fontVariantNumeric: "tabular-nums",
                                color: cc.mute,
                            }}
                        >
                            {`best: ${badge.clicks} clicks`}
                        </Box>
                        <Box
                            sx={{
                                fontSize: "11px",
                                color: cc.mute,
                                lineHeight: 1.35,
                            }}
                        >
                            {badge.flavour}
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default ClippyBadgeCase;
