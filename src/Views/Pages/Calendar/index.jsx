import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";

// material-ui
import Dialog from "@mui/material/Dialog";
import useMediaQuery from "@mui/material/useMediaQuery";

// third-party
import FullCalendar from "@fullcalendar/react";
import listPlugin from "@fullcalendar/list";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import timelinePlugin from "@fullcalendar/timeline";
import interactionPlugin from "@fullcalendar/interaction";
import { startOfMonth, startOfWeek } from "date-fns";

// project imports
import CalendarStyled from "./CalendarStyled";

import Loader from "../../Components/Loader";
import SubCard from "../../Components/SubCard";

// assets
import DisplayMeeting from "../../Components/DisplayMeeting/DisplayMeeting";
import { useAuth } from "../../../Utilites/AuthContext";
import {
  GetLocations,
  GetMeetingsByUserId,
  GetRooms,
  GetTypes,
  showError,
  showSuccess,
} from "../../../Utilites/Functions/ApiFunctions";
import { Grid, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MeetingFourm from "./MeetingForum";
import MeetingUpdateWarning from "./MeetingUpdateWarning";
import {
  CheckPostMeeting,
  UpdateAllMeetingsInRecurrence,
  UpdateAllNextMeetingsInRecurrence,
  UpdateCurrentOnlyMeeting,
  UpdateMeeting,
  UpdateParentOnlyMeeting,
} from "../../../Utilites/Functions/ApiFunctions/MeetingFunctions";

import { IsMeetingParentRecurrence } from "../../../Utilites/Functions/ApiFunctions/MeetingRecurrencesFunctions";

const transposeMeetingToEvent = (meetings) => {
  let events = [];
  if (meetings?.length) {
    meetings.map((meeting, index) => {
      events.push({
        id: meeting.id == -1 ? index : meeting.id, // Unique string or number
        title: meeting.name, // Text shown on the calendar
        start: meeting.start_time, // ISO format date/time string
        end: meeting.end_time, // Optional; defaults to 1-hour if omitted
        allDay: meeting.all_day, // Set true for all-day events
        // Custom props (optional)
        extendedProps: {
          ...meeting,
        },
      });
    });
  }
  return events;
};

// ==============================|| APPLICATION CALENDAR ||============================== //

const Calendar = ({
  setLoading,
  loading,
  selectedDate,
  setSelectedDate,
  defaultView,
  range,
}) => {
  const calendarRef = useRef(null);
  const { user } = useAuth();
  const matchSm = useMediaQuery((theme) => theme.breakpoints.down("md"));

  // fetch data
  const [meetings, setMeetings] = useState([]);
  const [meetingTypes, setMeetingTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [locations, setLocations] = useState([]);
  const [update, setUpdate] = useState(false);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [updateMode, setUpdateMode] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openMeetingDialog, setOpenMeetingDialog] = useState(false);
  const [selectedRange, setSelectedRange] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [view, setView] = useState(matchSm ? "listWeek" : defaultView);
  const [showParentWarning, setShowParentWarning] = useState(false);
  const [updateEvent, setUpdateEvent] = useState(null);
  // dayGridMonth, timeGridWeek, timeGridDay

  useEffect(() => {
    console.log("update Triggered");
    const data = async () => {
      const lcs = await GetLocations();
      const rms = await GetRooms(user?.id);
      const mts = await GetMeetingsByUserId(user?.id, {
        date:
          range == "Month"
            ? startOfMonth(selectedDate)
            : range == "Week"
            ? startOfWeek(selectedDate)
            : selectedDate,
        range: range,
      });
      const tps = await GetTypes();

      setRooms(rms);
      setMeetings(mts);
      setMeetingTypes(tps);
      setLocations(lcs);
      setLoading(false);
    };
    if (user?.id) {
      setLoading(true);
      data();
    }
  }, [user, selectedDate, updateTrigger, defaultView]);

  const handleViewChange = (newView) => {
    const calendarEl = calendarRef.current;

    if (calendarEl) {
      const calendarApi = calendarEl.getApi();

      calendarApi.changeView(newView);
      setView(newView);
    }
  };

  // set calendar view
  useEffect(() => {
    handleViewChange(matchSm ? "listWeek" : defaultView);
  }, [matchSm, defaultView]);

  useEffect(() => {
    const calendarEl = calendarRef.current;
    if (calendarEl) {
      const calendarApi = calendarEl.getApi();
      calendarApi.gotoDate(selectedDate);
    }
  }, [selectedDate, defaultView]);

  useEffect(() => {
    setEvents(transposeMeetingToEvent(meetings));
  }, [meetings]);

  // calendar event select/add/edit/delete
  const handleRangeSelect = (arg) => {
    const calendarEl = calendarRef.current;
    if (calendarEl) {
      const calendarApi = calendarEl.getApi();
      calendarApi.unselect();
    }

    setSelectedRange({
      start: arg.start,
      end: arg.end,
      allDay: arg.allDay,
    });
    setOpenMeetingDialog(true);
  };

  const handleEventSelect = (arg) => {
    if (arg.event.id) {
      const selectEvent = events.find((_event) => _event.id == arg.event.id);
      setSelectedEvent(selectEvent);
    } else {
      setSelectedEvent(null);
    }
    setIsModalOpen(true);
  };

  const handleEventUpdate = async ({ event }) => {
    try {
      const isParent = await IsMeetingParentRecurrence(event.extendedProps.id);
      if (event.extendedProps.recurrence_id && isParent.parent) {
        setShowParentWarning(true);
        setSelectedEvent(event);
        setUpdateEvent(event);
      } else {
        const updatedMeeting = {
          ...event.extendedProps,
          start_time: new Date(event.start).toISOString(),
          end_time: new Date(event.end).toISOString(),
          all_day: event.allDay,
        };
        UpdateMeeting(user?.id, updatedMeeting)
          .then((resp) => {
            if (resp) {
              showSuccess("Meeting has been updated");
            }
            setUpdateTrigger((prev) => prev + 1);
            setLoading(false);
          })
          .catch(() => {
            setLoading(false);
            handleModalClose();
            setUpdateTrigger((prev) => prev + 1);
            showError("There was an error updating the meetings.");
          });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEventCreate = async (data) => {
    // TODO implement
    handleModalClose();
  };

  const handleUpdateEvent = async (eventId, update) => {
    setUpdate(true);
    setOpenMeetingDialog(true);
    setIsModalOpen(false);
  };

  const handleExitWarning = (updateMeetings, mode) => {
    if (updateMeetings) {
      setLoading(true);
      const updatedMeeting = {
        ...updateEvent.extendedProps,
        new_start_time: new Date(updateEvent.start).toISOString(),
        new_end_time: new Date(updateEvent.end).toISOString(),
      };
      if (mode == "next" && user?.id) {
        UpdateAllNextMeetingsInRecurrence(user?.id, updatedMeeting)
          .then(() => {
            showSuccess("Meeting has been updated");
            setUpdateTrigger((prev) => prev + 1);
            setLoading(false);
          })
          .catch((err) => {
            console.log(err);
            setUpdateTrigger((prev) => prev + 1);
            showError("There was an error updating the meetings.");
            setLoading(false);
          });
      } else if (mode == "current" && user?.id) {
        CheckPostMeeting(user?.id, updatedMeeting)
          .then((resp) => {
            if (resp?.book) {
              if (updatedMeeting?.id > 0) {
                UpdateParentOnlyMeeting(user?.id, updatedMeeting)
                  .then((resp) => {
                    if (resp) {
                      showSuccess("Meeting has been updated");
                    }
                    setUpdateTrigger((prev) => prev + 1);
                    setLoading(false);
                  })
                  .catch((err) => {
                    console.log(err);
                    setLoading(false);
                    setUpdateTrigger((prev) => prev + 1);
                    showError("There was an error updating the meetings.");
                  });
              } else {
                UpdateCurrentOnlyMeeting(user?.id, updatedMeeting)
                  .then((resp) => {
                    if (resp) {
                      showSuccess("Meeting has been updated");
                    }
                    setLoading(false);
                    setUpdateTrigger((prev) => prev + 1);
                  })
                  .catch((err) => {
                    console.log(err);
                    setLoading(false);
                    setUpdateTrigger((prev) => prev + 1);
                    showError("There was an error updating the meetings.");
                  });
              }
            }
          })
          .catch((err) => {
            console.log(err);
            setUpdateTrigger((prev) => prev + 1);
            showError("There was an error updating the meetings.");
          });
      } else if (mode == "all" && user?.id) {
        UpdateAllMeetingsInRecurrence(user?.id, updatedMeeting)
          .then((resp) => {
            if (resp) {
              showSuccess("Meeting has been updated");
            }
            setLoading(false);
            setUpdateTrigger((prev) => prev + 1);
          })
          .catch((err) => {
            console.log(err);
            setLoading(false);
            setUpdateTrigger((prev) => prev + 1);
            showError("There was an error updating the meetings.");
          });
      } else if (user?.id) {
        CheckPostMeeting(user?.id, updatedMeeting)
          .then((resp) => {
            if (resp?.book) {
              UpdateMeeting(user?.id, updatedMeeting)
                .then((resp) => {
                  if (resp) {
                    showSuccess("Meeting has been updated");
                  }
                  setUpdateTrigger((prev) => prev + 1);
                  setLoading(false);
                })
                .catch(() => {
                  setLoading(false);
                  handleModalClose();
                  setUpdateTrigger((prev) => prev + 1);
                  showError("There was an error updating the meetings.");
                });
            }
          })
          .catch((err) => {
            setLoading(false);
            console.log(err);
            showError("There was an error updating the meeting.");
          });
      }
    } else {
      setLoading(true);
      setEvents(transposeMeetingToEvent(meetings));
      setLoading(false);
    }
    setUpdateEvent(null);
    setShowParentWarning(false);
  };

  const handleEventDelete = async (id) => {
    try {
      // TODO implement
      handleModalClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setSelectedRange(null);
  };

  const handleCloseForm = () => {
    setSelectedEvent(null);
    setSelectedRange(null);
    setUpdate(false);
    setOpenMeetingDialog(false);
  };

  // if (loading) return <></>;
  return (
    <Grid height={"90%"} width={"100%"}>
      <Dialog
        open={openMeetingDialog}
        onClose={handleCloseForm}
        PaperProps={{
          style: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          },
        }}
      >
        <MeetingFourm
          date={selectedDate}
          meeting={
            selectedRange
              ? selectedRange
              : selectedEvent?.id
              ? selectedEvent?.extendedProps
              : selectedEvent
          }
          rooms={rooms}
          meetingTypes={meetingTypes}
          update={update}
          setUpdate={setUpdate}
          handleCloseForm={handleCloseForm}
          setUpdateTrigger={setUpdateTrigger}
          updateMode={updateMode}
          onClose={handleCloseForm}
        />
      </Dialog>
      <Dialog
        open={showParentWarning}
        onClose={() => setShowParentWarning(false)}
      >
        <MeetingUpdateWarning
          selectedEvent={selectedEvent}
          setShowParentWarning={setShowParentWarning}
          handleExit={handleExitWarning}
          room={
            rooms?.find((tp) => tp?.id == selectedEvent?.extendedProps?.room)
              ?.value
          }
          location={
            locations?.find(
              (tp) => tp?.officeid == selectedEvent?.extendedProps?.location
            )?.Alias
          }
          color={
            meetingTypes?.find(
              (tp) => tp?.id == selectedEvent?.extendedProps?.type
            )?.color
          }
        />
      </Dialog>

      {view ? (
        <CalendarStyled>
          <SubCard>
            <FullCalendar
              weekends
              editable
              droppable
              selectable
              events={events}
              ref={calendarRef}
              rerenderDelay={10}
              initialDate={selectedDate}
              initialView={defaultView}
              dayMaxEventRows={4}
              eventDisplay="block"
              headerToolbar={false}
              allDayMaintainDuration
              eventResizableFromStart
              select={handleRangeSelect}
              eventDrop={handleEventUpdate}
              eventClick={handleEventSelect}
              eventResize={handleEventUpdate}
              height={matchSm ? "100%" : 720}
              slotDuration="00:15:00" // The time slot size (15 minutes)
              snapDuration="00:15:00" // Drag and drop snaps to these increments
              plugins={[
                listPlugin,
                dayGridPlugin,
                timelinePlugin,
                timeGridPlugin,
                interactionPlugin,
              ]}
              dayCellDidMount={(info) => {
                if (info.view.type === "dayGridMonth") {
                  const plusIconContainer = document.createElement("div");
                  plusIconContainer.style.position = "absolute";
                  plusIconContainer.style.bottom = "4px";
                  plusIconContainer.style.right = "4px";
                  plusIconContainer.style.cursor = "pointer";
                  plusIconContainer.style.display = "none";
                  plusIconContainer.style.zIndex = "10";

                  // Render the React icon into the container
                  ReactDOM.createRoot(plusIconContainer).render(
                    <AddIcon fontSize="small" />
                  );

                  info.el.style.position = "relative";
                  info.el.appendChild(plusIconContainer);

                  info.el.addEventListener("mouseenter", () => {
                    plusIconContainer.style.display = "block";
                  });
                  info.el.addEventListener("mouseleave", () => {
                    plusIconContainer.style.display = "none";
                  });
                }
              }}
            />
          </SubCard>
        </CalendarStyled>
      ) : (
        <></>
      )}

      {/* Dialog renders its body even if not open */}
      <Dialog
        maxWidth="sm"
        fullWidth
        onClose={handleModalClose}
        open={isModalOpen}
        sx={{ "& .MuiDialog-paper": { p: 0 } }}
      >
        {isModalOpen && (
          <DisplayMeeting
            handleUpdateEvent={handleUpdateEvent}
            handleExit={handleModalClose}
            meeting={{
              ...selectedEvent?.extendedProps,
              start_time: selectedEvent.start,
              end_time: selectedEvent.end,
            }}
            types={meetingTypes}
            rooms={rooms}
            locations={locations}
            setUpdate={setUpdateTrigger}
            setUpdateMode={setUpdateMode}
          />
        )}
      </Dialog>
    </Grid>
  );
};

export default Calendar;
