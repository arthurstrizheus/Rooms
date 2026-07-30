import DayGrid from "./DayGrid";

/**
 * Day view's picker body — ARBITER §10.8: the Sunday-first day calendar with a
 * single selected circle.
 *
 * Replaces the MUI <DateCalendar>/<PickersDay> implementation, which was
 * locale-driven (enGB => Monday-first) and disagreed with WeekPicker and the
 * calendar grid. Week start is now passed explicitly, never inferred.
 */
const DayComponent = ({ cursor, selectedDate, onSelect }) => (
    <DayGrid
        mode="day"
        cursor={cursor}
        selectedDate={selectedDate}
        onSelect={onSelect}
    />
);

export default DayComponent;
