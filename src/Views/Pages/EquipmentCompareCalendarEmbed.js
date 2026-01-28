import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Typography, useMediaQuery, useTheme, Chip } from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";

// Color palette for multiple equipment
const COLOR_PALETTE = [
    "#667eea", // Purple
    "#f093fb", // Pink
    "#4facfe", // Blue
    "#43e97b", // Green
    "#fa709a", // Rose
    "#fee140", // Yellow
    "#30cfd0", // Cyan
    "#a8edea", // Mint
    "#ff9a56", // Orange
    "#b490ca", // Lavender
    "#f5576c", // Red
    "#4fd1c5", // Teal
];

const EquipmentCompareCalendarEmbed = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    // Parse equipment IDs from query params
    const equipmentIds =
        searchParams
            .get("ids")
            ?.split(",")
            .map((id) => parseInt(id))
            .filter((id) => !isNaN(id)) || [];

    const [equipmentList, setEquipmentList] = useState([]);
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
        } else if (equipmentIds.length === 0) {
            setError("No equipment selected for comparison");
        } else {
            fetchAllEquipment();
        }
    }, [navigate, searchParams]);

    // Refetch checkouts when equipment list changes
    useEffect(() => {
        if (equipmentList.length > 0 && dateRange.start && dateRange.end) {
            fetchCheckouts(dateRange.start, dateRange.end);
        }
    }, [equipmentList]);

    const fetchAllEquipment = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const promises = equipmentIds.map((id) =>
                axios.get(`/api/equipment/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            );
            const responses = await Promise.all(promises);
            // Filter out equipment where can_book is false
            const validEquipment = responses
                .map((r) => r.data)
                .filter((eq) => eq.can_book !== false);
            setEquipmentList(validEquipment);
        } catch (error) {
            console.error("Error fetching equipment:", error);
            setError("Failed to load equipment data");
        }
    };

    const fetchCheckouts = async (start, end) => {
        try {
            const token = localStorage.getItem("authToken");

            // Build query params
            const params = {};
            if (start) params.start = start;
            if (end) params.end = end;

            // Fetch checkouts for all equipment
            const promises = equipmentIds.map((id) =>
                axios.get(`/api/checkouts/equipment/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params,
                }),
            );

            const responses = await Promise.all(promises);

            // Combine and color-code events
            const allEvents = responses.flatMap((response, index) => {
                const equipmentId = equipmentIds[index];
                const equipment = equipmentList[index];
                const color = COLOR_PALETTE[index % COLOR_PALETTE.length];

                return response.data
                    .filter((c) => c.status !== "cancelled")
                    .map((checkout) => ({
                        id: `eq${equipmentId}-${checkout.id}`,
                        title: `${equipment?.name || `Equipment ${index + 1}`}: ${
                            checkout.scheduled_on_behalf_of ||
                            (checkout.User
                                ? `${checkout.User.first_name} ${checkout.User.last_name}`
                                : "Checkout")
                        }${checkout.isRecurring ? " ↻" : ""}`,
                        start: checkout.start_time,
                        end: checkout.end_time,
                        backgroundColor: color,
                        borderColor: color,
                    }));
            });

            setCheckouts(allEvents);
        } catch (error) {
            console.error("Error fetching checkouts:", error);
            setError("Failed to load checkout data");
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
            {/* Calendar Only - No Legend */}
            <FullCalendar
                key={checkouts.length}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={isMobile ? "timeGridDay" : "dayGridMonth"}
                headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: isMobile
                        ? "timeGridDay"
                        : "dayGridMonth,timeGridWeek,timeGridDay",
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
                height="100%"
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                eventMinHeight={20}
                slotEventOverlap={true}
                allDaySlot={false}
                eventClick={(info) => {
                    // Prevent default action
                    info.jsEvent.preventDefault();
                }}
            />
        </Box>
    );
};

export default EquipmentCompareCalendarEmbed;
