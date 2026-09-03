import { useEffect, useState } from "react";
import {
    Stack,
    Typography,
    Button,
    InputAdornment,
    IconButton,
    Tooltip,
    TextField,
    MenuItem,
    Switch,
    Box,
    Grid,
    Divider,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";

import {
    PostUser,
    UpdateUser,
} from "../../../../Utilites/Functions/ApiFunctions/UserFunctions";
import { useAuth } from "../../../../Utilites/AuthContext";
import {
    showError,
    showSuccess,
} from "../../../../Utilites/Functions/ApiFunctions";
import ResponsiveDialog from "../../../Components/UI/ResponsiveDialog";

const emailPattern = /^[^\s@]+(\.[^\s@]+)?@[^\s@]+\.[^\s@]+$/;

/**
 * A permission row: label, description and a switch.
 *
 * The four permission toggles each carried their own 20-line `sx` block
 * overriding the switch track color. The switch now uses the theme's brand
 * styling, and the row explains what the permission grants.
 */
const PermissionToggle = ({ label, description, checked, onChange }) => (
    <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{
            px: 2,
            py: 1.5,
            borderRadius: 2.5,
            border: "1px solid",
            borderColor: checked ? "primary.100" : "divider",
            bgcolor: checked ? "primary.50" : "transparent",
            transition:
                "background-color 200ms ease, border-color 200ms ease",
        }}
    >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
                variant="body2"
                sx={{ fontWeight: checked ? 650 : 550 }}
            >
                {label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
                {description}
            </Typography>
        </Box>
        <Switch
            checked={checked}
            onChange={onChange}
            inputProps={{ "aria-label": label }}
        />
    </Stack>
);

const AddNewUser = ({
    open,
    setOpen,
    userLocation,
    selectedUser,
    locations,
    setUpdate,
}) => {
    const { user } = useAuth();
    const [admin, setAdmin] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [location, setLocation] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [viewPassword, setViewPassword] = useState(false);
    const [equipmentOfficeAdmin, setEquipmentOfficeAdmin] = useState("");
    const [equipmentAdmin, setEquipmentAdmin] = useState(false);
    const [taxAdmin, setTaxAdmin] = useState(false);

    const onClose = () => {
        setOpen(false);
        setLocation("");
        setEmail("");
        setFirstName("");
        setPassword("");
        setLastName("");
        setAdmin(false);
        setEquipmentOfficeAdmin("");
        setEquipmentAdmin(false);
        setTaxAdmin(false);
    };

    const onSubmit = () => {
        const hasRequired =
            firstName !== "" &&
            lastName !== "" &&
            (location?.officeid || location?.officeid === 0) &&
            email !== "";

        if (!hasRequired) {
            showError("Fields cannot be empty");
            return;
        }

        if (!selectedUser?.id) {
            PostUser({
                first_name: firstName,
                last_name: lastName,
                location: location.officeid,
                created_user_id: user?.id,
                email,
                password,
                admin,
                active: true,
                equipment_office_admin:
                    equipmentOfficeAdmin !== "" ? equipmentOfficeAdmin : null,
                equipment_admin: equipmentAdmin || false,
                tax_admin: taxAdmin || false,
            }).then((resp) => {
                if (resp) {
                    showSuccess("User created");
                    setUpdate((prev) => prev + 1);
                }
            });
        } else {
            UpdateUser(selectedUser?.id, {
                first_name: firstName,
                last_name: lastName,
                location: location.officeid,
                email,
                admin,
                equipment_office_admin: equipmentOfficeAdmin,
                equipment_admin: equipmentAdmin || false,
                tax_admin: taxAdmin || false,
            }).then((resp) => {
                if (resp) {
                    showSuccess("User updated");
                    setUpdate((prev) => prev + 1);
                }
            });
        }
        onClose();
    };

    useEffect(() => {
        if (!selectedUser) return;
        setLocation(userLocation);
        setFirstName(selectedUser?.first_name);
        setLastName(selectedUser?.last_name);
        setEmail(selectedUser?.email);
        setAdmin(selectedUser?.admin);
        setEquipmentOfficeAdmin(selectedUser?.equipment_office_admin);
        setEquipmentAdmin(selectedUser?.equipment_admin || false);
        setTaxAdmin(selectedUser?.tax_admin || false);
    }, [selectedUser, userLocation]);

    const emailInvalid = email !== "" && !emailPattern.test(email);

    const canGrantOfficeAdmin =
        user?.admin || user?.equipment_admin || user?.equipment_office_admin;

    return (
        <ResponsiveDialog
            open={Boolean(open)}
            onClose={onClose}
            title={selectedUser ? "Edit user" : "Add user"}
            subtitle={
                selectedUser
                    ? `${selectedUser.first_name} ${selectedUser.last_name}`
                    : "Create an account and set permissions"
            }
            icon={<ManageAccountsOutlinedIcon />}
            maxWidth="sm"
            actions={
                <>
                    <Button variant="outlined" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={onSubmit}>
                        {selectedUser ? "Save changes" : "Create user"}
                    </Button>
                </>
            }
        >
            <Stack spacing={3} divider={<Divider flexItem />}>
                {/* ---- Basic information ---- */}
                <Box>
                    <Typography
                        variant="overline"
                        sx={{ color: "text.secondary", display: "block", mb: 1.5 }}
                    >
                        Basic information
                    </Typography>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                label="First name"
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                label="Last name"
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                error={emailInvalid}
                                label="Email"
                                required
                                helperText={
                                    emailInvalid ? "Format: user@domain.com" : " "
                                }
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                required
                                label="Location"
                                value={location?.officeid ?? ""}
                                onChange={(e) =>
                                    setLocation(
                                        locations?.find(
                                            (itm) =>
                                                itm.officeid === e.target.value,
                                        ),
                                    )
                                }
                                helperText=" "
                            >
                                {locations?.map((itm) => (
                                    <MenuItem
                                        key={itm.officeid}
                                        value={itm.officeid}
                                    >
                                        {itm.Alias}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {!selectedUser?.id && (
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    label="Password"
                                    type={viewPassword ? "text" : "password"}
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
                                                                (v) => !v,
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
                            </Grid>
                        )}
                    </Grid>
                </Box>

                {/* ---- Permissions ---- */}
                <Box>
                    <Typography
                        variant="overline"
                        sx={{ color: "text.secondary", display: "block", mb: 1.5 }}
                    >
                        Permissions
                    </Typography>

                    <Stack spacing={1.25}>
                        {user?.admin && (
                            <PermissionToggle
                                label="System administrator"
                                description="Full access to every part of the application"
                                checked={admin}
                                onChange={(e) => setAdmin(e.target.checked)}
                            />
                        )}

                        {(user?.admin || user?.equipment_admin) && (
                            <PermissionToggle
                                label="Equipment administrator"
                                description="Manage equipment across all offices"
                                checked={equipmentAdmin}
                                onChange={(e) =>
                                    setEquipmentAdmin(e.target.checked)
                                }
                            />
                        )}

                        {(user?.admin || user?.tax_admin) && (
                            <PermissionToggle
                                label="Tax administrator"
                                description="Access depreciation reports and tax rules"
                                checked={taxAdmin}
                                onChange={(e) => setTaxAdmin(e.target.checked)}
                            />
                        )}

                        {canGrantOfficeAdmin && (
                            <TextField
                                select
                                fullWidth
                                label="Equipment office admin"
                                value={equipmentOfficeAdmin || ""}
                                onChange={(e) =>
                                    setEquipmentOfficeAdmin(e.target.value)
                                }
                                helperText="Lets this user manage equipment for a single location"
                                sx={{ mt: 0.5 }}
                            >
                                <MenuItem value="">
                                    <em>None</em>
                                </MenuItem>
                                {locations
                                    ?.filter((lc) => lc.Alias !== "All")
                                    ?.map((itm) => (
                                        <MenuItem
                                            key={itm.officeid}
                                            value={itm.officeid}
                                        >
                                            {itm.Alias}
                                        </MenuItem>
                                    ))}
                            </TextField>
                        )}
                    </Stack>
                </Box>
            </Stack>
        </ResponsiveDialog>
    );
};

export default AddNewUser;
