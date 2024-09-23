import { useState } from 'react';
import { styled } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { isSameMonth, startOfMonth } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { DateCalendar, LocalizationProvider } from '@mui/x-date-pickers';

// Custom styling for PickersDay to highlight the selected month
const CustomPickersDay = styled(PickersDay, {
    shouldForwardProp: (prop) => prop !== 'isSelected' && prop !== 'isHovered',
    })(({ theme, isSelected, isHovered, day }) => ({
    borderRadius: 0,
    ...(isSelected && {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        '&:hover, &:focus': {
        backgroundColor: theme.palette.primary.dark,
        },
    }),
    ...(isHovered && {
        backgroundColor: theme.palette.primary.light,
        '&:hover, &:focus': {
        backgroundColor: theme.palette.primary.light,
        },
    }),
}));

// Helper function to check if two dates are in the same month
const isInSameMonth = (dayA, dayB) => {
    if (dayB == null) {
        return false;
    }
    return isSameMonth(dayA, dayB);
};

// Day component used in the calendar
function Day(props) {
    const { day, selectedDay, hoveredDay, ...other } = props;

    return (
        <CustomPickersDay
            {...other}
            day={day}
            sx={{ px: 2.5 }}
            disableMargin
            selected={false}
            isSelected={isInSameMonth(day, selectedDay)}
            isHovered={isInSameMonth(day, hoveredDay)}
        />
    );
}

// Main MonthPicker component
export default function MonthSelector({ selectedDate, setSelectedDate }) {
    const [hoveredDay, setHoveredDay] = useState(null);

    // Handle month selection
    const handleMonthChange = (newValue) => {
        setSelectedDate(startOfMonth(newValue));
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
            <DateCalendar
                views={['month']}
                openTo="month"
                value={selectedDate}
                onChange={handleMonthChange}
                showDaysOutsideCurrentMonth
                displayWeekNumber={false} // Hide week numbers
                slots={{ day: Day }}
                slotProps={{
                    day: (ownerState) => ({
                        selectedDay: selectedDate,
                        hoveredDay,
                        onPointerEnter: () => setHoveredDay(ownerState.day),
                        onPointerLeave: () => setHoveredDay(null),
                    }),
                }}
            />
        </LocalizationProvider>
    );
}
