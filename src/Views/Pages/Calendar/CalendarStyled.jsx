// ExperimentalStyled.js
import { styled } from "@mui/material/styles";

const ExperimentalStyled = styled("div")(({ theme }) => ({
  // hide license message
  "& .fc-license-message": {
    display: "none",
  },

  // basic style
  "& .fc": {
    "--fc-bg-event-opacity": 1,
    "--fc-border-color": theme.palette.divider,
    "--fc-daygrid-event-dot-width": "10px",
    "--fc-list-event-dot-width": "10px",
    "--fc-event-border-color": theme.palette.primary.dark,
    "--fc-now-indicator-color": theme.palette.alert.error,
    // keep the custom prop in case other styles read it:
    "--fc-today-bg-color": theme.palette.primary.lightHover,
    color: theme.palette.text.primary,
    fontFamily: theme.typography.fontFamily,
  },

  // date text
  "& .fc .fc-daygrid-day-top": {
    display: "grid",
    "& .fc-daygrid-day-number": {
      textAlign: "center",
      marginTop: 12,
      marginBottom: 12,
    },
  },

  // weekday header
  "& .fc .fc-col-header-cell": {
    backgroundColor: theme.palette.background.fill.light.light,
  },

  "& .fc .fc-col-header-cell-cushion": {
    color: theme.palette.primary.main,
    padding: 16,
  },
  "& .fc-theme-standard .fc-list": {
    overflowX: "auto",
  },

  // events
  "& .fc-direction-ltr .fc-daygrid-event.fc-event-end, .fc-direction-rtl .fc-daygrid-event.fc-event-start":
    {
      marginLeft: 4,
      marginBottom: 6,
      borderRadius: "6px",
    },
  "& .fc-direction-ltr .fc-daygrid-event.fc-event-start, .fc-direction-rtl .fc-daygrid-event.fc-event-end":
    {
      marginLeft: 4,
      marginBottom: 6,
      borderRadius: "6px",
    },
  "& .fc-h-event .fc-event-main": {
    padding: 4,
    paddingLeft: 8,
  },

  // popover when multiple events
  "& .fc .fc-more-popover": {
    border: "none",
    borderRadius: "14px",
  },
  "& .fc .fc-more-popover .fc-popover-body": {
    backgroundColor: theme.palette.primary.lightHover,
    borderBottomLeftRadius: "12px",
    borderBottomRightRadius: "12px",
  },
  "& .fc .fc-popover-header": {
    padding: 12,
    borderTopLeftRadius: "12px",
    borderTopRightRadius: "12px",
    backgroundColor: theme.palette.primary.lightHover,
    color: theme.palette.text.primary,
  },

  // agenda view
  "& .fc-theme-standard .fc-list-day-cushion": {
    backgroundColor: theme.palette.primary.lightHover,
  },
  "& .fc .fc-list-event:hover td": {
    backgroundColor: theme.palette.primary.lightHover,
  },

  "& .fc-timegrid-event-harness-inset .fc-timegrid-event, .fc-timegrid-event.fc-event-mirror, .fc-timegrid-more-link":
    {
      padding: 8,
      margin: 2,
    },

  // —— weekday vs weekend colouring —— //

  // daygrid Weekdays, but NOT Today
  "& .fc .fc-daygrid-day:not(.fc-day-today):not(.fc-day-sat):not(.fc-day-sun)":
    {
      backgroundColor: theme.palette.background.fill.light.light,
    },
  // daygrid Weekends, but NOT Today
  "& .fc .fc-daygrid-day.fc-day-sat:not(.fc-day-today), \
  .fc .fc-daygrid-day.fc-day-sun:not(.fc-day-today)": {
    backgroundColor: theme.palette.background.paper,
  },

  // —— TimeGrid: white weekdays, grey weekends —— //
  "& .fc .fc-timegrid-col:not(.fc-day-today):not(.fc-day-sat):not(.fc-day-sun)":
    {
      backgroundColor: theme.palette.background.fill.light.light,
    },
  "& .fc .fc-timegrid-col.fc-day-sat:not(.fc-day-today), \
  .fc .fc-timegrid-col.fc-day-sun:not(.fc-day-today)": {
    backgroundColor: theme.palette.background.paper,
  },

  // —— Today override —— //
  // This must come *after* the weekday/weekend rules
  "& .fc .fc-daygrid-day.fc-day-today": {
    background: theme.palette.primary.lightHover,
  },
  // // Optional: make the number text contrast nicely
  // "& .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number": {
  //   color: theme.palette.primary.contrastText,
  // },
}));

export default ExperimentalStyled;
