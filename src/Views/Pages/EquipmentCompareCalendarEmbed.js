import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Typography, useMediaQuery, useTheme, Chip } from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";

const EquipmentCompareCalendarEmbed = () => {
    const { equipmentId1, equipmentId2 } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const [equipment1, setEquipment1] = useState(null);
    const [equipment2, setEquipment2] = useState(null);
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
        } else {
            fetchEquipment1();
            fetchEquipment2();
        }
    }, [navigate, equipmentId1, equipmentId2]);

    const fetchEquipment1 = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(`/api/equipment/${equipmentId1}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEquipment1(response.data);
        } catch (error) {
            console.error("Error fetching equipment 1:", error);
            setError("Failed to load equipment data");
        }
    };

    const fetchEquipment2 = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(`/api/equipment/${equipmentId2}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEquipment2(response.data);
        } catch (error) {
            console.error("Error fetching equipment 2:", error);
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

            // Fetch checkouts for both equipment
            const [response1, response2] = await Promise.all([
                axios.get(`/api/checkouts/equipment/${equipmentId1}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params,
                }),
                axios.get(`/api/checkouts/equipment/${equipmentId2}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params,
                }),
            ]);

            // Combine and color-code events
            const events1 = response1.data
                .filter((c) => c.status !== "cancelled")
                .map((checkout) => ({
                    id: `eq1-${checkout.id}`,
                    title: `${equipment1?.name || "Equipment 1"}: ${
                        checkout.scheduled_on_behalf_of ||
                        (checkout.User
                            ? `${checkout.User.first_name} ${checkout.User.last_name}`
                            : "Checkout")
                    }${checkout.isRecurring ? " ↻" : ""}`,
                    start: checkout.start_time,
                    end: checkout.end_time,
                    backgroundColor: "#667eea", // Purple for equipment 1
                    borderColor: "#667eea",
                }));

            const events2 = response2.data
                .filter((c) => c.status !== "cancelled")
                .map((checkout) => ({
                    id: `eq2-${checkout.id}`,
                    title: `${equipment2?.name || "Equipment 2"}: ${
                        checkout.scheduled_on_behalf_of ||
                        (checkout.User
                            ? `${checkout.User.first_name} ${checkout.User.last_name}`
                            : "Checkout")
                    }${checkout.isRecurring ? " ↻" : ""}`,
                    start: checkout.start_time,
                    end: checkout.end_time,
                    backgroundColor: "#f093fb", // Pink for equipment 2
                    borderColor: "#f093fb",
                }));

            setCheckouts([...events1, ...events2]);
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
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Legend Bar */}
            <Box
                sx={{
                    display: "flex",
                    gap: 2,
                    p: 1,
                    backgroundColor: "#f5f5f5",
                    borderBottom: "1px solid #ddd",
                    justifyContent: "center",
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                        sx={{
                            width: 16,
                            height: 16,
                            backgroundColor: "#667eea",
                            borderRadius: 1,
                        }}
                    />
                    <Typography variant="caption">
                        {equipment1?.name || "Equipment 1"}
                    </Typography>
                    <Chip size="small" label={equipment1?.status || ""} />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                        sx={{
                            width: 16,
                            height: 16,
                            backgroundColor: "#f093fb",
                            borderRadius: 1,
                        }}
                    />
                    <Typography variant="caption">
                        {equipment2?.name || "Equipment 2"}
                    </Typography>
                    <Chip size="small" label={equipment2?.status || ""} />
                </Box>
            </Box>

            {/* Calendar */}
            <Box sx={{ flexGrow: 1, overflow: "auto" }}>
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
        </Box>
    );
};

export default EquipmentCompareCalendarEmbed;
