/**
 * ClippyBubble — the thing that slides into the corner and offers help.
 *
 * Portals to `document.body` and sits at z-index 1350: ABOVE MUI's modal layer
 * (1300) and below its snackbar (1400). That ordering is deliberate and is the
 * whole reason for the portal — the most likely place to rage-click in this app
 * is inside the booking dialog, and an assistant that appears underneath the
 * dialog backdrop would be useless exactly when it is needed. Sitting above the
 * backdrop means the buttons are clickable while a dialog is open.
 *
 * (MUI's focus trap will still pull keyboard focus back into an open dialog.
 * Pointer clicks land regardless, and the caller hides this panel entirely once
 * the support form opens, so the two are never on screen together.)
 *
 * THE COUNTER IS LIVE. `clicks` keeps rising while the panel is up, and Clippy's
 * finish changes with it — every time the count crosses a badge threshold he
 * visibly re-skins, mid-tantrum. `data-clippy` on the root is what makes that
 * honest: both `useRageClick` and `useClickTally` skip presses inside it, so
 * clicking Clippy's own buttons is never counted as rage at Clippy.
 */

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Box } from "@mui/material";
import { cc, sp, CcButton, HOVER, focusRing } from "../Concourse/ConcourseDialogKit";
import useTypewriter from "../../../Utilites/Hooks/useTypewriter";
import ClippyFigure from "./ClippyFigure";
import { BUBBLE, openerLine, openerTierKey } from "./clippyCopy";
import { DEFAULT_ART, badgeFor } from "./clippyBadges";

/** How long a finished line is left on screen before the next one types. */
const DWELL_MS = 2600;

const ClippyBubble = ({ clicks, onAccept, onDismiss }) => {
    const badge = badgeFor(clicks);
    const tierKey = openerTierKey(clicks);

    // `clicks` is read when a line STARTS and then held for its duration. Going
    // through a ref is what keeps it out of the effect's dependencies: depending
    // on it directly would re-resolve the text on every press and restart the
    // typing before a single sentence ever finished.
    const clicksRef = useRef(clicks);
    clicksRef.current = clicks;

    const [lineIndex, setLineIndex] = useState(0);
    const [text, setText] = useState("");

    // Crossing a tier interrupts the monologue and starts the new tier's.
    useEffect(() => {
        setLineIndex(0);
    }, [tierKey]);

    useEffect(() => {
        setText(openerLine(clicksRef.current, lineIndex));
    }, [tierKey, lineIndex]);

    const { shown, done } = useTypewriter(text);

    // Hold the finished line, then move to the next one.
    useEffect(() => {
        if (!done) return undefined;
        const timer = setTimeout(() => setLineIndex((i) => i + 1), DWELL_MS);
        return () => clearTimeout(timer);
    }, [done, lineIndex, tierKey]);

    if (typeof document === "undefined") return null;

    return createPortal(
        <Box
            data-clippy="bubble"
            role="dialog"
            // Non-modal on purpose: it interrupts to OFFER, it does not seize
            // the page. Nothing here takes focus either — the user is already
            // mid-fight with something and having the caret yanked away is how
            // the original Clippy earned its reputation. `aria-live` is what
            // gets it announced instead.
            aria-modal="false"
            aria-live="polite"
            aria-label={BUBBLE.ariaLabel}
            sx={{
                position: "fixed",
                right: "22px",
                bottom: "22px",
                zIndex: 1350,
                width: "min(370px, calc(100vw - 32px))",
                display: "flex",
                alignItems: "flex-end",
                gap: "6px",
                fontFamily: cc.sans,
                color: cc.ink,
                animation: `clippy-panel-in 420ms ${sp} backwards`,
                "@keyframes clippy-panel-in": {
                    from: { opacity: 0, transform: "translateY(24px) scale(.94)" },
                    to: { opacity: 1, transform: "none" },
                },
            }}
        >
            {/* Keyed on the badge so a tier change REMOUNTS the figure and
                replays its arrival animation — that pop is what makes the
                re-skin noticeable instead of a silent colour swap. */}
            <ClippyFigure
                key={badge?.key || "none"}
                size={64}
                art={badge?.art || DEFAULT_ART}
            />

            <Box
                sx={{
                    position: "relative",
                    flex: 1,
                    minWidth: 0,
                    background: cc.srf,
                    border: `1px solid ${cc.line}`,
                    borderRadius: "22px",
                    boxShadow: cc.sh2,
                    padding: "14px 16px 13px",
                    marginBottom: "10px",
                    // The speech tail. Two triangles — border, then fill — so it
                    // keeps the hairline the bubble has on every other edge.
                    "&::before, &::after": {
                        content: '""',
                        position: "absolute",
                        left: "-9px",
                        bottom: "16px",
                        width: 0,
                        height: 0,
                        borderTop: "8px solid transparent",
                        borderBottom: "8px solid transparent",
                        borderRight: `9px solid ${cc.line}`,
                    },
                    "&::after": {
                        left: "-7.5px",
                        borderRightColor: cc.srf,
                    },
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "6px",
                    }}
                >
                    <Box
                        sx={{
                            fontSize: "13px",
                            fontWeight: 700,
                            letterSpacing: "-.014em",
                        }}
                    >
                        {BUBBLE.name}
                    </Box>

                    {/* The live tally. Keyed on `clicks` so each increment
                        replays the tick — the number visibly reacts rather than
                        quietly changing. */}
                    <Box
                        key={clicks}
                        sx={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: "4px",
                            background: cc.wash,
                            color: cc.red,
                            borderRadius: "99px",
                            padding: "2px 9px",
                            fontVariantNumeric: "tabular-nums",
                            animation: `clippy-tick 260ms ${sp}`,
                            "@keyframes clippy-tick": {
                                from: { transform: "scale(1.28)" },
                                to: { transform: "none" },
                            },
                        }}
                    >
                        <Box component="span" sx={{ fontSize: "13px", fontWeight: 750 }}>
                            {clicks}
                        </Box>
                        <Box component="span" sx={{ fontSize: "9.5px", fontWeight: 650 }}>
                            clicks
                        </Box>
                    </Box>

                    <Box
                        component="button"
                        type="button"
                        onClick={onDismiss}
                        aria-label={BUBBLE.dismiss}
                        sx={{
                            marginLeft: "auto",
                            flex: "none",
                            width: "22px",
                            height: "22px",
                            display: "grid",
                            placeItems: "center",
                            padding: 0,
                            border: 0,
                            borderRadius: "99px",
                            background: "transparent",
                            color: cc.mute,
                            fontFamily: "inherit",
                            fontSize: "13px",
                            lineHeight: 1,
                            cursor: "pointer",
                            transition: `transform 300ms ${sp}, color 200ms, background 200ms`,
                            [HOVER]: {
                                "&:hover": {
                                    background: cc.wash,
                                    color: cc.red,
                                    transform: "rotate(90deg)",
                                },
                            },
                            "&:focus-visible": focusRing,
                        }}
                    >
                        ✕
                    </Box>
                </Box>

                {/* `min-height` holds three lines' worth of room so the buttons
                    below do not walk up and down the screen as each sentence
                    types itself out — a moving target is the last thing someone
                    already fighting the UI needs. */}
                <Box
                    sx={{
                        fontSize: "13.5px",
                        lineHeight: 1.45,
                        minHeight: "3.3em",
                    }}
                >
                    {shown}
                    {/* The caret, while he is still talking. */}
                    {done ? null : (
                        <Box
                            component="span"
                            aria-hidden="true"
                            sx={{
                                display: "inline-block",
                                width: "2px",
                                height: "1em",
                                marginLeft: "1px",
                                verticalAlign: "-0.14em",
                                background: cc.red,
                                animation: "clippy-caret 900ms steps(1,end) infinite",
                                "@keyframes clippy-caret": {
                                    "0%, 49%": { opacity: 1 },
                                    "50%, 100%": { opacity: 0 },
                                },
                            }}
                        />
                    )}
                </Box>

                {/* The badge currently being earned. The NEXT one is deliberately
                    not named or counted down to: this is an easter egg, not a
                    progress bar, and telling someone they are nine clicks off
                    the next tier turns a joke into a chore. */}
                {badge ? (
                    <Box
                        sx={{
                            marginTop: "9px",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            color: cc.ink,
                        }}
                    >
                        {badge.name}
                    </Box>
                ) : null}

                <Box
                    sx={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        marginTop: "12px",
                    }}
                >
                    <CcButton variant="primary" onClick={onAccept}>
                        {BUBBLE.accept}
                    </CcButton>
                    <CcButton onClick={onDismiss}>{BUBBLE.dismiss}</CcButton>
                </Box>
            </Box>
        </Box>,
        document.body
    );
};

export default ClippyBubble;
