import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Typography, Stack, Chip, Alert } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";

import useResponsive from "../../hooks/useResponsive";
import { equipmentColor } from "../Components/UI/equipmentPalette";
import "../Components/UI/fullcalendar.css";

/**
 * Read-only comparison calendar for embedding elsewhere.
 *
 * Unlike the in-app version this has no controls — but it does now show a
 * legend, since without one the event colors are unreadable to someone who
 * didn't build the URL.
 */
const EquipmentCompareCalendarEmbed = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { isCompact } = useResponsive();

    const equipmentIds =
        searchParams
            .get("ids")
            ?.split(",")
            .map((id) => parseInt(id, 10))
            .filter((id) => !Number.isNaN(id)) || [];

    const [equipmentList, setEquipmentList] = useState([]);
    const [checkouts, setCheckouts] = useState([]);
    const [dateRange, setDateRange] = useState({ start: null, end: null });
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!localStorage.getItem("authToken")) {
            setError("Authentication required — please sign in first.");
            const timer = setTimeout(() => navigate("/login"), 2000);
            return () => clearTimeout(timer);
        }
        if (equipmentIds.length === 0) {
            setError("No equipment selected for comparison.");
            return undefined;
        }
        fetchAllEquipment();
        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate, searchParams]);

    useEffect(() => {
        if (equipmentList.length > 0 && dateRange.start && dateRange.end) {
            fetchCheckouts(dateRange.start, dateRange.end);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equipmentList]);

    const authHeaders = () => ({
        headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
    });

    const fetchAllEquipment = async () => {
        try {
            const responses = await Promise.all(
                equipmentIds.map((id) =>
                    axios.get(`/api/equipment/${id}`, authHeaders()),
                ),
            );
            setEquipmentList(
                responses.map((r) => r.data).filter((eq) => eq.can_book !== false),
            );
        } catch (err) {
            console.error("Error fetching equipment:", err);
            setError("Failed to load equipment data.");
        }
    };

    const fetchCheckouts = async (start, end) => {
        try {
            const params = {};
            if (start) params.start = start;
            if (end) params.end = end;

            const responses = await Promise.all(
                equipmentIds.map((id) =>
                    axios.get(`/api/checkouts/equipment/${id}`, {
                        ...authHeaders(),
                        params,
                    }),
                ),
            );

            setCheckouts(
                responses.flatMap((response, index) => {
                    const equipmentId = equipmentIds[index];
                    const equipment = equipmentList[index];
                    const color = equipmentColor(index);

                    return response.data
                        .filter((c) => c.status !== "cancelled")
                        .map((checkout) => {
                            const who =
                                checkout.scheduled_on_behalf_of ||
                                (checkout.User
                                    ? `${checkout.User.first_name} ${checkout.User.last_name}`
                                    : "Checkout");

                            return {
                                id: `eq${equipmentId}-${checkout.id}`,
                                title: `${
                                    equipment?.name || `Equipment ${index + 1}`
                                }: ${who}${checkout.isRecurring ? " ↻" : ""}`,
                                start: checkout.start_time,
                                end: checkout.end_time,
                                backgroundColor: color,
                                borderColor: color,
                            };
                        });
                }),
            );
        } catch (err) {
            console.error("Error fetching checkouts:", err);
            setError("Failed to load reservation data.");
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
            {equipmentList.length > 0 && (
                <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{ mb: 1.5, flexWrap: "wrap", gap: 0.75 }}
                >
                    {equipmentList.map((equipment, index) => (
                        <Chip
                            key={equipment.id}
                            size="small"
                            variant="outlined"
                            icon={
                                <Box
                                    component="span"
                                    sx={{
                                        width: 9,
                                        height: 9,
                                        borderRadius: "3px",
                                        bgcolor: equipmentColor(index),
                                        ml: "9px !important",
                                        mr: "-3px !important",
                                        flexShrink: 0,
                                    }}
                                />
                            }
                            label={equipment.name}
                        />
                    ))}
                </Stack>
            )}

            <FullCalendar
                key={checkouts.length}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={isCompact ? "timeGridDay" : "dayGridMonth"}
                headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: isCompact
                        ? "timeGridDay"
                        : "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                editable={false}
                selectable={false}
                selectMirror={false}
                dayMaxEvents
                weekends
                events={checkouts}
                datesSet={(dateInfo) => {
                    const start = dateInfo.start.toISOString();
                    const end = dateInfo.end.toISOString();
                    setDateRange({ start, end });
                    fetchCheckouts(start, end);
                }}
                height="auto"
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                eventMinHeight={20}
                slotEventOverlap
                allDaySlot={false}
                eventClick={(info) => info.jsEvent.preventDefault()}
            />
        </Box>
    );
};

export default EquipmentCompareCalendarEmbed;
