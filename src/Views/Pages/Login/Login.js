import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Typography,
    Checkbox,
    Button,
    TextField,
    FormControlLabel,
    Link,
    MenuItem,
    InputAdornment,
    IconButton,
    Stack,
    CircularProgress,
    Collapse,
    debounce,
} from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import { useAuth } from "../../../Utilites/AuthContext";
import {
    AuthenticateUserAD,
    UserExistsInAD,
} from "../../../Utilites/Functions/ApiFunctions/UserFunctions";
import {
    GetLocations,
    showError,
} from "../../../Utilites/Functions/ApiFunctions";
import useResponsive from "../../../hooks/useResponsive";
import logo from "../../../Assets/Images/sea-logo.png";

/**
 * Sign in.
 *
 * Desktop is a split screen: a brand panel carrying the photograph and a clean
 * form panel, so the form is never fighting the background for legibility (the
 * previous layout floated a white card straight onto the photo). Below `md` the
 * photo becomes a short header band and the form takes the full width.
 */
export default function Login({ setLoading, setDrawerOpen }) {
    const navigate = useNavigate();
    const { setUser, login } = useAuth();
    const { isCompact } = useResponsive();

    const [bgLoaded, setBgLoaded] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [locations, setLocations] = useState([]);
    const [location, setLocation] = useState("");
    const [showLocations, setShowLocations] = useState(false);

    useEffect(() => {
        setLoading(true);
        const fetchLocations = async () => {
            const lcs = await GetLocations();
            setLocations(lcs);
            setLoading(false);
        };
        fetchLocations();
    }, [setLoading]);

    // Restore an existing session if there is one.
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("authToken");
        const storedRememberMe = localStorage.getItem("rememberMe") === "true";

        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            const lastLoc =
                localStorage.getItem("lastLocation") ||
                localStorage.getItem("lastlocation");
            if (lastLoc) navigate(lastLoc);
            login(JSON.parse(storedUser), storedToken);
        }
        if (storedRememberMe) {
            setRememberMe(true);
            setEmail(localStorage.getItem("email") || "");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Decode the hero image before revealing it, so it fades in rather than
    // painting in bands.
    useEffect(() => {
        const img = new Image();
        img.src = "/loginBackground.jpg";
        img.onload = () => setBgLoaded(true);
        img.onerror = () => setBgLoaded(true);
    }, []);

    const persistRememberMe = () => {
        if (rememberMe) {
            localStorage.setItem("email", `${email}`);
            localStorage.setItem("rememberMe", "true");
        } else {
            localStorage.removeItem("email");
            localStorage.setItem("rememberMe", "false");
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (showLocations && !location?.officeid) {
            showError("You must select your location");
            return;
        }

        setLoading(true);
        setSubmitting(true);

        AuthenticateUserAD({
            email: email,
            password: password,
            location: location?.officeid,
        })
            .then((resp) => {
                if (!resp) return;

                if (resp?.user && resp?.token) {
                    setUser(resp.user);
                    login(resp.user, resp.token);
                    setShowLocations(false);
                    persistRememberMe();
                    setDrawerOpen?.(!isCompact);
                    navigate("/equipment");
                } else if (resp?.id) {
                    // Older response shape: no token in the payload.
                    setUser(resp);
                    login(resp);
                    setShowLocations(false);
                    localStorage.setItem("user", JSON.stringify(resp));
                    persistRememberMe();
                    setDrawerOpen?.(!isCompact);
                    navigate("/equipment");
                }
            })
            .catch((error) => {
                console.error("Authentication error:", error);
            })
            .finally(() => {
                setLoading(false);
                setSubmitting(false);
            });
    };

    const handleRememberMeChange = (event) => {
        setRememberMe(event.target.checked);
        if (!event.target.checked) {
            localStorage.removeItem("email");
            localStorage.removeItem("rememberMe");
        }
    };

    const debouncedCheckUserAd = useMemo(
        () =>
            debounce((user) => {
                UserExistsInAD({ username: user }).then((resp) => {
                    setShowLocations(!resp.accountCreated);
                    setShowPassword(false);
                });
            }, 1000),
        [],
    );

    // ---- Brand panel -------------------------------------------------------
    const brandPanel = (
        <Box
            sx={{
                position: "relative",
                overflow: "hidden",
                flex: { md: "0 0 46%" },
                height: { xs: 168, md: "auto" },
                bgcolor: "grey.900",
            }}
        >
            <Box
                aria-hidden
                sx={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: 'url("/loginBackground.jpg")',
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    opacity: bgLoaded ? 1 : 0,
                    // Slow drift gives the panel life without distracting.
                    transform: bgLoaded ? "scale(1)" : "scale(1.06)",
                    transition:
                        "opacity 900ms ease, transform 1600ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
            />
            {/* Scrim: keeps the wordmark legible over any part of the photo. */}
            <Box
                aria-hidden
                sx={{
                    position: "absolute",
                    inset: 0,
                    background: {
                        xs: "linear-gradient(180deg, rgba(20,24,31,0.30) 0%, rgba(20,24,31,0.72) 100%)",
                        md: "linear-gradient(135deg, rgba(147,39,44,0.82) 0%, rgba(20,24,31,0.78) 55%, rgba(20,24,31,0.88) 100%)",
                    },
                }}
            />

            <Stack
                sx={{
                    position: "relative",
                    height: "100%",
                    px: { xs: 3, md: 6 },
                    py: { xs: 3, md: 6 },
                    justifyContent: { xs: "center", md: "space-between" },
                }}
            >
                <Box
                    component="img"
                    src={logo}
                    alt="S-E-A"
                    sx={{
                        height: { xs: 40, md: 54 },
                        width: "auto",
                        alignSelf: "flex-start",
                        filter: "brightness(0) invert(1)",
                        animation:
                            "seaRiseIn 700ms cubic-bezier(0.22, 1, 0.36, 1) both",
                    }}
                />

                <Box sx={{ display: { xs: "none", md: "block" } }}>
                    <Typography
                        sx={{
                            color: "common.white",
                            fontSize: "2.5rem",
                            fontWeight: 700,
                            lineHeight: 1.1,
                            letterSpacing: "-0.03em",
                            animation:
                                "seaRiseIn 700ms cubic-bezier(0.22, 1, 0.36, 1) both",
                            animationDelay: "120ms",
                        }}
                    >
                        Equipment
                        <br />
                        Reservations
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(255,255,255,0.72)",
                            mt: 2,
                            maxWidth: 380,
                            animation:
                                "seaRiseIn 700ms cubic-bezier(0.22, 1, 0.36, 1) both",
                            animationDelay: "220ms",
                        }}
                    >
                        Browse the catalog, check availability and reserve what
                        you need — from any device, anywhere in the field.
                    </Typography>
                </Box>

                <Typography
                    variant="caption"
                    sx={{
                        color: "rgba(255,255,255,0.55)",
                        display: { xs: "none", md: "block" },
                    }}
                >
                    © {new Date().getFullYear()} S.E.A. Limited
                </Typography>
            </Stack>
        </Box>
    );

    // ---- Form --------------------------------------------------------------
    const field = (index) => ({
        animation: "seaRiseIn 520ms cubic-bezier(0.22, 1, 0.36, 1) both",
        animationDelay: `${120 + index * 70}ms`,
    });

    return (
        <Box
            sx={{
                minHeight: "100dvh",
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                bgcolor: "background.paper",
            }}
        >
            {brandPanel}

            <Box
                sx={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    px: { xs: 2.5, sm: 4 },
                    py: { xs: 4, md: 6 },
                }}
            >
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    noValidate
                    sx={{ width: "100%", maxWidth: 400 }}
                >
                    <Box sx={{ mb: 4, ...field(0) }}>
                        <Typography variant="h2" sx={{ mb: 0.75 }}>
                            Sign in
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Use your S-E-A network credentials to continue.
                        </Typography>
                    </Box>

                    <Stack spacing={2}>
                        <TextField
                            id="email"
                            name="Email"
                            label="S-E-A Username"
                            autoComplete="username"
                            autoFocus
                            required
                            fullWidth
                            size="medium"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                debouncedCheckUserAd(e.target.value);
                            }}
                            onBlur={() =>
                                UserExistsInAD({ username: email }).then(
                                    (resp) =>
                                        setShowLocations(!resp.accountCreated),
                                )
                            }
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonOutlineIcon
                                            sx={{
                                                fontSize: 19,
                                                color: "text.disabled",
                                            }}
                                        />
                                    </InputAdornment>
                                ),
                            }}
                            sx={field(1)}
                        />

                        <TextField
                            id="password"
                            name="Password"
                            label="Password"
                            autoComplete="current-password"
                            required
                            fullWidth
                            size="medium"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlinedIcon
                                            sx={{
                                                fontSize: 19,
                                                color: "text.disabled",
                                            }}
                                        />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() =>
                                                setShowPassword((v) => !v)
                                            }
                                            edge="end"
                                            size="small"
                                            aria-label={
                                                showPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                        >
                                            {showPassword ? (
                                                <VisibilityOffOutlinedIcon
                                                    fontSize="small"
                                                />
                                            ) : (
                                                <VisibilityOutlinedIcon
                                                    fontSize="small"
                                                />
                                            )}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={field(2)}
                        />

                        {/* Only shown for accounts that haven't been set up
                            yet, so it animates in rather than jumping. */}
                        <Collapse in={showLocations} timeout={300}>
                            <TextField
                                select
                                id="location"
                                name="location"
                                label="Location"
                                required
                                fullWidth
                                size="medium"
                                value={location?.officeid || ""}
                                onChange={(e) =>
                                    setLocation(
                                        locations?.find(
                                            (itm) =>
                                                itm?.officeid ===
                                                e.target.value,
                                        ),
                                    )
                                }
                                helperText="First sign-in — tell us where you're based."
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PlaceOutlinedIcon
                                                sx={{
                                                    fontSize: 19,
                                                    color: "text.disabled",
                                                }}
                                            />
                                        </InputAdornment>
                                    ),
                                }}
                            >
                                {locations?.map((itm) => (
                                    <MenuItem
                                        key={itm?.officeid}
                                        value={itm?.officeid}
                                    >
                                        {itm?.Alias}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Collapse>

                        <FormControlLabel
                            sx={{ ...field(3), ml: -0.5 }}
                            control={
                                <Checkbox
                                    checked={rememberMe}
                                    onChange={handleRememberMeChange}
                                    color="primary"
                                />
                            }
                            label={
                                <Typography variant="body2">
                                    Remember me on this device
                                </Typography>
                            }
                        />

                        <Button
                            type="submit"
                            fullWidth
                            size="large"
                            variant="contained"
                            disabled={submitting}
                            endIcon={
                                submitting ? null : (
                                    <ArrowForwardIcon
                                        sx={{
                                            transition:
                                                "transform 240ms cubic-bezier(0.22,1,0.36,1)",
                                        }}
                                    />
                                )
                            }
                            sx={{
                                ...field(4),
                                mt: 1,
                                boxShadow: (t) => t.shadowTokens.brandSm,
                                "&:hover": {
                                    boxShadow: (t) => t.shadowTokens.brand,
                                },
                                "&:hover .MuiButton-endIcon svg": {
                                    transform: "translateX(3px)",
                                },
                            }}
                        >
                            {submitting ? (
                                <CircularProgress size={20} color="inherit" />
                            ) : (
                                "Sign in"
                            )}
                        </Button>
                    </Stack>

                    <Typography
                        variant="caption"
                        align="center"
                        sx={{
                            display: "block",
                            mt: 4,
                            color: "text.disabled",
                            ...field(5),
                        }}
                    >
                        Trouble signing in? Contact{" "}
                        <Link href="https://sealimited.com/" color="inherit">
                            S.E.A. Limited
                        </Link>{" "}
                        IT support.
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
