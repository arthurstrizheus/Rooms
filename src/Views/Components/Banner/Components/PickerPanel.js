import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { addMonths, addYears, format } from "date-fns";
import {
    anim,
    bp,
    motion,
    radius,
    type as ccType,
    zIndex,
} from "../../../../Utilites/concourse";
import { btnReset, ChevronIcon, hover } from "./atoms";
import { FOOTER_LABEL, PANEL_LABEL, toDate } from "./period";
import DayComponent from "./DayComponent";
import MonthSelector from "./MonthSelector";
import WeekPicker from "./WeekPicker";

/**
 * The in-banner date picker — ARBITER §10.8.
 *
 * Rendered IN TREE and absolutely positioned against the banner (which is
 * `position: relative`), deliberately NOT a MUI Popover/Popper: those portal to
 * document.body, which makes the specified `z-index: 26` meaningless and the
 * positioning story harder for no gain.
 *
 * Entrance is `cc-pick-in` (320ms spring, origin top right). The design defines
 * no exit keyframe, so closing is an unmount — which is also what resets the
 * browsing cursor to `selectedDate` on every open.
 */

const OFFSET = "clamp(12px,2.6vw,24px)";

const panelSx = {
    position: "absolute",
    top: "calc(100% - 4px)",
    right: OFFSET,
    zIndex: zIndex.picker,
    width: "min(316px, 90vw)",
    boxSizing: "border-box",
    padding: "14px",
    background: "var(--cc-srf)",
    color: "var(--cc-ink)",
    borderRadius: `${radius.pop}px`,
    boxShadow: "var(--cc-sh2)",
    // Concourse root: own the font, never a global typography override (§6/G10)
    fontFamily: "var(--cc-sans)",
    fontSize: "15px",
    lineHeight: 1.5,
    animation: anim.picker(),
    transformOrigin: "top right",
    // focused programmatically on open; the visible ring lives on its controls
    outline: "none",
    // §9 <=700px: pinned to both edges
    [`@media (max-width:${bp.stackNav}px)`]: {
        left: OFFSET,
        right: OFFSET,
        width: "auto",
    },
};

const headerSx = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
};

const headerBtnSx = {
    ...btnReset,
    width: "27px",
    height: "27px",
    borderRadius: "99px",
    background: "var(--cc-srf2)",
    color: "var(--cc-mute)",
    transition: `background ${motion.dur.colour}ms, color ${motion.dur.colour}ms`,
    ...hover({ background: "var(--cc-wash)", color: "var(--cc-red)" }),
};

const headerLabelSx = {
    flex: 1,
    textAlign: "center",
    color: "var(--cc-ink)",
    ...ccType.pickerLabel,
};

const footerSx = {
    display: "flex",
    gap: "7px",
    marginTop: "11px",
    paddingTop: "11px",
    borderTop: "1px solid var(--cc-line)",
};

const footerBtnSx = {
    ...btnReset,
    flex: 1,
    padding: "8px",
    borderRadius: `${radius.xs}px`,
    background: "var(--cc-srf2)",
    color: "var(--cc-mute)",
    ...ccType.todayBtn,
    transition: `background ${motion.dur.colour}ms, color ${motion.dur.colour}ms`,
    ...hover({ background: "var(--cc-wash)", color: "var(--cc-red)" }),
};

const PickerPanel = ({
    id,
    view,
    selectedDate,
    panelRef,
    onSelect,
    onJumpToNow,
}) => {
    const [cursor, setCursor] = useState(() => toDate(selectedDate));

    // Move focus into the panel so the keyboard lands on its controls, not on
    // the banner buttons that follow the trigger in DOM order.
    useEffect(() => {
        const el = panelRef.current;
        if (el) el.focus();
    }, [panelRef]);

    // Month view browses by year; week/day views browse by month.
    const byYear = view === "month";
    const stepCursor = (direction) =>
        setCursor((current) =>
            byYear
                ? addYears(current, direction)
                : addMonths(current, direction)
        );

    return (
        <Box
            ref={panelRef}
            id={id}
            role="dialog"
            aria-label={PANEL_LABEL[view]}
            tabIndex={-1}
            sx={panelSx}
        >
            <Box sx={headerSx}>
                <Box
                    component="button"
                    type="button"
                    aria-label={byYear ? "Previous year" : "Previous month"}
                    onClick={() => stepCursor(-1)}
                    sx={headerBtnSx}
                >
                    <ChevronIcon size={15} strokeWidth={2} />
                </Box>
                <Box component="span" sx={headerLabelSx}>
                    {byYear
                        ? format(cursor, "yyyy")
                        : format(cursor, "MMMM yyyy")}
                </Box>
                <Box
                    component="button"
                    type="button"
                    aria-label={byYear ? "Next year" : "Next month"}
                    onClick={() => stepCursor(1)}
                    sx={headerBtnSx}
                >
                    <ChevronIcon size={15} strokeWidth={2} flip />
                </Box>
            </Box>

            {view === "month" && (
                <MonthSelector
                    cursor={cursor}
                    selectedDate={selectedDate}
                    onSelect={onSelect}
                />
            )}
            {view === "week" && (
                <WeekPicker
                    cursor={cursor}
                    selectedDate={selectedDate}
                    onSelect={onSelect}
                />
            )}
            {view === "day" && (
                <DayComponent
                    cursor={cursor}
                    selectedDate={selectedDate}
                    onSelect={onSelect}
                />
            )}

            <Box sx={footerSx}>
                <Box
                    component="button"
                    type="button"
                    onClick={onJumpToNow}
                    sx={footerBtnSx}
                >
                    {FOOTER_LABEL[view]}
                </Box>
            </Box>
        </Box>
    );
};

export default PickerPanel;
