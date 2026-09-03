import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Typography, Stack, Alert } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";

import useResponsive from "../../hooks/useResponsive";
import "../Components/UI/fullcalendar.css";

// Matches the status colors used on the in-app calendars, so an embedded
// schedule reads the same as the one inside the product.
const STATUS_COLORS = {
    "auto-approved": "#1E9E52",
    pending: "#C77700",
    reserved: "#1F6FD0",
    returned: "#A6ADBA",
};
const CANCELLED_COLOR = "#C8102E";

/** Read-only equipment schedule, for embedding in another site via iframe. */
const EquipmentCalendarEmbed = () => {
    const { equipmentId } = useParams();
    const navigate = useNavigate();
    const { isCompact } = useResponsive();
    const [checkouts, setCheckouts] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!localStorage.getItem("authToken")) {
            setError("Authentication required — please sign in first.");
            const timer = setTimeout(() => navigate("/login"), 2000);
            return () => clearTimeout(timer);
        }
        return undefined;
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

            setCheckouts(
                response.data
                    .filter((checkout) => checkout.status !== "cancelled")
                    .map((checkout) => {
                        const color =
                            STATUS_COLORS[checkout.status] || CANCELLED_COLOR;
                        return {
                            id: checkout.id,
                            title:
                                checkout.scheduled_on_behalf_of ||
                                (checkout.User
                                    ? `${checkout.User.first_name} ${checkout.User.last_name}`
                                    : "Unknown user"),
                            start: checkout.start_time,
                            end: checkout.end_time,
                            backgroundColor: color,
                            borderColor: color,
                            extendedProps: {
                                status: checkout.status,
                                notes: checkout.notes,
                                user_id: checkout.user_id,
                                recurrence_id: checkout.recurrence_id,
                            },
                        };
                    }),
            );
        } catch (err) {
            console.error("Error fetching checkouts:", err);
            setError("Failed to load calendar data.");
        }
    };

    if (error) {
        return (
            <Box
                sx={{
                    minHeight: "100dvh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 3,
                    bgcolor: "background.default",
                }}
            >
                <Stack alignItems="center" spacing={2}>
                    <LockOutlinedIcon
                        sx={{ fontSize: 36, color: "text.disabled" }}
                    />
                    <Alert severity="error" sx={{ boxShadow: "none" }}>
                        <Typography variant="body2">{error}</Typography>
                    </Alert>
                </Stack>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                minHeight: "100dvh",
                p: { xs: 1, sm: 2 },
                bgcolor: "background.paper",
            }}
        >
            <FullCalendar
                key={checkouts.length}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={isCompact ? "timeGridWeek" : "dayGridMonth"}
                headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: isCompact
                        ? "timeGridWeek,timeGridDay"
                        : "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                editable={false}
                selectable={false}
                selectMirror={false}
                dayMaxEvents
                weekends
                events={checkouts}
                datesSet={(dateInfo) =>
                    fetchCheckouts(
                        dateInfo.start.toISOString(),
                        dateInfo.end.toISOString(),
                    )
                }
                height="auto"
                slotMinTime="06:00:00"
                slotMaxTime="20:00:00"
                eventMinHeight={20}
                slotEventOverlap={false}
                allDaySlot={false}
                // Read-only: swallow the click so events don't look actionable.
                eventClick={(info) => info.jsEvent.preventDefault()}
            />
        </Box>
    );
};

export default EquipmentCalendarEmbed;
