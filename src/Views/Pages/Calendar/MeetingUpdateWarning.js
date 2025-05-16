import { useTheme } from "@emotion/react";
import { getAmPm } from "../../../Utilites/Functions/CommonFunctions";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import EditNoteIcon from "@mui/icons-material/EditNote";
import EditRoadIcon from "@mui/icons-material/EditRoad";
import {
  Grid,
  Stack,
  Typography,
  Tooltip,
  Button,
  Divider,
} from "@mui/material";

const MeetingUpdateWarning = ({
  selectedEvent,
  room,
  location,
  color,
  handleExit,
}) => {
  const theme = useTheme();
  if (!selectedEvent) {
    return <></>;
  }

  const handleUpdate = (mode) => {
    handleExit(true, mode);
  };

  console.log(selectedEvent.extendedProps);

  return (
    <Grid
      container
      height={"100%"}
      sx={{
        minWidth: "320px",
        minHeight: "320px",
        width: "400px",
        overflow: "hidden",
      }}
    >
      <CloseIcon
        sx={{
          position: "absolute",
          top: 1,
          right: 1,
          borderRadius: "50%",
          width: "25px",
          height: "25px",
          color: "black",
          background: "#f5f5f5",
          ":hover": {
            background: "#e8e8e8",
            cursor: "pointer",
            transform: "scale(1.1)",
          },
        }}
        onClick={() => handleExit(false)}
      />
      <Grid
        item
        sx={{
          width: "100%",
          height: "100%",
          borderBottom: `5px solid ${color}`,
          padding: "15px 20px 10px 20px",
          background: "#f2eeed",
        }}
      >
        <Stack
          direction={"column"}
          spacing={"-5px"}
          sx={{ paddingLeft: "5px" }}
        >
          <Typography variant="h5">
            {selectedEvent.extendedProps.name}
          </Typography>
          <Typography variant="caption" fontSize={14} paddingLeft={"3px"}>
            {new Date(selectedEvent.start).toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Typography>
        </Stack>
        <Divider sx={{ paddingTop: "5px" }} />
        <Stack
          direction={"column"}
          sx={{ paddingTop: "5px", paddingLeft: "5px" }}
          spacing={"-8px"}
        >
          <Typography
            variant="h6"
            fontSize={18}
            letterSpacing={1}
            color={theme.palette.secondary.main}
          >
            {selectedEvent.start.getHours()}:
            {String(selectedEvent.start.getMinutes()).padStart(2, "0")}
            {getAmPm(selectedEvent.start)} -{" "}
            {selectedEvent.end.getHours() > 12
              ? selectedEvent.end.getHours() - 12
              : selectedEvent.end.getHours()}
            :{String(selectedEvent.end.getMinutes()).padStart(2, "0")}
            {getAmPm(selectedEvent.end)}
          </Typography>
          <Typography
            variant="body1"
            color={theme.palette.primary.text.dark}
            fontSize={14}
            paddingLeft={"3px"}
          >
            SEA {location} / {room}
          </Typography>
        </Stack>
      </Grid>
      <Grid
        item
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "15px 20px 10px 20px",
          justifyContent: "center",
        }}
      >
        <Typography paddingTop={"10px"}>
          This meeting is recurring {selectedEvent.extendedProps.repeats}.
        </Typography>
        <Typography paddingTop={"10px"}>What would you like to do?</Typography>
      </Grid>
      <Grid padding={"5px"}></Grid>
      <Stack
        position={"relative"}
        bottom={selectedEvent.extendedProps.description ? 0 : -5}
        direction={"row"}
        width={"100%"}
        sx={{
          marginBottom: "-5px",
          paddingRight: "5px",
          paddingTop: "5px",
          paddingLeft: "5px",
          height: "35px",
          borderTop: "1px solid #dedede",
        }}
        spacing={1}
      >
        <Tooltip
          title={"Update all meetings in this recurrence"}
          componentsProps={{
            tooltip: {
              sx: {
                fontSize: ".8rem", // Larger text
              },
            },
          }}
        >
          <Button
            variant={"outlined"}
            style={{ fontSize: "12px" }}
            sx={{
              width: "100%",
              color: "black",
            }}
            onClick={() => handleUpdate("all")}
            startIcon={<EditNoteIcon sx={{ color: "error" }} />}
          >
            Edit All
          </Button>
        </Tooltip>
        <Tooltip
          title={"Update all the following mettings including this one"}
          componentsProps={{
            tooltip: {
              sx: {
                fontSize: ".8rem", // Larger text
              },
            },
          }}
        >
          <Button
            variant={"outlined"}
            style={{ fontSize: "12px" }}
            sx={{
              width: "100%",
              color: "black",
            }}
            onClick={() => handleUpdate("next")}
            startIcon={
              <EditRoadIcon sx={{ color: theme.palette.secondary.light }} />
            }
          >
            Edit Next
          </Button>
        </Tooltip>
        <Tooltip
          title={"Update this meeting"}
          componentsProps={{
            tooltip: {
              sx: {
                fontSize: ".8rem", // Larger text
              },
            },
          }}
        >
          <Button
            variant={"outlined"}
            style={{ fontSize: "12px" }}
            sx={{
              width: "100%",
              color: "black",
            }}
            onClick={() => handleUpdate("current")}
            startIcon={
              <EditIcon sx={{ color: theme.palette.secondary.light }} />
            }
          >
            Edit Current
          </Button>
        </Tooltip>
      </Stack>
    </Grid>
  );
};

export default MeetingUpdateWarning;
