import DayGrid from "./DayGrid";

/**
 * Week view's picker body — ARBITER §10.8: the same Sunday-first day calendar
 * as the Day picker, but the whole Sun–Sat row of the selected week reads as
 * one continuous pill.
 *
 * Replaces the MUI <DateCalendar>/<PickersDay> implementation. Week start is
 * passed explicitly (Sunday) rather than coming from an enUS/enGB locale.
 */
const WeekPicker = ({ cursor, selectedDate, onSelect }) => (
    <DayGrid
        mode="week"
        cursor={cursor}
        selectedDate={selectedDate}
        onSelect={onSelect}
    />
);

export default WeekPicker;
