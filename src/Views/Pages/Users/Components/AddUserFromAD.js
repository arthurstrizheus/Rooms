import { useEffect, useState } from "react";
import { useTheme } from "@emotion/react";
import {
    Stack,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
    TextField,
    CircularProgress,
} from "@mui/material";
import {
    showError,
    showSuccess,
} from "../../../../Utilites/Functions/ApiFunctions";
import axios from "axios";

const AddUserFromAD = ({ open, setOpen, locations, setUpdate }) => {
    const theme = useTheme();
    const [selectedUser, setSelectedUser] = useState(null);
    const [location, setLocation] = useState("");
    const [adUsers, setAdUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            fetchAdUsers();
        } else {
            // Reset form when dialog closes
            setSelectedUser(null);
            setLocation("");
        }
    }, [open]);

    const fetchAdUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(`/api/users/ad/all`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
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
        if (!submitting) {
            setOpen(false);
        }
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
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            if (response.status === 201) {
                showSuccess("User added successfully");
                setUpdate((prev) => prev + 1);
                setOpen(false);
            }
        } catch (error) {
            console.error("Error creating user:", error);
            const errorMessage =
                error.response?.data?.message || "Failed to add user";
            showError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown={submitting}
        >
            <DialogTitle>Add User from Active Directory</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 2 }}>
                    <Autocomplete
                        options={adUsers}
                        getOptionLabel={(option) =>
                            `${option.displayName} (${option.username})`
                        }
                        value={selectedUser}
                        onChange={(event, newValue) => {
                            setSelectedUser(newValue);
                        }}
                        loading={loading}
                        disabled={submitting}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Select User"
                                variant="outlined"
                                required
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {loading ? (
                                                <CircularProgress
                                                    color="inherit"
                                                    size={20}
                                                />
                                            ) : null}
                                            {params.InputProps.endAdornment}
                                        </>
                                    ),
                                }}
                                helperText={
                                    loading
                                        ? "Loading users from Active Directory..."
                                        : adUsers.length === 0 && !loading
                                          ? "No available users found"
                                          : "Search by name or username"
                                }
                            />
                        )}
                        renderOption={(props, option) => (
                            <li {...props} key={option.username}>
                                <Stack>
                                    <Typography variant="body1">
                                        {option.displayName}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        {option.username} • {option.email}
                                    </Typography>
                                </Stack>
                            </li>
                        )}
                        noOptionsText={
                            loading
                                ? "Loading..."
                                : "No users available (all AD users may already be registered)"
                        }
                    />

                    <FormControl
                        variant="outlined"
                        required
                        disabled={submitting}
                    >
                        <InputLabel id="location-label">Location</InputLabel>
                        <Select
                            labelId="location-label"
                            value={location?.officeid ?? ""}
                            label="Location"
                            onChange={(e) => {
                                const selectedItem = locations?.find(
                                    (itm) => itm.officeid === e.target.value,
                                );
                                setLocation(selectedItem);
                            }}
                        >
                            {locations?.map((itm) => (
                                <MenuItem
                                    key={itm.officeid}
                                    value={itm.officeid}
                                >
                                    {itm.Alias}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {selectedUser && (
                        <Stack
                            spacing={1}
                            sx={{
                                p: 2,
                                bgcolor: "action.hover",
                                borderRadius: 1,
                            }}
                        >
                            <Typography
                                variant="subtitle2"
                                color="text.secondary"
                            >
                                User Details:
                            </Typography>
                            <Typography variant="body2">
                                <strong>Name:</strong> {selectedUser.firstName}{" "}
                                {selectedUser.lastName}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Username:</strong>{" "}
                                {selectedUser.username}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Email:</strong> {selectedUser.email}
                            </Typography>
                        </Stack>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={handleClose} disabled={submitting}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={!selectedUser || !location || submitting}
                    startIcon={
                        submitting ? <CircularProgress size={16} /> : null
                    }
                >
                    {submitting ? "Adding..." : "Add User"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddUserFromAD;
