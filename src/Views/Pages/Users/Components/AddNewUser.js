import { useEffect, useState } from "react";
import { useTheme } from "@emotion/react";
import {
    Stack,
    Typography,
    Button,
    InputAdornment,
    IconButton,
    Tooltip,
    Dialog,
    FormControl,
    InputLabel,
    Select,
    Divider,
    TextField,
    MenuItem,
    FormControlLabel,
    Switch,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
    PostUser,
    UpdateUser,
} from "../../../../Utilites/Functions/ApiFunctions/UserFunctions";
import { useAuth } from "../../../../Utilites/AuthContext";
import {
    showError,
    showSuccess,
} from "../../../../Utilites/Functions/ApiFunctions";

const emailPattern = /^[^\s@]+(\.[^\s@]+)?@[^\s@]+\.[^\s@]+$/;

const AddNewUser = ({
    open,
    setOpen,
    userLocation,
    selectedUser,
    locations,
    setUpdate,
    filterLocation,
}) => {
    const theme = useTheme();
    const { user } = useAuth();
    const [admin, setAdmin] = useState(false);
    const [first_name, setfirst_name] = useState("");
    const [last_name, setlast_name] = useState("");
    const [location, setLocation] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [viewPassword, setViewPassword] = useState(false);
    const [equipmentOfficeAdmin, setEquipmentOfficeAdmin] = useState("");
    const [equipmentAdmin, setEquipmentAdmin] = useState(false);

    const onClose = () => {
        setOpen(false);
        // if (!selectedUser) {
        setLocation("");
        setEmail("");
        setfirst_name("");
        setPassword("");
        setlast_name("");
        setAdmin(false);
        setEquipmentOfficeAdmin("");
        setEquipmentAdmin(false);
        // }
    };

    const onSubmit = () => {
        if (
            first_name !== "" &&
            last_name !== "" &&
            (location?.officeid || location?.officeid === 0) &&
            email !== ""
        ) {
            if (!selectedUser?.id) {
                PostUser({
                    first_name: first_name,
                    last_name: last_name,
                    location: location.officeid,
                    created_user_id: user?.id,
                    email: email,
                    password: password,
                    admin: admin,
                    active: true,
                    equipment_office_admin:
                        equipmentOfficeAdmin != ""
                            ? equipmentOfficeAdmin
                            : null,
                    equipment_admin: equipmentAdmin || false,
                }).then((resp) => {
                    if (resp) {
                        showSuccess("User Created");
                        setUpdate((prev) => prev + 1);
                    }
                });
            } else {
                UpdateUser(selectedUser?.id, {
                    first_name: first_name,
                    last_name: last_name,
                    location: location.officeid,
                    email: email,
                    admin: admin,
                    equipment_office_admin: equipmentOfficeAdmin,
                    equipment_admin: equipmentAdmin || false,
                }).then((resp) => {
                    if (resp) {
                        showSuccess("User Updated");
                        setUpdate((prev) => prev + 1);
                    }
                });
            }
            onClose();
        } else {
            showError("Fields cannot be empty");
        }
    };

    useEffect(() => {
        if (selectedUser) {
            setLocation(userLocation);
            setfirst_name(selectedUser?.first_name);
            setlast_name(selectedUser?.last_name);
            setEmail(selectedUser?.email);
            setAdmin(selectedUser?.admin);
            setEquipmentOfficeAdmin(selectedUser?.equipment_office_admin);
            setEquipmentAdmin(selectedUser?.equipment_admin || false);
        }
    }, [selectedUser, userLocation]);

    return (
        <Dialog open={!!open} onClose={onClose} maxWidth={false}>
            <Stack
                sx={{
                    width: "550px",
                    height: "100%",
                }}
            >
                <Typography
                    variant="h5"
                    textAlign={"center"}
                    width={"100%"}
                    fontFamily={"Courier New, sans-serif"}
                    marginBottom={1}
                    marginTop={2}
                >
                    {selectedUser ? "Edit" : "Add"} User
                </Typography>
                <Divider width={"100%"} />

                <Stack sx={{ padding: "20px", gap: 2.5 }}>
                    {/* Basic Information Section */}
                    <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        color="text.secondary"
                    >
                        Basic Information
                    </Typography>

                    <Stack direction={"row"} spacing={2}>
                        <TextField
                            fullWidth
                            value={first_name}
                            onChange={(e) => setfirst_name(e.target.value)}
                            label="First Name"
                            variant="outlined"
                            size="small"
                            required
                        />
                        <TextField
                            fullWidth
                            value={last_name}
                            onChange={(e) => setlast_name(e.target.value)}
                            label="Last Name"
                            variant="outlined"
                            size="small"
                            required
                        />
                    </Stack>

                    <Stack direction={"row"} spacing={2}>
                        <TextField
                            fullWidth
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            error={!emailPattern.test(email) && email !== ""}
                            variant="outlined"
                            label="Email"
                            size="small"
                            required
                            helperText={
                                !emailPattern.test(email) && email !== ""
                                    ? "Format: user@domain.com"
                                    : ""
                            }
                        />
                        <FormControl
                            variant="outlined"
                            size="small"
                            fullWidth
                            required
                        >
                            <InputLabel id="location-label">
                                Location
                            </InputLabel>
                            <Select
                                labelId="location-label"
                                value={location?.officeid || ""}
                                onChange={(e) => {
                                    const selectedItem = locations?.find(
                                        (itm) =>
                                            itm.officeid === e.target.value,
                                    );
                                    setLocation(selectedItem);
                                }}
                                label="Location"
                            >
                                {locations?.map((itm, index) => (
                                    <MenuItem key={index} value={itm.officeid}>
                                        {itm.Alias}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>

                    {!selectedUser?.id && (
                        <TextField
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            label="Password"
                            type={viewPassword ? "text" : "password"}
                            variant="outlined"
                            size="small"
                            required
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Tooltip
                                            title={
                                                viewPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                        >
                                            <IconButton
                                                onClick={() =>
                                                    setViewPassword(
                                                        !viewPassword,
                                                    )
                                                }
                                                edge="end"
                                                size="small"
                                            >
                                                {viewPassword ? (
                                                    <VisibilityOff fontSize="small" />
                                                ) : (
                                                    <Visibility fontSize="small" />
                                                )}
                                            </IconButton>
                                        </Tooltip>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    )}

                    <Divider />

                    {/* Permissions Section */}
                    <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        color="text.secondary"
                    >
                        Permissions
                    </Typography>

                    {user?.admin && (
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={admin}
                                    onChange={(e) => setAdmin(e.target.checked)}
                                    sx={{
                                        "& .MuiSwitch-switchBase": {
                                            "&.Mui-checked": {
                                                color: "#fff",
                                                "& + .MuiSwitch-track": {
                                                    backgroundColor:
                                                        theme.palette.mode ===
                                                        "dark"
                                                            ? "#2ECA45"
                                                            : "#65C466",
                                                    opacity: 1,
                                                    border: 0,
                                                },
                                            },
                                        },
                                    }}
                                />
                            }
                            label="System Administrator"
                            sx={{
                                "& .MuiFormControlLabel-label": {
                                    fontWeight: admin ? "600" : "400",
                                    color: admin ? "black" : "grey",
                                },
                            }}
                        />
                    )}

                    {user?.admin ||
                        (user?.equipment_admin && (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={equipmentAdmin}
                                        onChange={(e) =>
                                            setEquipmentAdmin(e.target.checked)
                                        }
                                        sx={{
                                            "& .MuiSwitch-switchBase": {
                                                "&.Mui-checked": {
                                                    color: "#fff",
                                                    "& + .MuiSwitch-track": {
                                                        backgroundColor:
                                                            theme.palette
                                                                .mode === "dark"
                                                                ? "#2196f3"
                                                                : "#64b5f6",
                                                        opacity: 1,
                                                        border: 0,
                                                    },
                                                },
                                            },
                                        }}
                                    />
                                }
                                label="Equipment Administrator (All Offices)"
                                sx={{
                                    "& .MuiFormControlLabel-label": {
                                        fontWeight: equipmentAdmin
                                            ? "600"
                                            : "400",
                                        color: equipmentAdmin
                                            ? "black"
                                            : "grey",
                                    },
                                }}
                            />
                        ))}

                    {user?.admin ||
                        user?.equipment_admin ||
                        (user?.equipment_office_admin && (
                            <FormControl
                                variant="outlined"
                                size="small"
                                fullWidth
                            >
                                <InputLabel id="equipment-admin-label">
                                    Equipment Office Admin (Single Location)
                                </InputLabel>
                                <Select
                                    labelId="equipment-admin-label"
                                    value={equipmentOfficeAdmin || ""}
                                    onChange={(e) => {
                                        setEquipmentOfficeAdmin(e.target.value);
                                    }}
                                    label="Equipment Admin"
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {locations
                                        ?.filter((lc) => lc.Alias !== "All")
                                        ?.map((itm, index) => (
                                            <MenuItem
                                                key={index}
                                                value={itm.officeid}
                                            >
                                                {itm.Alias}
                                            </MenuItem>
                                        ))}
                                </Select>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ mt: 0.5, ml: 1.5 }}
                                >
                                    Allows user to manage equipment for the
                                    selected location
                                </Typography>
                            </FormControl>
                        ))}
                </Stack>

                <Divider />

                {/* Action Buttons */}
                <Stack
                    direction="row"
                    spacing={2}
                    sx={{
                        justifyContent: "flex-end",
                        padding: "16px 20px",
                    }}
                >
                    <Button
                        variant="outlined"
                        onClick={onClose}
                        sx={{ minWidth: "100px" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={onSubmit}
                        sx={{
                            minWidth: "100px",
                            backgroundColor: "#4caf50",
                            ":hover": {
                                backgroundColor: "#45a049",
                            },
                        }}
                    >
                        {selectedUser ? "Update" : "Create"}
                    </Button>
                </Stack>
            </Stack>
        </Dialog>
    );
};

export default AddNewUser;
