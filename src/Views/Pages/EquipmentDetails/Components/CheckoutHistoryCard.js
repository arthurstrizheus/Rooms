import React, { useMemo, useState } from "react";
import {
    Card,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Box,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    TextField,
    MenuItem,
    Stack,
    Button,
    Avatar,
    Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RepeatIcon from "@mui/icons-material/Repeat";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import { format } from "date-fns";

import useEasterEggs from "../../../../hooks/useEasterEggs";
import MeatRain from "../../../../Components/EasterEggs/MeatRain";
import HiggyRain from "../../../../Components/EasterEggs/HiggyRain";
import AddToCalendarButton from "../../../../Components/AddToCalendarButton";
import useResponsive from "../../../../hooks/useResponsive";
import SectionCard from "../../../Components/UI/SectionCard";
import EmptyState from "../../../Components/UI/EmptyState";
import StatusChip from "../../../Components/UI/StatusChip";
import DetailField from "../../../Components/UI/DetailField";
import FilterBar from "../../../Components/UI/FilterBar";
import ResponsiveDialog from "../../../Components/UI/ResponsiveDialog";
import { Stagger } from "../../../Components/UI/motion";

const STATUS_OPTIONS = [
    { value: "all", label: "All statuses" },
    { value: "pending", label: "Pending" },
    { value: "auto-approved", label: "Approved" },
    { value: "reserved", label: "In use" },
    { value: "returned", label: "Returned" },
    { value: "cancelled", label: "Cancelled" },
];

const userLabel = (checkout) =>
    checkout.User
        ? `${checkout.User.first_name} ${checkout.User.last_name}`
        : "N/A";

const initialsOf = (name) =>
    name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();

/**
 * Reservation history for one piece of equipment.
 *
 * Recurring and one-time reservations render through the same `HistorySection`
 * — previously each had its own copy of a table plus its own mobile card, four
 * near-identical blocks in total.
 */
// Status colors now come from the shared StatusChip vocabulary rather than a
// per-page color function.
const CheckoutHistoryCard = ({ checkoutHistory }) => {
    const { meatRain, higgyRain, handleSearchChange } = useEasterEggs();
    const { isCompact } = useResponsive();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedCheckout, setSelectedCheckout] = useState(null);

    // Virtual occurrences (string ids containing "_") are expansions of a
    // recurrence and would duplicate their parent, so they're dropped.
    const { recurringCheckouts, nonRecurringCheckouts } = useMemo(() => {
        const recurring = [];
        const nonRecurring = [];

        checkoutHistory.forEach((checkout) => {
            const isVirtual =
                typeof checkout.id === "string" && checkout.id.includes("_");
            if (isVirtual) return;
            if (checkout.recurrence_id) recurring.push(checkout);
            else nonRecurring.push(checkout);
        });

        return {
            recurringCheckouts: recurring,
            nonRecurringCheckouts: nonRecurring,
        };
    }, [checkoutHistory]);

    const filterCheckouts = (checkouts) =>
        checkouts.filter((checkout) => {
            const search = searchTerm.toLowerCase();
            const matchesSearch =
                userLabel(checkout).toLowerCase().includes(search) ||
                checkout.notes?.toLowerCase().includes(search) ||
                checkout.project_number?.toLowerCase().includes(search) ||
                checkout.status?.toLowerCase().includes(search);
            const matchesStatus =
                statusFilter === "all" || checkout.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

    const filteredRecurring = useMemo(
        () => filterCheckouts(recurringCheckouts),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [recurringCheckouts, searchTerm, statusFilter],
    );

    const filteredNonRecurring = useMemo(
        () => filterCheckouts(nonRecurringCheckouts),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [nonRecurringCheckouts, searchTerm, statusFilter],
    );

    const getRecurrenceDescription = (checkout) => {
        if (!checkout.repeats) return "Unknown pattern";

        const pattern = checkout.repeats.toLowerCase();
        const recurrence = checkout.Recurrence;
        if (!recurrence) return `Repeats ${pattern}`;

        const interval = recurrence.separation_count || 1;
        const unit =
            pattern === "daily"
                ? "day"
                : pattern === "weekly"
                  ? "week"
                  : pattern === "monthly"
                    ? "month"
                    : pattern;

        const every =
            interval > 1 ? `Every ${interval} ${unit}s` : `Every ${unit}`;

        return recurrence.end_date
            ? `${every} until ${format(new Date(recurrence.end_date), "PP")}`
            : `${every} (indefinite)`;
    };

    // ---- One row shape, both sections -------------------------------------

    const MobileCard = ({ checkout, recurring }) => (
        <Card
            onClick={() => setSelectedCheckout(checkout)}
            sx={{
                mb: 1.5,
                p: 2,
                cursor: "pointer",
                transition: "border-color 160ms ease, transform 160ms ease",
                "&:active": { transform: "scale(0.99)" },
                "@media (hover: hover)": {
                    "&:hover": { borderColor: "grey.300" },
                },
            }}
        >
            <Stack direction="row" spacing={1.25} alignItems="flex-start">
                <Avatar sx={{ width: 30, height: 30, fontSize: "0.6875rem" }}>
                    {initialsOf(userLabel(checkout))}
                </Avatar>

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography
                            variant="subtitle2"
                            sx={{ flexGrow: 1, minWidth: 0 }}
                            noWrap
                        >
                            {userLabel(checkout)}
                        </Typography>
                        <StatusChip status={checkout.status} />
                    </Stack>

                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.25 }}
                    >
                        {recurring
                            ? format(new Date(checkout.start_time), "Pp")
                            : `${format(new Date(checkout.start_time), "Pp")} – ${format(
                                  new Date(checkout.end_time),
                                  "p",
                              )}`}
                    </Typography>

                    {recurring && (
                        <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                            sx={{ mt: 0.75 }}
                        >
                            <RepeatIcon
                                sx={{ fontSize: 14, color: "text.disabled" }}
                            />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                {getRecurrenceDescription(checkout)}
                            </Typography>
                        </Stack>
                    )}

                    {(checkout.notes || checkout.project_number) && (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.75 }}
                            noWrap
                        >
                            {[checkout.project_number, checkout.notes]
                                .filter(Boolean)
                                .join(" · ")}
                        </Typography>
                    )}
                </Box>
            </Stack>
        </Card>
    );

    const HistorySection = ({ title, icon, checkouts, recurring, defaultExpanded }) => {
        if (checkouts.length === 0) return null;

        return (
            <Accordion defaultExpanded={defaultExpanded}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        {icon}
                        <Typography variant="subtitle2">
                            {title} ({checkouts.length})
                        </Typography>
                    </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ px: { xs: 1.5, sm: 2 }, pb: 2 }}>
                    {isCompact ? (
                        <Stagger step={35} max={10}>
                            {checkouts.map((checkout) => (
                                <MobileCard
                                    key={checkout.id}
                                    checkout={checkout}
                                    recurring={recurring}
                                />
                            ))}
                        </Stagger>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>User</TableCell>
                                        <TableCell>
                                            {recurring
                                                ? "First occurrence"
                                                : "Start"}
                                        </TableCell>
                                        <TableCell>
                                            {recurring ? "Pattern" : "End"}
                                        </TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Purpose</TableCell>
                                        <TableCell>Project #</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {checkouts.map((checkout, index) => (
                                        <TableRow
                                            key={checkout.id}
                                            hover
                                            onClick={() =>
                                                setSelectedCheckout(checkout)
                                            }
                                            sx={{
                                                cursor: "pointer",
                                                animation:
                                                    "seaFadeIn 240ms ease both",
                                                animationDelay: `${Math.min(index, 15) * 18}ms`,
                                            }}
                                        >
                                            <TableCell>
                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    alignItems="center"
                                                >
                                                    <Avatar
                                                        sx={{
                                                            width: 24,
                                                            height: 24,
                                                            fontSize:
                                                                "0.625rem",
                                                        }}
                                                    >
                                                        {initialsOf(
                                                            userLabel(checkout),
                                                        )}
                                                    </Avatar>
                                                    <Typography variant="body2">
                                                        {userLabel(checkout)}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell
                                                sx={{ whiteSpace: "nowrap" }}
                                            >
                                                {format(
                                                    new Date(
                                                        checkout.start_time,
                                                    ),
                                                    "Pp",
                                                )}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    whiteSpace: recurring
                                                        ? "normal"
                                                        : "nowrap",
                                                    color: recurring
                                                        ? "text.secondary"
                                                        : "inherit",
                                                }}
                                            >
                                                {recurring
                                                    ? getRecurrenceDescription(
                                                          checkout,
                                                      )
                                                    : format(
                                                          new Date(
                                                              checkout.end_time,
                                                          ),
                                                          "Pp",
                                                      )}
                                            </TableCell>
                                            <TableCell>
                                                <StatusChip
                                                    status={checkout.status}
                                                />
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    maxWidth: 220,
                                                    color: "text.secondary",
                                                }}
                                            >
                                                <Tooltip
                                                    title={checkout.notes || ""}
                                                    disableHoverListener={
                                                        !checkout.notes
                                                    }
                                                >
                                                    <Typography
                                                        variant="body2"
                                                        component="span"
                                                        noWrap
                                                        sx={{
                                                            display: "block",
                                                        }}
                                                    >
                                                        {checkout.notes || "—"}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>
                                                {checkout.project_number || "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </AccordionDetails>
            </Accordion>
        );
    };

    const nothingMatches =
        filteredRecurring.length === 0 && filteredNonRecurring.length === 0;

    return (
        <>
            {meatRain && <MeatRain />}
            {higgyRain && <HiggyRain />}

            <SectionCard
                title="Reservation history"
                subtitle={`${recurringCheckouts.length + nonRecurringCheckouts.length} total`}
                icon={<HistoryOutlinedIcon />}
            >
                <FilterBar
                    search={searchTerm}
                    onSearchChange={(value) =>
                        handleSearchChange(value, setSearchTerm)
                    }
                    searchPlaceholder="Search user, purpose, project #…"
                    activeFilters={
                        statusFilter !== "all"
                            ? [
                                  {
                                      key: "status",
                                      label:
                                          STATUS_OPTIONS.find(
                                              (o) => o.value === statusFilter,
                                          )?.label || statusFilter,
                                      onClear: () => setStatusFilter("all"),
                                  },
                              ]
                            : []
                    }
                    sx={{ mb: 2 }}
                >
                    <TextField
                        select
                        label="Status"
                        size="small"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        sx={{ minWidth: 160 }}
                    >
                        {STATUS_OPTIONS.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                                {o.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </FilterBar>

                {checkoutHistory.length === 0 ? (
                    <EmptyState
                        variant="compact"
                        icon={<EventNoteOutlinedIcon />}
                        title="No reservation history"
                        description="Reservations for this equipment will show up here."
                    />
                ) : nothingMatches ? (
                    <EmptyState
                        variant="compact"
                        title="No matching reservations"
                        description="Try a different search or clear the status filter."
                    />
                ) : (
                    <Stack spacing={1}>
                        <HistorySection
                            title="Recurring reservations"
                            icon={<RepeatIcon sx={{ fontSize: 17 }} />}
                            checkouts={filteredRecurring}
                            recurring
                            defaultExpanded
                        />
                        <HistorySection
                            title="One-time reservations"
                            icon={
                                <EventNoteOutlinedIcon sx={{ fontSize: 17 }} />
                            }
                            checkouts={filteredNonRecurring}
                            defaultExpanded={filteredRecurring.length === 0}
                        />
                    </Stack>
                )}
            </SectionCard>

            {/* ---- Detail dialog ---- */}
            <ResponsiveDialog
                open={Boolean(selectedCheckout)}
                onClose={() => setSelectedCheckout(null)}
                title="Reservation details"
                subtitle={
                    selectedCheckout ? userLabel(selectedCheckout) : undefined
                }
                icon={<EventNoteOutlinedIcon />}
                maxWidth="sm"
                actions={
                    <>
                        <AddToCalendarButton checkout={selectedCheckout} />
                        <Button
                            onClick={() => setSelectedCheckout(null)}
                            variant="contained"
                        >
                            Close
                        </Button>
                    </>
                }
            >
                {selectedCheckout && (
                    <Stack spacing={2.25}>
                        <DetailField
                            label="User"
                            value={userLabel(selectedCheckout)}
                        />

                        <DetailField label="Status">
                            <Box sx={{ mt: 0.5 }}>
                                <StatusChip status={selectedCheckout.status} />
                            </Box>
                        </DetailField>

                        {selectedCheckout.recurrence_id ? (
                            <>
                                <DetailField
                                    label="First occurrence"
                                    value={format(
                                        new Date(selectedCheckout.start_time),
                                        "PPpp",
                                    )}
                                />
                                <DetailField label="Recurrence pattern">
                                    <Stack
                                        direction="row"
                                        spacing={0.75}
                                        alignItems="center"
                                        sx={{ mt: 0.25 }}
                                    >
                                        <RepeatIcon
                                            sx={{
                                                fontSize: 16,
                                                color: "text.disabled",
                                            }}
                                        />
                                        <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 550 }}
                                        >
                                            {getRecurrenceDescription(
                                                selectedCheckout,
                                            )}
                                        </Typography>
                                    </Stack>
                                </DetailField>
                            </>
                        ) : (
                            <>
                                <DetailField
                                    label="Start time"
                                    value={format(
                                        new Date(selectedCheckout.start_time),
                                        "PPpp",
                                    )}
                                />
                                <DetailField
                                    label="End time"
                                    value={format(
                                        new Date(selectedCheckout.end_time),
                                        "PPpp",
                                    )}
                                />
                            </>
                        )}

                        <DetailField
                            label="Purpose"
                            value={selectedCheckout.notes}
                        />
                        <DetailField
                            label="Project number"
                            value={selectedCheckout.project_number}
                        />
                    </Stack>
                )}
            </ResponsiveDialog>
        </>
    );
};

export default CheckoutHistoryCard;
