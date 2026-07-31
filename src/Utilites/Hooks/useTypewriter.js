import { useEffect, useState } from "react";

/**
 * Types a string out one character at a time, with pauses for effect.
 *
 * Two sources of pause:
 *
 *   1. PUNCTUATION, automatically. A comma buys a short beat, a full stop a
 *      longer one, an ellipsis longer still. This is most of the timing and it
 *      needs no markup — ordinary prose reads correctly by default.
 *
 *   2. THE `|` MARKER, for a deliberate beat where the punctuation gives none.
 *      It is never rendered; it costs one tick of pure silence. `|` was chosen
 *      because it cannot occur in the copy by accident.
 *
 * REDUCED MOTION IS CHECKED HERE, IN JS, and that is not a violation of the rule
 * against per-component reduced-motion blocks (ARBITER §8/§15). That rule is
 * about CSS, where `concourseGlobalStyles` already collapses every animation
 * app-wide. A `setTimeout` chain is invisible to CSS, so if this hook did not
 * ask, a user who has asked for less motion would still get text crawling out a
 * character at a time — and, worse, would be unable to read the whole sentence
 * until it finished.
 *
 * Returns `{ shown, done }`. `done` is what a caller uses to know it may move on
 * to the next line.
 */

const PAUSE_MARKER = "|";

/** Extra milliseconds bought by the character just emitted. */
const TRAILING_PAUSE = {
    ",": 170,
    ";": 200,
    ":": 200,
    "—": 220,
    ".": 330,
    "!": 330,
    "?": 360,
    "…": 520,
};

/** What a bare `|` costs. */
const MARKER_PAUSE = 460;

/** The beat before he starts talking at all. */
const LEAD_IN = 140;

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The string as the reader will see it, markers removed. */
export const stripPauseMarkers = (text) =>
    String(text || "").split(PAUSE_MARKER).join("");

const useTypewriter = (text, { charMs = 26, enabled = true } = {}) => {
    const [shown, setShown] = useState("");
    const [done, setDone] = useState(false);

    useEffect(() => {
        const full = stripPauseMarkers(text);

        if (!enabled || !text || prefersReducedMotion()) {
            setShown(full);
            setDone(true);
            return undefined;
        }

        // Array.from, not split(""), so an emoji or an accented character is one
        // step rather than a pair of broken halves.
        const chars = Array.from(String(text));
        let index = 0;
        let out = "";
        let timer;

        const step = () => {
            if (index >= chars.length) {
                setDone(true);
                return;
            }
            const ch = chars[index++];
            let delay = charMs;
            if (ch === PAUSE_MARKER) {
                // Pure silence — nothing is rendered for this tick.
                delay = MARKER_PAUSE;
            } else {
                out += ch;
                setShown(out);
                delay += TRAILING_PAUSE[ch] || 0;
            }
            timer = setTimeout(step, delay);
        };

        setShown("");
        setDone(false);
        timer = setTimeout(step, LEAD_IN);
        return () => clearTimeout(timer);
    }, [text, charMs, enabled]);

    return { shown, done };
};

export default useTypewriter;
