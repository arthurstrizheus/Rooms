import { useState } from "react";
import { styled } from "@mui/material/styles";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { PickersDay } from "@mui/x-date-pickers/PickersDay";
import { isSameWeek } from "date-fns";
import { enUS } from "date-fns/locale"; // Because Sunday is the lord's day, obviously
import { DateCalendar, LocalizationProvider } from "@mui/x-date-pickers";
import { Box } from "@mui/material";

// A gloriously overengineered way to make Sunday the first day of the week.
// Because who needs consistency with the rest of the world, eh?
const CustomPickersDay = styled(PickersDay, {
  shouldForwardProp: (prop) => prop !== "isSelected" && prop !== "isHovered",
})(({ theme, isSelected, isHovered, day }) => ({
  borderRadius: 0,
  ...(isSelected && {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    "&:hover, &:focus": {
      backgroundColor: theme.palette.primary.dark,
    },
  }),
  ...(isHovered && {
    backgroundColor: theme.palette.primary.light,
    "&:hover, &:focus": {
      backgroundColor: theme.palette.primary.light,
    },
  }),
  // If it's a Sunday (day.getDay() === 0), give it a left round so it looks like a week's capstone.
  ...(day.getDay() === 0 &&
    isSelected && {
      borderTopLeftRadius: "50%",
      borderBottomLeftRadius: "50%",
    }),
  // If it's a Saturday (day.getDay() === 6), round the right edge, because the week is done, mate.
  ...(day.getDay() === 6 &&
    isSelected && {
      borderTopRightRadius: "50%",
      borderBottomRightRadius: "50%",
    }),
  // Same fanciness for hover-state:
  ...(day.getDay() === 0 &&
    !isSelected &&
    isHovered && {
      borderTopLeftRadius: "50%",
      borderBottomLeftRadius: "50%",
    }),
  ...(day.getDay() === 6 &&
    !isSelected &&
    isHovered && {
      borderTopRightRadius: "50%",
      borderBottomRightRadius: "50%",
    }),
}));

// Helper to see if two dates are in the same Sunday‑to‑Saturday week.
// date-fns thinks Sunday-first if you explicitly say so.
const isInSameWeek = (dayA, dayB) => {
  if (!dayB) {
    return false;
  }
  // weekStartsOn: 0 => Sunday, of course.
  return isSameWeek(dayA, dayB, { weekStartsOn: 0 });
};

function Day(props) {
  const { day, selectedDay, hoveredDay, ...other } = props;
  return (
    <CustomPickersDay
      {...other}
      day={day}
      sx={{ px: 2.5 }}
      disableMargin
      selected={false} // MUI's own logic? Bah.
      isSelected={isInSameWeek(day, selectedDay)}
      isHovered={isInSameWeek(day, hoveredDay)}
    />
  );
}

export default function WeekPicker({ selectedDate, setSelectedDate }) {
  const [hoveredDay, setHoveredDay] = useState(null);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
      <Box
        sx={{
          width: "100%",
          overflowX: "hidden",
          display: "flex",
          justifyContent: "center",
          padding: 1,
          boxSizing: "border-box",
          "& .MuiPickersCalendarHeader-root": {
            flexWrap: "wrap", // make the header wrap on small screens
          },
          "& .MuiPickersSlideTransition-root": {
            width: "100%", // force calendar body to scale
          },
          "& .MuiDayCalendar-weekContainer": {
            justifyContent: "space-between", // spread days evenly
          },
        }}
      >
        <DateCalendar
          views={["day"]}
          value={selectedDate}
          onChange={(newValue) => setSelectedDate(newValue)}
          showDaysOutsideCurrentMonth
          displayWeekNumber={false}
          slots={{ day: Day }}
          slotProps={{
            day: (ownerState) => ({
              selectedDay: selectedDate,
              hoveredDay,
              onPointerEnter: () => setHoveredDay(ownerState.day),
              onPointerLeave: () => setHoveredDay(null),
            }),
          }}
          // Tell MUI itself that weeks start on Sunday, in case it draws headers differently.
          componentsProps={{
            dayOfWeek: { weekStartsOn: 0 },
          }}
        />
      </Box>
    </LocalizationProvider>
  );
}
