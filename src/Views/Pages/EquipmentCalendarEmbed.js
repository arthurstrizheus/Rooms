import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Box,
    CircularProgress,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";

const EquipmentCalendarEmbed = () => {
    const { equipmentId } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const [checkouts, setCheckouts] = useState([]);
    const [dateRange, setDateRange] = useState({ start: null, end: null });
    const [error, setError] = useState(null);

    useEffect(() => {
        // Check if user is authenticated
        const token = localStorage.getItem("authToken");
        if (!token) {
            setError("Authentication required. Please log in first.");
            // Redirect to login after 2 seconds
            setTimeout(() => navigate("/login"), 2000);
        }
    }, [navigate]);

    const fetchCheckouts = async (start, end) => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(
                `/api/checkouts/equipment/${equipmentId}`,
                {
                    params: { start, end },
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            const formattedCheckouts = response.data
                .filter((checkout) => checkout.status !== "cancelled")
                .map((checkout) => ({
                    id: checkout.id,
                    title: checkout.scheduled_on_behalf_of
                        ? checkout.scheduled_on_behalf_of
                        : checkout.User
                          ? `${checkout.User.first_name} ${checkout.User.last_name}`
                          : "Unknown User",
                    start: checkout.start_time,
                    end: checkout.end_time,
                    backgroundColor:
                        checkout.status === "approved"
                            ? "#4caf50"
                            : checkout.status === "pending"
                              ? "#ff9800"
                              : checkout.status === "checked_out"
                                ? "#2196f3"
                                : checkout.status === "returned"
                                  ? "#9e9e9e"
                                  : "#f44336",
                    borderColor:
                        checkout.status === "approved"
                            ? "#388e3c"
                            : checkout.status === "pending"
                              ? "#f57c00"
                              : checkout.status === "checked_out"
                                ? "#1976d2"
                                : checkout.status === "returned"
                                  ? "#757575"
                                  : "#d32f2f",
                    extendedProps: {
                        status: checkout.status,
                        purpose: checkout.purpose,
                        user_id: checkout.user_id,
                        recurrence_id: checkout.recurrence_id,
                    },
                }));

            setCheckouts(formattedCheckouts);
        } catch (error) {
            console.error("Error fetching checkouts:", error);
            setError("Failed to load calendar data");
        }
    };

    if (error) {
        return (
            <Box
                sx={{
                    width: "100vw",
                    height: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "white",
                }}
            >
                <Typography color="error">{error}</Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                width: "100vw",
                height: "100vh",
                overflow: "hidden",
                backgroundColor: "white",
            }}
        >
            <FullCalendar
                key={checkouts.length}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={isMobile ? "timeGridWeek" : "dayGridMonth"}
                headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                editable={false}
                selectable={false}
                selectMirror={false}
                dayMaxEvents={true}
                weekends={true}
                events={checkouts}
                datesSet={(dateInfo) => {
                    const start = dateInfo.start.toISOString();
                    const end = dateInfo.end.toISOString();
                    setDateRange({ start, end });
                    fetchCheckouts(start, end);
                }}
                height="100vh"
                slotMinTime="06:00:00"
                slotMaxTime="20:00:00"
                eventMinHeight={20}
                slotEventOverlap={false}
                allDaySlot={false}
                eventClick={(info) => {
                    // Optionally show a simple tooltip or do nothing
                    info.jsEvent.preventDefault();
                }}
            />
        </Box>
    );
};

export default EquipmentCalendarEmbed;
