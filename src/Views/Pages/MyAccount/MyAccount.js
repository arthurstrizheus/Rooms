import { useEffect, useMemo, useState } from "react";
import {
    Grid,
    Stack,
    Typography,
    Button,
    MenuItem,
    TextField,
    Box,
    Avatar,
    Chip,
    Divider,
    Card,
} from "@mui/material";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

import { useAuth } from "../../../Utilites/AuthContext";
import { openSnackbar } from "../../../Utilites/SnackbarContext";
import { GetLocations } from "../../../Utilites/Functions/ApiFunctions";
import { UpdateUserDetails } from "../../../Utilites/Functions/ApiFunctions/UserFunctions";
import { PageHeader, PageContainer, SectionCard, RiseIn } from "../../Components/UI";

// Password management lives in Active Directory — the local change-password
// form that used to sit here was already commented out and has been removed.

const ROLES = [
    { key: "admin", label: "Administrator" },
    { key: "equipment_admin", label: "Equipment Admin" },
    { key: "equipment_office_admin", label: "Office Admin" },
    { key: "tax_admin", label: "Tax Admin" },
];

const MyAccount = ({ setLoading }) => {
    const { user, setUser } = useAuth();

    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [location, setLocation] = useState("");
    const [locations, setLocations] = useState([]);
    const [saving, setSaving] = useState(false);
    const [update, setUpdate] = useState(0);

    useEffect(() => {
        if (!user?.id) return;
        setLoading(true);
        GetLocations()
            .then((lcs) => setLocations(lcs))
            .finally(() => setLoading(false));
        setFirstName(user?.first_name || "");
        setLastName(user?.last_name || "");
        setEmail(user?.email || "");
    }, [update, user, setLoading]);

    useEffect(() => {
        setLocation(locations?.find((lc) => lc.officeid === user?.location));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locations]);

    const dirty =
        firstName !== (user?.first_name || "") ||
        lastName !== (user?.last_name || "") ||
        location?.officeid !== user?.location;

    const onSaveDetails = () => {
        if (!firstName.trim() || !lastName.trim()) {
            openSnackbar("First and last name cannot be blank", {
                severity: "error",
                autoHideDuration: 4000,
                anchorOrigin: { vertical: "top", horizontal: "center" },
                alertProps: { variant: "filled" },
                transition: "grow",
            });
            return;
        }

        setLoading(true);
        setSaving(true);
        UpdateUserDetails(user?.id, {
            first_name: firstName,
            last_name: lastName,
            location: location?.officeid,
        })
            .then(() =>
                setUser({
                    ...user,
                    first_name: firstName,
                    last_name: lastName,
                    location: location?.officeid,
                }),
            )
            .then(() => {
                openSnackbar("Account details saved", {
                    severity: "success",
                    autoHideDuration: 3000,
                    transition: "grow",
                });
                setUpdate((prev) => prev + 1);
            })
            .catch(() =>
                openSnackbar("Couldn't save your details. Please try again.", {
                    severity: "error",
                    autoHideDuration: 4000,
                    alertProps: { variant: "filled" },
                }),
            )
            .finally(() => {
                setLoading(false);
                setSaving(false);
            });
    };

    const initials = useMemo(
        () =>
            `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase(),
        [user?.first_name, user?.last_name],
    );

    const activeRoles = ROLES.filter((role) => user?.[role.key]);

    return (
        <>
            <PageHeader
                title="My Account"
                subtitle="Your profile details and access level."
            />

            <PageContainer maxWidth={1000}>
                {/* ---- Identity banner ---- */}
                <RiseIn>
                    <Card
                        sx={{
                            position: "relative",
                            overflow: "hidden",
                            mb: 2.5,
                        }}
                    >
                        <Box
                            aria-hidden
                            sx={{
                                height: 76,
                                background: (t) =>
                                    `linear-gradient(120deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
                            }}
                        />
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                            alignItems={{ xs: "flex-start", sm: "flex-end" }}
                            sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, mt: -4.5 }}
                        >
                            <Avatar
                                sx={{
                                    width: 76,
                                    height: 76,
                                    fontSize: "1.5rem",
                                    fontWeight: 700,
                                    border: "3px solid",
                                    borderColor: "background.paper",
                                    bgcolor: "primary.50",
                                    color: "primary.dark",
                                    boxShadow: (t) => t.shadowTokens.md,
                                    animation:
                                        "seaScaleIn 460ms cubic-bezier(0.34,1.56,0.64,1) both",
                                }}
                            >
                                {initials || "?"}
                            </Avatar>

                            <Box sx={{ flexGrow: 1, minWidth: 0, pb: 0.5 }}>
                                <Typography variant="h4" noWrap>
                                    {user?.first_name} {user?.last_name}
                                </Typography>
                                <Stack
                                    direction="row"
                                    spacing={0.75}
                                    alignItems="center"
                                    sx={{ mt: 0.5 }}
                                >
                                    <MailOutlineIcon
                                        sx={{
                                            fontSize: 15,
                                            color: "text.disabled",
                                        }}
                                    />
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        noWrap
                                    >
                                        {user?.email}
                                    </Typography>
                                </Stack>
                            </Box>

                            <Stack
                                direction="row"
                                spacing={0.75}
                                sx={{ flexWrap: "wrap", gap: 0.75, pb: 0.5 }}
                            >
                                {activeRoles.length > 0 ? (
                                    activeRoles.map((role) => (
                                        <Chip
                                            key={role.key}
                                            size="small"
                                            label={role.label}
                                            icon={
                                                <VerifiedUserOutlinedIcon
                                                    sx={{
                                                        fontSize: "14px !important",
                                                    }}
                                                />
                                            }
                                            sx={{
                                                bgcolor: "primary.50",
                                                color: "primary.dark",
                                                border: "1px solid",
                                                borderColor: "primary.100",
                                                "& .MuiChip-icon": {
                                                    color: "primary.main",
                                                },
                                            }}
                                        />
                                    ))
                                ) : (
                                    <Chip
                                        size="small"
                                        label="Member"
                                        variant="outlined"
                                    />
                                )}
                            </Stack>
                        </Stack>
                    </Card>
                </RiseIn>

                {/* ---- Editable details ---- */}
                <SectionCard
                    title="Account details"
                    subtitle="Your name and home office."
                    icon={<BadgeOutlinedIcon />}
                    sx={{
                        animation:
                            "seaRiseIn 380ms cubic-bezier(0.22,1,0.36,1) both",
                        animationDelay: "80ms",
                    }}
                    footer={
                        <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            justifyContent="flex-end"
                        >
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    mr: "auto",
                                    opacity: dirty ? 1 : 0,
                                    transition: "opacity 200ms ease",
                                }}
                            >
                                You have unsaved changes
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<SaveOutlinedIcon />}
                                onClick={onSaveDetails}
                                disabled={!dirty || saving}
                            >
                                Save changes
                            </Button>
                        </Stack>
                    }
                >
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="First name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Last name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Email"
                                value={email}
                                fullWidth
                                disabled
                                helperText="Managed by Active Directory"
                                InputProps={{
                                    startAdornment: (
                                        <MailOutlineIcon
                                            sx={{
                                                fontSize: 18,
                                                mr: 1,
                                                color: "text.disabled",
                                            }}
                                        />
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                label="Location"
                                value={location?.officeid || ""}
                                onChange={(e) =>
                                    setLocation(
                                        locations?.find(
                                            (itm) =>
                                                itm.officeid === e.target.value,
                                        ),
                                    )
                                }
                                fullWidth
                                InputProps={{
                                    startAdornment: (
                                        <PlaceOutlinedIcon
                                            sx={{
                                                fontSize: 18,
                                                mr: 1,
                                                color: "text.disabled",
                                            }}
                                        />
                                    ),
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
                            </TextField>
                        </Grid>
                    </Grid>
                </SectionCard>

                {/* ---- Access ---- */}
                <SectionCard
                    title="Access"
                    subtitle="What you can do in this application."
                    icon={<VerifiedUserOutlinedIcon />}
                    sx={{
                        mt: 2.5,
                        animation:
                            "seaRiseIn 380ms cubic-bezier(0.22,1,0.36,1) both",
                        animationDelay: "150ms",
                    }}
                >
                    <Stack
                        divider={<Divider flexItem />}
                        sx={{ "& > *": { py: 1.25 }, "& > *:first-of-type": { pt: 0 } }}
                    >
                        {ROLES.map((role) => (
                            <Stack
                                key={role.key}
                                direction="row"
                                alignItems="center"
                                spacing={1.5}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{ flexGrow: 1, fontWeight: 550 }}
                                >
                                    {role.label}
                                </Typography>
                                <Chip
                                    size="small"
                                    label={user?.[role.key] ? "Granted" : "—"}
                                    sx={
                                        user?.[role.key]
                                            ? {
                                                  bgcolor: "success.light",
                                                  color: "success.dark",
                                                  fontWeight: 600,
                                              }
                                            : {
                                                  bgcolor: "grey.100",
                                                  color: "text.disabled",
                                              }
                                    }
                                />
                            </Stack>
                        ))}
                    </Stack>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 2 }}
                    >
                        Roles are assigned by an administrator. Contact your
                        equipment admin if something looks wrong.
                    </Typography>
                </SectionCard>
            </PageContainer>
        </>
    );
};

export default MyAccount;
