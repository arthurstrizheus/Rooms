import { useEffect, useRef, useState } from "react";

/**
 * Rage-click detection — "this person is hammering something that isn't working".
 *
 * The heuristic is the standard one (Hotjar/FullStory shape it the same way) and
 * all three parts matter:
 *
 *   1. COUNT   — `clicks` presses...
 *   2. TIME    — ...inside a rolling `windowMs`...
 *   3. PLACE   — ...that all land within `radius` px of the first one.
 *
 * The place test is what keeps this from firing on ordinary fast work. Picking
 * six rooms down a list, or clicking through six days of the calendar, moves the
 * pointer; a broken button does not. Any press outside the radius restarts the
 * buffer at that press, so a burst is always measured from its own first click.
 *
 * Bound on `pointerdown` in the CAPTURE phase and on `window`, deliberately:
 * a handler that calls `stopPropagation()` (FullCalendar's drag layer does) can
 * never hide a press from us, and `pointerdown` fires before any of the app's
 * own `click` work, so the burst is seen even when the thing being clicked is
 * busy or throwing.
 *
 * Passive listener, no state, no re-render: nothing here costs anything until a
 * burst actually completes.
 */
const useRageClick = ({
    onRage,
    enabled = true,
    clicks = 6,
    windowMs = 2000,
    radius = 48,
} = {}) => {
    // The callback is read through a ref so a caller can pass an inline arrow
    // without re-binding the listener on every render.
    const onRageRef = useRef(onRage);
    useEffect(() => {
        onRageRef.current = onRage;
    }, [onRage]);

    useEffect(() => {
        if (!enabled) return undefined;

        // Presses in the current burst: [{ x, y, t }], oldest first.
        let burst = [];

        const handlePointerDown = (event) => {
            // Primary button only. A right-click opening a context menu, or a
            // middle-click paste, is not someone fighting the UI.
            if (event.button !== 0) return;
            // Clippy's own surfaces are exempt — clicking "yes please" six times
            // must not count as rage at the thing offering to help.
            if (event.target?.closest?.("[data-clippy]")) return;

            const now = Date.now();
            const press = { x: event.clientX, y: event.clientY, t: now };

            // Drop anything that has aged out of the window.
            burst = burst.filter((p) => now - p.t <= windowMs);

            // A press away from where the burst started is a new intention, not
            // a continuation of the old one.
            const origin = burst[0];
            if (
                origin &&
                Math.hypot(press.x - origin.x, press.y - origin.y) > radius
            ) {
                burst = [];
            }

            burst.push(press);

            if (burst.length >= clicks) {
                const count = burst.length;
                // Cleared before the callback: whatever the caller does next
                // (open a dialog, unmount, disable the hook) must not be able to
                // leave a primed buffer behind that fires again on one more press.
                burst = [];
                onRageRef.current?.({ clicks: count, x: press.x, y: press.y });
            }
        };

        window.addEventListener("pointerdown", handlePointerDown, {
            capture: true,
            passive: true,
        });
        return () =>
            window.removeEventListener("pointerdown", handlePointerDown, {
                capture: true,
            });
    }, [enabled, clicks, windowMs, radius]);
};

/**
 * A running click total, for while Clippy is on screen.
 *
 * The burst that summoned him is only the opening argument — people keep
 * clicking after he shows up, and that continued total is the single most useful
 * number on the ticket ("I clicked it 41 times"). Seeded with the burst count so
 * the tally reads as one continuous number rather than restarting at zero, and
 * it keeps climbing live: the badge Clippy is wearing changes underneath it.
 *
 * `episode` is the reset key. `initial` alone is not enough — two rage bursts of
 * exactly the same size in a row would leave every dependency unchanged and the
 * counter would carry on from where the last episode ended. The caller bumps
 * `episode` once per episode, which is the only thing guaranteed to differ.
 *
 * Re-renders on every press, which is exactly why `enabled` exists: it is only
 * ever true for the few seconds Clippy is visible.
 */
export const useClickTally = (enabled, initial = 0, episode = 0) => {
    const [count, setCount] = useState(initial);

    // `initial` is intentionally read but not depended on: re-seeding is an
    // episode-level event, and `episode` already changes exactly then.
    const initialRef = useRef(initial);
    initialRef.current = initial;

    useEffect(() => {
        if (enabled) setCount(initialRef.current);
    }, [enabled, episode]);

    useEffect(() => {
        if (!enabled) return undefined;

        const handlePointerDown = (event) => {
            if (event.button !== 0) return;
            // Clicking Clippy's own buttons is not part of the complaint.
            if (event.target?.closest?.("[data-clippy]")) return;
            setCount((n) => n + 1);
        };

        window.addEventListener("pointerdown", handlePointerDown, {
            capture: true,
            passive: true,
        });
        return () =>
            window.removeEventListener("pointerdown", handlePointerDown, {
                capture: true,
            });
    }, [enabled]);

    return count;
};

export default useRageClick;
