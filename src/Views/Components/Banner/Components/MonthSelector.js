import { Box } from "@mui/material";
import { format, isSameMonth, startOfMonth } from "date-fns";
import { motion, type as ccType } from "../../../../Utilites/concourse";
import { btnReset } from "./atoms";
import { toDate } from "./period";

/**
 * Month view's picker body — ARBITER §10.8: a 3-column month grid. The panel
 * header steps the year; this grid picks the month inside that year.
 *
 * Replaces the MUI <DateCalendar views={["month"]}> implementation (which was
 * enGB/Monday-first and rendered a day grid's chrome for a month choice).
 */

const CELL = "cc-month";

const gridSx = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "6px",
    [`& .${CELL}`]: {
        ...btnReset,
        display: "block",
        width: "100%",
        padding: "9px 0",
        borderRadius: "99px",
        background: "var(--cc-srf2)",
        color: "var(--cc-ink)",
        ...ccType.pickerMonth,
        transition: [
            `background ${motion.dur.colour}ms`,
            `color ${motion.dur.colour}ms`,
            `transform ${motion.dur.arrow}ms ${motion.spring}`,
        ].join(", "),
        '&[aria-current="true"]': {
            background: "var(--cc-red)",
            color: "var(--cc-on-red)",
            boxShadow: "var(--cc-glow-pill)",
        },
    },
    "@media (hover: hover)": {
        [`& .${CELL}:hover`]: {
            background: "var(--cc-wash)",
            transform: "translateY(-2px)",
        },
        [`& .${CELL}[aria-current="true"]:hover`]: {
            background: "var(--cc-red)",
        },
    },
};

const MonthSelector = ({ cursor, selectedDate, onSelect }) => {
    const year = toDate(cursor).getFullYear();
    const selected = toDate(selectedDate);
    const months = [];
    for (let m = 0; m < 12; m += 1) months.push(new Date(year, m, 1));

    return (
        <Box sx={gridSx}>
            {months.map((monthDate) => {
                const isSelected = isSameMonth(monthDate, selected);
                return (
                    <button
                        type="button"
                        key={monthDate.getTime()}
                        className={CELL}
                        aria-label={format(monthDate, "MMMM yyyy")}
                        aria-current={isSelected ? "true" : undefined}
                        onClick={() => onSelect(startOfMonth(monthDate))}
                    >
                        {format(monthDate, "MMM")}
                    </button>
                );
            })}
        </Box>
    );
};

export default MonthSelector;
