import { useEffect, useState } from "react";
import {
    Stack,
    Typography,
    Button,
    MenuItem,
    Autocomplete,
    TextField,
    CircularProgress,
    Box,
    Avatar,
    Grid,
} from "@mui/material";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import axios from "axios";

import {
    showError,
    showSuccess,
} from "../../../../Utilites/Functions/ApiFunctions";
import ResponsiveDialog from "../../../Components/UI/ResponsiveDialog";
import DetailField from "../../../Components/UI/DetailField";

const initialsOf = (name = "") =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();

/**
 * Provision a new app user from an Active Directory account.
 *
 * Once an AD user is picked, their details preview in a card so the admin can
 * confirm they've got the right person before creating the account.
 */
const AddUserFromAD = ({ open, setOpen, locations, setUpdate }) => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [location, setLocation] = useState("");
    const [adUsers, setAdUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            fetchAdUsers();
        } else {
            setSelectedUser(null);
            setLocation("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const fetchAdUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(`/api/users/ad/all`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAdUsers(response.data || []);
        } catch (error) {
            console.error("Error fetching AD users:", error);
            showError("Failed to load Active Directory users");
            setAdUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!submitting) setOpen(false);
    };

    const handleSubmit = async () => {
        if (!selectedUser || !location) {
            showError("Please select a user and location");
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.post(
                `/api/users/ad/create`,
                {
                    username: selectedUser.username,
                    location: location.officeid,
                },
                { headers: { Authorization: `Bearer ${token}` } },
            );

            if (response.status === 201) {
                showSuccess("User added successfully");
                setUpdate((prev) => prev + 1);
                setOpen(false);
            }
        } catch (error) {
            console.error("Error creating user:", error);
            showError(error.response?.data?.message || "Failed to add user");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ResponsiveDialog
            open={open}
            onClose={handleClose}
            title="Add user"
            subtitle="Provision an account from Active Directory"
            icon={<PersonAddAlt1OutlinedIcon />}
            maxWidth="sm"
            disableEscapeKeyDown={submitting}
            actions={
                <>
                    <Button
                        onClick={handleClose}
                        variant="outlined"
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={!selectedUser || !location || submitting}
                        startIcon={
                            submitting ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <PersonAddAlt1OutlinedIcon />
                            )
                        }
                    >
                        {submitting ? "Adding…" : "Add user"}
                    </Button>
                </>
            }
        >
            <Stack spacing={2.5}>
                <Autocomplete
                    options={adUsers}
                    getOptionLabel={(option) =>
                        `${option.displayName} (${option.username})`
                    }
                    value={selectedUser}
                    onChange={(_, newValue) => setSelectedUser(newValue)}
                    loading={loading}
                    disabled={submitting}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Active Directory user"
                            required
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {loading && (
                                            <CircularProgress
                                                color="inherit"
                                                size={18}
                                            />
                                        )}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                            helperText={
                                loading
                                    ? "Loading users from Active Directory…"
                                    : adUsers.length === 0
                                      ? "No available users found"
                                      : "Search by name or username"
                            }
                        />
                    )}
                    renderOption={(props, option) => (
                        <Box component="li" {...props} key={option.username}>
                            <Stack
                                direction="row"
                                spacing={1.25}
                                alignItems="center"
                                sx={{ minWidth: 0 }}
                            >
                                <Avatar
                                    sx={{
                                        width: 28,
                                        height: 28,
                                        fontSize: "0.6875rem",
                                    }}
                                >
                                    {initialsOf(option.displayName)}
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" noWrap>
                                        {option.displayName}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        noWrap
                                    >
                                        {option.username} · {option.email}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>
                    )}
                    noOptionsText={
                        loading
                            ? "Loading…"
                            : "No users available — they may all be registered already"
                    }
                />

                <TextField
                    select
                    label="Location"
                    required
                    disabled={submitting}
                    value={location?.officeid ?? ""}
                    onChange={(e) =>
                        setLocation(
                            locations?.find(
                                (itm) => itm.officeid === e.target.value,
                            ),
                        )
                    }
                    fullWidth
                >
                    {locations?.map((itm) => (
                        <MenuItem key={itm.officeid} value={itm.officeid}>
                            {itm.Alias}
                        </MenuItem>
                    ))}
                </TextField>

                {selectedUser && (
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 2.5,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "grey.50",
                            animation:
                                "seaRiseIn 320ms cubic-bezier(0.22,1,0.36,1) both",
                        }}
                    >
                        <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            sx={{ mb: 2 }}
                        >
                            <Avatar sx={{ width: 38, height: 38 }}>
                                {initialsOf(selectedUser.displayName)}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2" noWrap>
                                    {selectedUser.displayName}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    noWrap
                                >
                                    Will be created in{" "}
                                    {location?.Alias || "— select a location"}
                                </Typography>
                            </Box>
                        </Stack>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <DetailField
                                    label="First name"
                                    value={selectedUser.firstName}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <DetailField
                                    label="Last name"
                                    value={selectedUser.lastName}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <DetailField
                                    label="Username"
                                    value={selectedUser.username}
                                    mono
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <DetailField
                                    label="Email"
                                    value={selectedUser.email}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </Stack>
        </ResponsiveDialog>
    );
};

export default AddUserFromAD;
