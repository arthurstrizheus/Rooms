import { useRef } from "react";
import { Box } from "@mui/material";
import { format, isSameDay, isSameMonth } from "date-fns";
import { motion, type as ccType } from "../../../../Utilites/concourse";
import { btnReset } from "./atoms";
import {
    DOW_INITIALS,
    isSameWeekSunday,
    monthGridDays,
    toDate,
} from "./period";

/**
 * The day calendar shared by the Week and Day pickers — ARBITER §10.8.
 * 42 cells, Sunday-first. Week view selects a whole Sun–Sat row (one
 * continuous pill); Day view selects a single circle.
 *
 * All cell styling lives in one container `sx` and is driven by classes, so a
 * re-render does not build 42 style objects.
 */

const RING = "cc-ring";
const CELL = "cc-day";

const gridSx = {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "2px 0",

    [`& .${CELL}`]: {
        ...btnReset,
        position: "relative",
        display: "grid",
        placeItems: "center",
        height: "34px",
        color: "var(--cc-ink)",
        ...ccType.pickerDay,
        "&.out": {
            // §4 "Out-of-month picker day" = mix(mute 55%, transparent)
            color: "color-mix(in srgb, var(--cc-mute) 55%, transparent)",
        },
        "&.sel": { color: "var(--cc-on-red)" },
        // today: a 4x4 dot under the number; turns white once selected
        "&.today::after": {
            content: '""',
            position: "absolute",
            bottom: "4px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "4px",
            height: "4px",
            borderRadius: "99px",
            background: "var(--cc-red)",
        },
        "&.today.sel::after": { background: "var(--cc-on-red)" },
    },

    [`& .${RING}`]: {
        position: "absolute",
        inset: "2px",
        borderRadius: "99px",
        transition: `background ${motion.dur.colour}ms ${motion.spring}`,
    },
    "& .cc-num": { position: "relative", zIndex: 1 },

    "@media (hover: hover)": {
        [`& .${CELL}:not(.sel):hover .${RING}`]: {
            background: "var(--cc-srf3)",
        },
    },

    // Day view: a circle. Week view: a bar that rounds off only at Sun/Sat.
    [`&[data-mode="day"] .${CELL}.sel .${RING}`]: {
        background: "var(--cc-red)",
        borderRadius: "99px",
    },
    [`&[data-mode="week"] .${CELL}.sel .${RING}`]: {
        background: "var(--cc-red)",
        borderRadius: 0,
    },
    [`&[data-mode="week"] .${CELL}.sel.wk-start .${RING}`]: {
        borderRadius: "99px 0 0 99px",
    },
    [`&[data-mode="week"] .${CELL}.sel.wk-end .${RING}`]: {
        borderRadius: "0 99px 99px 0",
    },
};

const dowRowSx = {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    paddingBottom: "4px",
    "& > span": {
        textAlign: "center",
        color: "var(--cc-mute)",
        ...ccType.pickerDow,
    },
};

const STEP = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

const DayGrid = ({ mode, cursor, selectedDate, onSelect }) => {
    const cellRefs = useRef([]);
    const shownMonth = toDate(cursor);
    const days = monthGridDays(shownMonth);
    const today = new Date();
    const selected = toDate(selectedDate);

    /**
     * Arrow keys move focus inside the grid (§11). The panel is open, so
     * DateSelector's document-level Arrow handler stands down; we also stop
     * propagation so the period cannot step underneath us.
     */
    const handleKeyDown = (event) => {
        const index = cellRefs.current.indexOf(event.target);
        if (index < 0) return;
        let next = null;
        if (Object.prototype.hasOwnProperty.call(STEP, event.key)) {
            next = index + STEP[event.key];
        } else if (event.key === "Home") {
            next = index - (index % 7);
        } else if (event.key === "End") {
            next = index - (index % 7) + 6;
        }
        if (next === null) return;
        event.preventDefault();
        event.stopPropagation();
        const target = cellRefs.current[Math.max(0, Math.min(41, next))];
        if (target) target.focus();
    };

    return (
        <>
            <Box sx={dowRowSx} aria-hidden="true">
                {DOW_INITIALS.map((letter, i) => (
                    <span key={`${letter}-${i}`}>{letter}</span>
                ))}
            </Box>
            <Box sx={gridSx} data-mode={mode} onKeyDown={handleKeyDown}>
                {days.map((day, index) => {
                    const isSelected =
                        mode === "week"
                            ? isSameWeekSunday(day, selected)
                            : isSameDay(day, selected);
                    const dow = day.getDay();
                    const className = [
                        CELL,
                        isSameMonth(day, shownMonth) ? "" : "out",
                        isSelected ? "sel" : "",
                        isSelected && dow === 0 ? "wk-start" : "",
                        isSelected && dow === 6 ? "wk-end" : "",
                        isSameDay(day, today) ? "today" : "",
                    ]
                        .filter(Boolean)
                        .join(" ");

                    return (
                        <button
                            type="button"
                            key={day.getTime()}
                            className={className}
                            ref={(el) => {
                                cellRefs.current[index] = el;
                            }}
                            aria-label={format(day, "EEE dd MMM")}
                            aria-current={
                                // day view: one current date. week view: the
                                // whole Sun–Sat run is "current".
                                isSelected
                                    ? mode === "week"
                                        ? "true"
                                        : "date"
                                    : undefined
                            }
                            onClick={() => onSelect(day)}
                        >
                            <span className={RING} />
                            <span className="cc-num">{format(day, "d")}</span>
                        </button>
                    );
                })}
            </Box>
        </>
    );
};

export default DayGrid;
