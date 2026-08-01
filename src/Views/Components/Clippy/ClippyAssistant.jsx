/**
 * ClippyAssistant — the whole easter egg, in one small state machine.
 *
 *   idle ──rage burst──► offering ──"yes"──► form ──sent/cancel──► idle
 *     ▲                     │
 *     └──"no" / 22s quiet───┘
 *
 * Mount once, near the root, inside SnackbarProvider (the API layer raises a
 * snackbar) and only while authenticated.
 *
 * THE ONLY GUARD IS `phase`. Clippy comes back every single time someone rage-
 * clicks, unless he is already on screen — no snooze, no once-per-session,
 * nothing remembered between episodes. An earlier version snoozed him for ten
 * minutes after a dismissal, which meant "no thanks" read as "never again"; that
 * was wrong, and it is the reason the guard is now this small.
 *
 * The 22-second timer is NOT a snooze. It is reset by every click (`clicks` is
 * in its dependency list), so it only fires after the user has actually gone
 * quiet — and even then the very next burst brings him straight back.
 */

import React, { useCallback, useEffect, useState } from "react";
import useRageClick, { useClickTally } from "../../../Utilites/Hooks/useRageClick";
import ClippyBubble from "./ClippyBubble";
import ClippySupportDialog from "./ClippySupportDialog";

/** How long the bubble waits, AFTER the last click, before showing itself out. */
const QUIET_BEFORE_LEAVING_MS = 22000;

const ClippyAssistant = ({ user }) => {
    const [phase, setPhase] = useState("idle"); // idle | offering | form
    const [burstClicks, setBurstClicks] = useState(0);
    // Bumped on every episode so the tally re-seeds even when two bursts happen
    // to be the same size. Without it, rage-clicking exactly six times twice in
    // a row would leave the counter where the first episode ended.
    const [episode, setEpisode] = useState(0);

    /**
     * The tally runs while the BUBBLE is up and stops the moment the form opens.
     *
     * The bubble is non-modal, so a user can carry on fighting the page
     * underneath it, and that continued clicking is exactly what the counter is
     * for. The support dialog is modal: its backdrop swallows everything behind
     * it, so from then on every press is either the user filling in the form or
     * the backdrop — none of it is rage at the app. Counting it made picking an
     * option from a dropdown push the number up, which is both wrong and, since
     * MUI menus portal outside the dialog, not fixable by tagging the form.
     *
     * The number therefore freezes at whatever it was when they asked for help:
     * the count of the tantrum, not of the paperwork.
     */
    const clicks = useClickTally(phase === "offering", burstClicks, episode);

    const handleRage = useCallback(({ clicks: burst }) => {
        setBurstClicks(burst);
        setEpisode((n) => n + 1);
        setPhase("offering");
    }, []);

    // Armed only while idle — which IS the "unless he is already up" rule. A
    // burst landing on the bubble's own buttons, or while the form is open,
    // cannot restart the sequence and reset the count.
    useRageClick({ onRage: handleRage, enabled: phase === "idle" });

    const close = useCallback(() => setPhase("idle"), []);

    // An ignored offer expires — but the clock restarts on every click, so it
    // only runs out once the user has stopped. A form they are typing into is
    // never taken away from them, so this watches `offering` alone.
    useEffect(() => {
        if (phase !== "offering") return undefined;
        const timer = setTimeout(close, QUIET_BEFORE_LEAVING_MS);
        return () => clearTimeout(timer);
    }, [phase, clicks, close]);

    return (
        <>
            {phase === "offering" && (
                <ClippyBubble
                    clicks={clicks}
                    onAccept={() => setPhase("form")}
                    onDismiss={close}
                />
            )}
            <ClippySupportDialog
                open={phase === "form"}
                clicks={clicks}
                user={user}
                onClose={close}
                onSent={close}
            />
        </>
    );
};

export default ClippyAssistant;
