import { styled } from "@mui/material/styles";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { PickersDay } from "@mui/x-date-pickers/PickersDay";
import { isSameDay } from "date-fns";
import { enGB } from "date-fns/locale"; // Import the locale that starts weeks on Monday
import { DateCalendar, LocalizationProvider } from "@mui/x-date-pickers";
import { Box } from "@mui/material";

const CustomPickersDay = styled(PickersDay, {
  shouldForwardProp: (prop) => prop !== "isSelected" && prop !== "isHovered",
})(({ theme, isSelected, isHovered }) => ({
  borderRadius: 50,
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
}));

const DayComponent = (props) => {
  const { day, selectedDate, ...other } = props;

  return (
    <CustomPickersDay
      {...other}
      day={day}
      selected={isSameDay(day, selectedDate)}
      isSelected={isSameDay(day, selectedDate)}
    />
  );
};

export default function DaSelector({ selectedDate, setSelectedDate }) {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
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
          onChange={(newDate) => setSelectedDate(newDate)}
          showDaysOutsideCurrentMonth
          displayWeekNumber={false}
          slots={{ day: DayComponent }}
          slotProps={{
            day: (ownerState) => ({
              selectedDate: selectedDate,
            }),
          }}
        />
      </Box>
    </LocalizationProvider>
  );
}
