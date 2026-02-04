import React, { useMemo, useState } from "react";
import {
    Card,
    CardContent,
    Typography,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Box,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    TextField,
    MenuItem,
    InputAdornment,
    useMediaQuery,
    useTheme,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from "@mui/material";
import useEasterEggs from "../../../../hooks/useEasterEggs";
import MeatRain from "../../../../Components/EasterEggs/MeatRain";
import HiggyRain from "../../../../Components/EasterEggs/HiggyRain";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RepeatIcon from "@mui/icons-material/Repeat";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { format } from "date-fns";

const CheckoutHistoryCard = ({ checkoutHistory, getCheckoutStatusColor }) => {
    const { meatRain, higgyRain, handleSearchChange } = useEasterEggs();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedCheckout, setSelectedCheckout] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleCardClick = (checkout) => {
        setSelectedCheckout(checkout);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedCheckout(null);
    };

    // Separate recurring and non-recurring checkouts
    const { recurringCheckouts, nonRecurringCheckouts } = useMemo(() => {
        const recurring = [];
        const nonRecurring = [];
        const recurringGroups = new Map();

        checkoutHistory.forEach((checkout) => {
            // Check if this is a recurring checkout (has recurrence_id)
            // But exclude virtual occurrences (IDs with underscore)
            const isVirtualOccurrence =
                typeof checkout.id === "string" && checkout.id.includes("_");

            if (checkout.recurrence_id && !isVirtualOccurrence) {
                // This is a base recurring checkout
                recurring.push(checkout);
            } else if (!checkout.recurrence_id && !isVirtualOccurrence) {
                // Regular non-recurring checkout
                nonRecurring.push(checkout);
            }
            // Skip virtual occurrences entirely
        });

        return {
            recurringCheckouts: recurring,
            nonRecurringCheckouts: nonRecurring,
        };
    }, [checkoutHistory]);

    // Filter checkouts based on search and status
    const filterCheckouts = (checkouts) => {
        return checkouts.filter((checkout) => {
            const search = searchTerm.toLowerCase();
            const userName = checkout.User
                ? `${checkout.User.first_name} ${checkout.User.last_name}`.toLowerCase()
                : "";
            const matchesSearch =
                userName.includes(search) ||
                checkout.notes?.toLowerCase().includes(search) ||
                checkout.project_number?.toLowerCase().includes(search) ||
                checkout.status?.toLowerCase().includes(search);
            const matchesStatus =
                statusFilter === "all" || checkout.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    };

    const filteredRecurring = useMemo(
        () => filterCheckouts(recurringCheckouts),
        [recurringCheckouts, searchTerm, statusFilter],
    );

    const filteredNonRecurring = useMemo(
        () => filterCheckouts(nonRecurringCheckouts),
        [nonRecurringCheckouts, searchTerm, statusFilter],
    );

    const getRecurrenceDescription = (checkout) => {
        if (!checkout.repeats) return "Unknown pattern";

        const pattern = checkout.repeats.toLowerCase();
        const recurrence = checkout.Recurrence;

        if (!recurrence) {
            return `Repeats ${pattern}`;
        }

        const interval = recurrence.separation_count || 1;
        let description = `Every `;

        if (interval > 1) {
            description += `${interval} `;
        }

        description +=
            pattern === "daily"
                ? "day(s)"
                : pattern === "weekly"
                  ? "week(s)"
                  : pattern === "monthly"
                    ? "month(s)"
                    : pattern;

        if (recurrence.end_date) {
            description += ` until ${format(
                new Date(recurrence.end_date),
                "PP",
            )}`;
        } else {
            description += ` (indefinite)`;
        }

        return description;
    };

    const renderRecurringMobileCard = (checkout) => (
        <Card
            key={checkout.id}
            sx={{ mb: 2, cursor: "pointer", "&:hover": { boxShadow: 3 } }}
            onClick={() => handleCardClick(checkout)}
        >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "start",
                        mb: 1,
                    }}
                >
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                            {checkout.User
                                ? `${checkout.User.first_name} ${checkout.User.last_name}`
                                : "N/A"}
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                        >
                            {format(new Date(checkout.start_time), "Pp")}
                        </Typography>
                    </Box>
                    <Chip
                        label={checkout.status}
                        color={getCheckoutStatusColor(checkout.status)}
                        size="small"
                    />
                </Box>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        mb: 1,
                    }}
                >
                    <RepeatIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                        {getRecurrenceDescription(checkout)}
                    </Typography>
                </Box>
                {checkout.notes && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                    >
                        <strong>Purpose:</strong> {checkout.notes}
                    </Typography>
                )}
                {checkout.project_number && (
                    <Typography variant="body2" color="text.secondary">
                        <strong>Project #:</strong> {checkout.project_number}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );

    const renderNonRecurringMobileCard = (checkout) => (
        <Card
            key={checkout.id}
            sx={{ mb: 2, cursor: "pointer", "&:hover": { boxShadow: 3 } }}
            onClick={() => handleCardClick(checkout)}
        >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "start",
                        mb: 1,
                    }}
                >
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                            {checkout.User
                                ? `${checkout.User.first_name} ${checkout.User.last_name}`
                                : "N/A"}
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                        >
                            {format(new Date(checkout.start_time), "Pp")} -{" "}
                            {format(new Date(checkout.end_time), "p")}
                        </Typography>
                    </Box>
                    <Chip
                        label={checkout.status}
                        color={getCheckoutStatusColor(checkout.status)}
                        size="small"
                    />
                </Box>
                {checkout.notes && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                    >
                        <strong>Purpose:</strong> {checkout.notes}
                    </Typography>
                )}
                {checkout.project_number && (
                    <Typography variant="body2" color="text.secondary">
                        <strong>Project #:</strong> {checkout.project_number}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );

    return (
        <>
            {/* Easter Eggs */}
            {meatRain && <MeatRain />}
            {higgyRain && <HiggyRain />}
            <Dialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                fullScreen={isMobile}
            >
                <DialogTitle
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <Typography variant="h6">Reservation Details</Typography>
                    <Button
                        onClick={handleCloseDialog}
                        color="inherit"
                        sx={{ minWidth: "auto", p: 0.5 }}
                    >
                        <CloseIcon />
                    </Button>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedCheckout && (
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                            }}
                        >
                            <Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    User
                                </Typography>
                                <Typography variant="body1">
                                    {selectedCheckout.User
                                        ? `${selectedCheckout.User.first_name} ${selectedCheckout.User.last_name}`
                                        : "N/A"}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Status
                                </Typography>
                                <Box sx={{ mt: 0.5 }}>
                                    <Chip
                                        label={selectedCheckout.status}
                                        color={getCheckoutStatusColor(
                                            selectedCheckout.status,
                                        )}
                                        size="small"
                                    />
                                </Box>
                            </Box>

                            {selectedCheckout.recurrence_id ? (
                                <>
                                    <Box>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            First Occurrence
                                        </Typography>
                                        <Typography variant="body1">
                                            {format(
                                                new Date(
                                                    selectedCheckout.start_time,
                                                ),
                                                "PPpp",
                                            )}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            Recurrence Pattern
                                        </Typography>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                                mt: 0.5,
                                            }}
                                        >
                                            <RepeatIcon
                                                fontSize="small"
                                                color="action"
                                            />
                                            <Typography variant="body1">
                                                {getRecurrenceDescription(
                                                    selectedCheckout,
                                                )}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </>
                            ) : (
                                <>
                                    <Box>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            Start Time
                                        </Typography>
                                        <Typography variant="body1">
                                            {format(
                                                new Date(
                                                    selectedCheckout.start_time,
                                                ),
                                                "PPpp",
                                            )}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            End Time
                                        </Typography>
                                        <Typography variant="body1">
                                            {format(
                                                new Date(
                                                    selectedCheckout.end_time,
                                                ),
                                                "PPpp",
                                            )}
                                        </Typography>
                                    </Box>
                                </>
                            )}

                            <Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Purpose
                                </Typography>
                                <Typography variant="body1">
                                    {selectedCheckout.notes || ""}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Project Number
                                </Typography>
                                <Typography variant="body1">
                                    {selectedCheckout.project_number || ""}
                                </Typography>
                            </Box>

                            {selectedCheckout.notes && (
                                <Box>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Notes
                                    </Typography>
                                    <Typography variant="body1">
                                        {selectedCheckout.notes}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} variant="contained">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Reservation History
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    {/* Search and Filter */}
                    <Box
                        sx={{
                            display: "flex",
                            gap: 2,
                            mb: 2,
                            flexDirection: isMobile ? "column" : "row",
                        }}
                    >
                        <TextField
                            placeholder="Search by user, notes, project #..."
                            value={searchTerm}
                            onChange={(e) =>
                                handleSearchChange(
                                    e.target.value,
                                    setSearchTerm,
                                )
                            }
                            size="small"
                            fullWidth={isMobile}
                            sx={{ flex: isMobile ? 1 : "0 0 300px" }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            select
                            label="Status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            size="small"
                            fullWidth={isMobile}
                            sx={{ flex: isMobile ? 1 : "0 0 150px" }}
                        >
                            <MenuItem value="all">All Status</MenuItem>
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="auto-approved">Approved</MenuItem>
                            <MenuItem value="reserved">In Use</MenuItem>
                            <MenuItem value="returned">Returned</MenuItem>
                            <MenuItem value="cancelled">Cancelled</MenuItem>
                        </TextField>
                    </Box>

                    {checkoutHistory.length === 0 ? (
                        <Typography align="center" color="text.secondary">
                            No reservation history
                        </Typography>
                    ) : filteredRecurring.length === 0 &&
                      filteredNonRecurring.length === 0 ? (
                        <Typography
                            align="center"
                            color="text.secondary"
                            sx={{ py: 3 }}
                        >
                            No reservations match your search criteria
                        </Typography>
                    ) : (
                        <Box>
                            {/* Recurring Checkouts Section */}
                            {filteredRecurring.length > 0 && (
                                <Accordion defaultExpanded>
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                    >
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                            }}
                                        >
                                            <RepeatIcon fontSize="small" />
                                            <Typography variant="subtitle1">
                                                Recurring Reservations (
                                                {filteredRecurring.length})
                                            </Typography>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        {isMobile ? (
                                            <Box>
                                                {filteredRecurring.map(
                                                    (checkout) =>
                                                        renderRecurringMobileCard(
                                                            checkout,
                                                        ),
                                                )}
                                            </Box>
                                        ) : (
                                            <TableContainer>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>
                                                                User
                                                            </TableCell>
                                                            <TableCell>
                                                                First Occurrence
                                                            </TableCell>
                                                            <TableCell>
                                                                Pattern
                                                            </TableCell>
                                                            <TableCell>
                                                                Status
                                                            </TableCell>
                                                            <TableCell>
                                                                Purpose
                                                            </TableCell>
                                                            <TableCell>
                                                                Project #
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {filteredRecurring.map(
                                                            (checkout) => (
                                                                <TableRow
                                                                    key={
                                                                        checkout.id
                                                                    }
                                                                >
                                                                    <TableCell>
                                                                        {checkout.User
                                                                            ? `${checkout.User.first_name} ${checkout.User.last_name}`
                                                                            : "N/A"}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {format(
                                                                            new Date(
                                                                                checkout.start_time,
                                                                            ),
                                                                            "Pp",
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Typography
                                                                            variant="body2"
                                                                            color="text.secondary"
                                                                        >
                                                                            {getRecurrenceDescription(
                                                                                checkout,
                                                                            )}
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip
                                                                            label={
                                                                                checkout.status
                                                                            }
                                                                            color={getCheckoutStatusColor(
                                                                                checkout.status,
                                                                            )}
                                                                            size="small"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {checkout.notes ||
                                                                            "N/A"}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {checkout.project_number ||
                                                                            "-"}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ),
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        )}
                                    </AccordionDetails>
                                </Accordion>
                            )}

                            {/* Non-Recurring Checkouts Section */}
                            {filteredNonRecurring.length > 0 && (
                                <Accordion
                                    defaultExpanded={
                                        filteredRecurring.length === 0
                                    }
                                >
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                    >
                                        <Typography variant="subtitle1">
                                            One-time Reservations (
                                            {filteredNonRecurring.length})
                                        </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        {isMobile ? (
                                            <Box>
                                                {filteredNonRecurring.map(
                                                    (checkout) =>
                                                        renderNonRecurringMobileCard(
                                                            checkout,
                                                        ),
                                                )}
                                            </Box>
                                        ) : (
                                            <TableContainer>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>
                                                                User
                                                            </TableCell>
                                                            <TableCell>
                                                                Start
                                                            </TableCell>
                                                            <TableCell>
                                                                End
                                                            </TableCell>
                                                            <TableCell>
                                                                Status
                                                            </TableCell>
                                                            <TableCell>
                                                                Purpose
                                                            </TableCell>
                                                            <TableCell>
                                                                Project #
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {filteredNonRecurring.map(
                                                            (checkout) => (
                                                                <TableRow
                                                                    key={
                                                                        checkout.id
                                                                    }
                                                                >
                                                                    <TableCell>
                                                                        {checkout.User
                                                                            ? `${checkout.User.first_name} ${checkout.User.last_name}`
                                                                            : "N/A"}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {format(
                                                                            new Date(
                                                                                checkout.start_time,
                                                                            ),
                                                                            "Pp",
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {format(
                                                                            new Date(
                                                                                checkout.end_time,
                                                                            ),
                                                                            "Pp",
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip
                                                                            label={
                                                                                checkout.status
                                                                            }
                                                                            color={getCheckoutStatusColor(
                                                                                checkout.status,
                                                                            )}
                                                                            size="small"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {checkout.notes ||
                                                                            "N/A"}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {checkout.project_number ||
                                                                            "-"}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ),
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        )}
                                    </AccordionDetails>
                                </Accordion>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>
        </>
    );
};

export default CheckoutHistoryCard;
