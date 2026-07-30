import { useCallback, useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { useLocation } from "react-router-dom";
import { motion, type as ccType } from "../../../../Utilites/concourse";
import { btnReset, ChevronDownIcon, ChevronIcon, hover } from "./atoms";
import PickerPanel from "./PickerPanel";
import {
    formatPeriod,
    jumpTarget,
    periodHasToday,
    stepPeriod,
    toDate,
    viewFromPath,
} from "./period";

/**
 * The date switcher — ARBITER §10.7 (the pill), §10.6 (Today), §10.8 (panel).
 *
 * Renders a fragment of three banner-row children so the banner's flex order
 * and the <=700px reflow work per §9:
 *   [ the pill ] [ Today ] [ the picker panel, absolutely positioned ]
 *
 * Every view gets a real way to jump to a date, not just stepping arrows: the
 * title is a disclosure button that opens the per-view picker.
 *
 * `selectedDate` is owned by App.js — we only ever call `setSelectedDate`.
 */

const PANEL_ID = "cc-date-picker-panel";
const MQ_STACK = "@media (max-width:700px)";

const pillSx = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px",
    marginLeft: "auto",
    borderRadius: "99px",
    background: "var(--cc-srf2)",
    boxSizing: "border-box",
    // §9 <=700px: the switcher drops to its own full-width row
    [MQ_STACK]: {
        marginLeft: 0,
        order: 9,
        width: "100%",
        justifyContent: "space-between",
    },
};

const arrowSx = {
    ...btnReset,
    width: "30px",
    height: "30px",
    borderRadius: "99px",
    color: "var(--cc-mute)",
    transition: [
        `background ${motion.dur.colour}ms`,
        `color ${motion.dur.colour}ms`,
        `transform ${motion.dur.arrow}ms ${motion.spring}`,
    ].join(", "),
    ...hover({
        background: "var(--cc-srf)",
        color: "var(--cc-ink)",
        boxShadow: "var(--cc-sh1)",
    }),
    "&:active": { transform: "scale(.88)" },
};

const titleSx = {
    ...btnReset,
    gap: "8px",
    padding: "5px 13px",
    borderRadius: "99px",
    color: "var(--cc-ink)",
    whiteSpace: "nowrap",
    ...ccType.dateTitle,
    transition: `background ${motion.dur.colour}ms, color ${motion.dur.colour}ms`,
    ...hover({ background: "var(--cc-srf)" }),
    '&[aria-expanded="true"]': {
        background: "var(--cc-srf)",
        boxShadow: "var(--cc-sh1)",
    },
    "& .cc-chev": {
        display: "flex",
        opacity: 0.6,
        transition: [
            `transform ${motion.dur.chevron}ms ${motion.spring}`,
            `opacity ${motion.dur.colour}ms`,
        ].join(", "),
    },
    '&[aria-expanded="true"] .cc-chev': {
        transform: "rotate(180deg)",
        opacity: 1,
    },
    [MQ_STACK]: { flex: 1, justifyContent: "center" },
};

const todaySx = {
    ...btnReset,
    padding: "7px 14px",
    borderRadius: "99px",
    background: "var(--cc-srf2)",
    color: "var(--cc-mute)",
    ...ccType.todayBtn,
    transition: `background ${motion.dur.colour}ms, color ${motion.dur.colour}ms`,
    ...hover({ background: "var(--cc-wash)", color: "var(--cc-red)" }),
    // §13-G3: the design's one disabled treatment, hover suppressed with it
    "&:disabled": {
        opacity: 0.4,
        cursor: "default",
        background: "var(--cc-srf2)",
        color: "var(--cc-mute)",
    },
};

/**
 * A portalled MUI surface (Dialog, Menu, Popover, temporary Drawer) is OPEN.
 *
 * Presence of `.MuiModal-root` is NOT enough: the app drawer mounts with
 * `ModalProps={{ keepMounted: true }}` (so the socket-driven approval badge
 * keeps running on phones), and below 980px that drawer is a `temporary`
 * Drawer — i.e. a Modal whose root is in the DOM permanently. Testing for the
 * class alone left arrow-key stepping permanently dead on phones.
 *
 * MUI v5 (@mui/material 5.16.7, Modal.js) marks a closed + fully-exited modal
 * root two ways, and we require BOTH to be clear before we stand down:
 *   - the `MuiModal-hidden` utility class (Modal.js `useUtilityClasses`), and
 *   - `visibility: hidden` on the styled root (Modal.js `ModalRoot`).
 * During an exit transition `exited` is still false, so the modal counts as
 * open until it has finished closing — which is what we want.
 *
 * §11: the innermost layer owns Escape and the arrow keys, so we stand down
 * entirely while a genuinely-open surface is up.
 */
const isModalOpen = () =>
    Array.prototype.some.call(
        document.querySelectorAll(".MuiModal-root"),
        (el) =>
            !el.classList.contains("MuiModal-hidden") &&
            window.getComputedStyle(el).visibility !== "hidden"
    );

const isTypingTarget = (el) => {
    if (!el || !el.tagName) return false;
    const tag = el.tagName.toUpperCase();
    return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable === true
    );
};

const DateSelector = ({ selectedDate, setSelectedDate }) => {
    const location = useLocation();
    const view = viewFromPath(location.pathname);
    const [open, setOpen] = useState(false);
    const triggerRef = useRef(null);
    const panelRef = useRef(null);

    const date = toDate(selectedDate);

    const close = useCallback((restoreFocus) => {
        setOpen(false);
        if (restoreFocus && triggerRef.current) triggerRef.current.focus();
    }, []);

    const step = useCallback(
        (direction) => {
            setSelectedDate((previous) =>
                stepPeriod(view, previous, direction)
            );
        },
        [setSelectedDate, view]
    );

    const jumpToNow = useCallback(
        (restoreFocus) => {
            setSelectedDate(jumpTarget(view));
            close(restoreFocus);
        },
        [close, setSelectedDate, view]
    );

    // A route change swaps the picker shape — never leave the old one open.
    useEffect(() => {
        setOpen(false);
    }, [view]);

    // Close on outside click (§10.8).
    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
            const target = event.target;
            if (panelRef.current && panelRef.current.contains(target)) return;
            if (triggerRef.current && triggerRef.current.contains(target))
                return; // the trigger toggles itself
            setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown, true);
        return () =>
            document.removeEventListener("pointerdown", onPointerDown, true);
    }, [open]);

    // Escape closes the picker; ArrowLeft/ArrowRight step the period (§11).
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.defaultPrevented || isModalOpen()) return;
            if (event.key === "Escape") {
                if (open) {
                    event.preventDefault();
                    close(true);
                }
                return;
            }
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            if (open) return; // the open picker owns the arrow keys
            if (isTypingTarget(event.target)) return;
            event.preventDefault();
            step(event.key === "ArrowLeft" ? -1 : 1);
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [close, open, step]);

    return (
        <>
            <Box sx={pillSx}>
                <Box
                    component="button"
                    type="button"
                    aria-label="Previous"
                    onClick={() => step(-1)}
                    sx={arrowSx}
                >
                    <ChevronIcon />
                </Box>

                <Box
                    component="button"
                    type="button"
                    ref={triggerRef}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    aria-controls={open ? PANEL_ID : undefined}
                    onClick={() => (open ? close(false) : setOpen(true))}
                    sx={titleSx}
                >
                    {formatPeriod(view, date)}
                    <span className="cc-chev">
                        <ChevronDownIcon />
                    </span>
                </Box>

                <Box
                    component="button"
                    type="button"
                    aria-label="Next"
                    onClick={() => step(1)}
                    sx={arrowSx}
                >
                    <ChevronIcon flip />
                </Box>
            </Box>

            <Box
                component="button"
                type="button"
                onClick={() => jumpToNow(false)}
                disabled={periodHasToday(view, date)}
                sx={todaySx}
            >
                Today
            </Box>

            {open && (
                <PickerPanel
                    id={PANEL_ID}
                    view={view}
                    selectedDate={date}
                    panelRef={panelRef}
                    onSelect={(picked) => {
                        setSelectedDate(picked);
                        close(true);
                    }}
                    onJumpToNow={() => jumpToNow(true)}
                />
            )}
        </>
    );
};

export default DateSelector;
