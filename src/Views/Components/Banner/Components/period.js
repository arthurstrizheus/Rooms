/**
 * Pure period logic for the banner date switcher. No JSX, no MUI.
 *
 * ARBITER-concourse.md §10.7 (stepping + formats), §10.8 (Sunday-first grid),
 * §14 conflicts 12 and 13.
 */
import {
    addDays,
    addMonths,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    isSameWeek,
    startOfMonth,
    startOfWeek,
} from "date-fns";

/**
 * Sunday, everywhere. This replaces the old enUS (Sunday) / enGB (Monday)
 * split between WeekPicker and DayComponent/MonthSelector, which made the
 * pickers disagree with each other and with the calendar grid.
 * Passed explicitly on every call — never inferred from a locale (§10.8).
 */
export const WEEK_STARTS_ON = 0;
const WEEK_OPTS = { weekStartsOn: WEEK_STARTS_ON };

/** The three `bannerText` values that own a date (Routes.js:47-53). */
export const SCHEDULE_TITLES = [
    "Day Schedule",
    "Week Schedule",
    "Month Schedule",
];

export const isScheduleTitle = (bannerText) =>
    SCHEDULE_TITLES.indexOf(bannerText) !== -1;

/**
 * Route -> view. `/schedule/type/{day,week,month}` drives which picker shows;
 * `/` renders the day schedule (Routes.js:46-47), so it falls through to "day".
 */
export const viewFromPath = (pathname) => {
    const last = String(pathname || "")
        .split("/")
        .filter(Boolean)
        .pop();
    return last === "week" || last === "month" ? last : "day";
};

/** Anything that reaches us from state could in principle be a string. */
export const toDate = (value) =>
    value instanceof Date ? value : new Date(value);

/**
 * The period label in the pill. Formats are the app's own
 * (old DateSelector.js:88-112) with §10.7's en dash and zero-padded days.
 *   month -> July 2026
 *   week  -> 26 – 01 Aug, 2026
 *   day   -> Thu, 30 Jul 2026
 */
export const formatPeriod = (view, date) => {
    const d = toDate(date);
    if (view === "month") return format(d, "MMMM yyyy");
    if (view === "week") {
        const start = startOfWeek(d, WEEK_OPTS);
        const end = endOfWeek(d, WEEK_OPTS);
        return `${format(start, "dd")} – ${format(end, "dd MMM, yyyy")}`;
    }
    return format(d, "EEE, dd MMM yyyy");
};

/**
 * Arrows step by whole units (§10.7). This replaces the old
 * `addDays(weekEnd, 2)`, which landed on Monday and only worked because the
 * week was recomputed afterwards. `addMonths` clamps to the last valid day.
 */
export const stepPeriod = (view, date, direction) => {
    const d = toDate(date);
    if (view === "month") return addMonths(d, direction);
    if (view === "week") return addDays(d, 7 * direction);
    return addDays(d, direction);
};

/** True when the period on screen already contains today (§10.6: Today is then disabled). */
export const periodHasToday = (view, date, now = new Date()) => {
    const d = toDate(date);
    if (view === "month") return isSameMonth(d, now);
    if (view === "week") return isSameWeek(d, now, WEEK_OPTS);
    return isSameDay(d, now);
};

/**
 * What `Today` and the picker footer jump to. Month view normalises to the
 * 1st, matching what the old MonthSelector did (`startOfMonth`).
 */
export const jumpTarget = (view, now = new Date()) =>
    view === "month" ? startOfMonth(now) : now;

/** Footer button copy, per view (§10.8). */
export const FOOTER_LABEL = {
    month: "Jump to this month",
    week: "Jump to this week",
    day: "Jump to today",
};

/** Panel `aria-label`, per view (§10.8). */
export const PANEL_LABEL = {
    month: "Pick a month",
    week: "Pick a week",
    day: "Pick a day",
};

/** 42 cells, Sunday-first, starting on the Sunday on or before the 1st (§10.8). */
export const monthGridDays = (monthDate) => {
    const start = startOfWeek(startOfMonth(toDate(monthDate)), WEEK_OPTS);
    const days = [];
    for (let i = 0; i < 42; i += 1) days.push(addDays(start, i));
    return days;
};

/** Sunday-first initials for the picker's day-of-week header (§10.8). */
export const DOW_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

export const isSameWeekSunday = (a, b) =>
    !!b && isSameWeek(toDate(a), toDate(b), WEEK_OPTS);
