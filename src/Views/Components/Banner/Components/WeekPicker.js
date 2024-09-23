import { useState } from 'react';
import { styled } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // Use AdapterDateFns
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { isSameWeek } from 'date-fns'; // Import isSameWeek function from date-fns
import { enGB } from 'date-fns/locale'; // Import the locale that starts weeks on Monday
import { DateCalendar, LocalizationProvider } from '@mui/x-date-pickers';

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
    ...(day.getDay() === 1 && isSelected && { // Sunday
        borderTopLeftRadius: '50%',
        borderBottomLeftRadius: '50%',
    }),
    ...(day.getDay() === 0 && isSelected && { // Saturday
        borderTopRightRadius: '50%',
        borderBottomRightRadius: '50%',
    }),
    ...(day.getDay() === 1 && !isSelected && isHovered && { // Sunday
        borderTopLeftRadius: '50%',
        borderBottomLeftRadius: '50%',
    }),
    ...(day.getDay() === 0 && !isSelected && isHovered && { // Saturday
        borderTopRightRadius: '50%',
        borderBottomRightRadius: '50%',
    }),
}));

// Helper function to check if two days are in the same week using date-fns
const isInSameWeek = (dayA, dayB) => {
    if (dayB == null) {
        return false;
    }

    return isSameWeek(dayA, dayB, {weekStartsOn: 1});
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
            isSelected={isInSameWeek(day, selectedDay)}
            isHovered={isInSameWeek(day, hoveredDay)}
        />
    );
}

// Main WeekPicker component
export default function WeekPicker({ selectedDate, setSelectedDate }) {
    const [hoveredDay, setHoveredDay] = useState(null);

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
            <DateCalendar
                views={['day']}
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
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
