import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../Utilites/AuthContext";
import { isMobile } from "react-device-detect";
import { Box, CssBaseline, MenuItem, debounce } from "@mui/material";
import {
    AuthenticateUserAD,
    UserExistsInAD,
} from "../../../Utilites/Functions/ApiFunctions/UserFunctions";
import {
    GetLocations,
    showError,
} from "../../../Utilites/Functions/ApiFunctions";
import {
    CcButton,
    CcInput,
    CcSelect,
    CcSwitch,
    Field,
    HOVER,
    cc,
    focusRing,
    sp,
} from "../../Components/Concourse/ConcourseDialogKit";
import { type as ccType } from "../../../Utilites/concourse";
import logo from "../../../Assets/Images/sea-logo.png";

/* ------------------------------------------------------------- skeleton --- */

/**
 * The Concourse skeleton primitive (guide §3.7). Copied rather than imported —
 * it is not exported from the kit.
 */
const skSx = {
    position: "relative",
    overflow: "hidden",
    background: "currentColor",
    opacity: 0.08,
    color: cc.ink,
    borderRadius: "99px",
    "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        transform: "translateX(-100%)",
        background:
            "linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)",
        animation: "cc-shim 1400ms infinite",
    },
};

const Sk = ({ sx }) => <Box sx={{ ...skSx, ...sx }} />;

/* --------------------------------------------------------------- reveal --- */

/**
 * A repeatable reveal for the Location field, which mounts and unmounts every
 * time the AD check flips `showLocations`.
 *
 * It uses `cc-stag`'s *values* as a transition rather than the keyframe, the
 * way `SidePane` does (ConcourseDialogKit.jsx:562-571) — guide §5.5. The task
 * boundary only supplies the transition's starting value; the motion itself is
 * a CSS transition, so the global `prefers-reduced-motion` rule
 * (concourse.js:527-533) still reaches it. A timer rather than
 * `requestAnimationFrame` so a backgrounded tab cannot leave the field parked
 * at `opacity: 0` — the worst case here is that it appears without animating.
 */
const Reveal = ({ children }) => {
    const [shown, setShown] = useState(false);
    useEffect(() => {
        const id = setTimeout(() => setShown(true), 0);
        return () => clearTimeout(id);
    }, []);
    return (
        <Box
            sx={{
                minWidth: 0,
                opacity: shown ? 1 : 0,
                transform: shown ? "none" : "translateY(9px)",
                transition: `opacity 340ms ${sp}, transform 340ms ${sp}`,
            }}
        >
            {children}
        </Box>
    );
};

/* ------------------------------------------------------------- copyright --- */

function Copyright() {
    return (
        <Box
            sx={{
                boxSizing: "border-box",
                padding: "13px 22px 19px",
                borderTop: `1px solid ${cc.line}`,
                textAlign: "center",
                fontSize: "12.5px",
                color: cc.mute,
            }}
        >
            {"Copyright © "}
            <Box
                component="a"
                href="https://sealimited.com/"
                sx={{
                    color: cc.red,
                    textDecoration: "none",
                    borderRadius: "4px",
                    [HOVER]: { "&:hover": { textDecoration: "underline" } },
                    "&:focus-visible": focusRing,
                }}
            >
                S.E.A. Limited
            </Box>{" "}
            {new Date().getFullYear()}
            {"."}
        </Box>
    );
}

export default function Login({ setLoading, setDrawerOpen }) {
    const navigate = useNavigate();
    const { setUser, login } = useAuth();
    const [rememberMe, setRememberMe] = useState(false); // State to track "Remember me"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [locations, setLocations] = useState([]);
    // Render gate for the Location skeleton only — guide §3.7's `!hasLoaded`.
    const [hasLocationsLoaded, setHasLocationsLoaded] = useState(false);
    const [location, setLocation] = useState("");
    const [showLocations, setShowLocations] = useState(false);

    /*
     * Hoisted out of the mount effect so the "Try again" affordance below can
     * re-run it. Dropping `hasLocationsLoaded` back to false on a retry is
     * deliberate and is the reason no second "retrying" flag exists: it puts the
     * field back into the skeleton it already owns, which unmounts the empty
     * select and the retry button for the duration of the request. Unlike
     * MyAccount.js:355's never-resetting gate there is no typed-in form state to
     * protect here — the skeleton replaces a control the user cannot have used.
     *
     * `Array.isArray` because `GetLocations` returns `resp.data` verbatim on any
     * 2xx; a non-array body would otherwise reach `.map` below.
     */
    const loadLocations = useCallback(async () => {
        setLoading(true);
        setHasLocationsLoaded(false);
        const lcs = await GetLocations();
        setLocations(Array.isArray(lcs) ? lcs : []);
        setHasLocationsLoaded(true);
        setLoading(false);
    }, [setLoading]);

    useEffect(() => {
        loadLocations();
    }, [loadLocations]);

    // On component mount, check if user info exists in localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("authToken");
        const storedRememberMe = localStorage.getItem("rememberMe") == "true";

        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            // Navigate to last stored location (case-insensitive fallback)
            const lastLoc =
                localStorage.getItem("lastLocation") ||
                localStorage.getItem("lastlocation");
            if (lastLoc) {
                navigate(lastLoc);
            }
            login(JSON.parse(storedUser), storedToken);
        }
        if (storedRememberMe) {
            const email = localStorage.getItem("email");
            setRememberMe(true);
            setEmail(email || "");
        }
    }, []);

    const hasLocations = locations?.length > 0;

    /*
     * The list came back with nothing in it. `GetLocations` returns `[]` for a
     * genuinely empty list, for a non-2xx response AND for a thrown network
     * error, so this flag — and the copy it drives — deliberately does not say
     * which of the three happened, because this page cannot know.
     */
    const locationsUnavailable = hasLocationsLoaded && !hasLocations;

    /*
     * The submit gate, and the fix. It is `hasLocations` — not `showLocations` —
     * that decides, because a select holding no options cannot be satisfied:
     * gating on it strands the user on this page with nothing to pick, no way
     * forward and, until now, no way to retry. `hasLocations` is also false
     * while the request is still in flight, so a hung fetch that never lifts the
     * skeleton cannot become a lockout either.
     *
     * This turned into a real lockout when `userExistsInAd` was fixed to
     * `!!userAcc && !!userAcc.location`: the old `||` short-circuited true for
     * any account row, so a returning user with a null location was never shown
     * this field. UserFunctions.js:152 arrives at the same place by another
     * road — it returns the bare boolean `false` on a non-2xx, and
     * `false.accountCreated` is `undefined`, so `!undefined` reveals the field
     * for anyone whose AD check merely errored.
     *
     * Letting those users through opens no hole, because there is no rule on the
     * other side to enforce: loginAd's `400 "Location is required."`
     * (userController.js:485) is unreachable — `findOrCreate` resolves to
     * `[instance, created]`, so the preceding `if (exUser)` always wins. Signing
     * in with no location is precisely what this population did before the
     * backend fix, and `if (!exUser.location && location)` still backfills the
     * row on any later sign-in that does carry one.
     */
    const mustPickLocation = showLocations && hasLocations;

    const handleSubmit = (event) => {
        setLoading(true);
        event.preventDefault();
        /*
         * `mustPickLocation`, not `showLocations` — see above. The gate fires
         * only when the select is actually holding an option the user could
         * have chosen.
         */
        if (mustPickLocation && !location?.officeid) {
            showError("You must select your location");
            setLoading(false);
        } else {
            AuthenticateUserAD({
                email: email,
                password: password,
                location: location?.officeid,
            })
                .then((resp) => {
                    if (resp) {
                        console.log("Authentication response:", resp);
                        if (resp?.user && resp?.token) {
                            console.log("Setting user and connecting socket");
                            setUser(resp.user);
                            login(resp.user, resp.token);
                            setShowLocations(false);

                            if (rememberMe) {
                                localStorage.setItem("email", `${email}`);
                                localStorage.setItem("rememberMe", "true");
                            } else {
                                localStorage.removeItem("email");
                                localStorage.setItem("rememberMe", "false");
                            }
                            setLoading(false);
                            setDrawerOpen(isMobile ? false : true);
                            navigate(
                                isMobile
                                    ? "/schedule/type/week"
                                    : "/schedule/type/month"
                            );
                        } else if (resp?.id) {
                            // Fallback for existing response format without token
                            console.log(
                                "Fallback authentication - no token provided"
                            );
                            setUser(resp);
                            login(resp);
                            setShowLocations(false);
                            localStorage.setItem("user", JSON.stringify(resp));

                            if (rememberMe) {
                                localStorage.setItem("email", `${email}`);
                                localStorage.setItem("rememberMe", "true");
                            } else {
                                localStorage.removeItem("email");
                                localStorage.setItem("rememberMe", "false");
                            }
                            setLoading(false);
                            setDrawerOpen(isMobile ? false : true);
                            navigate(
                                isMobile
                                    ? "/schedule/type/week"
                                    : "/schedule/type/month"
                            );
                        }
                    } else {
                        setLoading(false);
                    }
                })
                .catch((error) => {
                    console.error("Authentication error:", error);
                    setLoading(false);
                });
        }
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
                    setShowPass(!resp.exists && !resp.accountCreated);
                });
            }, 1000),
        []
    );

    return (
        <Box
            component="main"
            sx={{
                // `minHeight: 100%` + `flexShrink: 0` (rather than a pinned
                // 100vh) hands overflow to App.js:247's scroller, so a short
                // viewport scrolls instead of clipping the card.
                minHeight: "100%",
                flexShrink: 0,
                boxSizing: "border-box",
                display: "grid",
                placeItems: "center",
                background: cc.grd,
                color: cc.ink,
                fontFamily: cc.sans,
                fontSize: "15px",
                lineHeight: 1.5,
                padding: "clamp(28px,9vh,76px) 18px 28px",
            }}
        >
            {/* One of only two CssBaseline mounts in the app — do not remove. */}
            <CssBaseline />

            <Box
                // §7.5 — the surface root owns the runtime accent, or anything
                // that paints `--cc-c` falls back to the meeting-type green.
                style={{ "--cc-c": "var(--cc-red)" }}
                sx={{
                    width: "100%",
                    maxWidth: "420px",
                    boxSizing: "border-box",
                    background: cc.srf,
                    borderRadius: "26px",
                    boxShadow: cc.sh2,
                    overflow: "hidden",
                    animation: `cc-rise 500ms ${sp} 80ms both`,
                    "@media (max-width:620px)": { borderRadius: "22px" },
                }}
            >
                <Box
                    sx={{
                        boxSizing: "border-box",
                        padding: "26px 22px 6px",
                        display: "grid",
                        justifyItems: "center",
                        gap: "10px",
                    }}
                >
                    <Box
                        component="img"
                        src={logo}
                        alt="S.E.A. Limited"
                        sx={{
                            display: "block",
                            height: "40px",
                            width: "auto",
                            flex: "none",
                        }}
                    />
                </Box>

                <Box
                    sx={{
                        boxSizing: "border-box",
                        padding: "0 22px 4px",
                        display: "grid",
                        gap: "4px",
                        textAlign: "center",
                    }}
                >
                    <Box
                        component="h1"
                        sx={{ ...ccType.dialogTitle, margin: 0, color: cc.ink }}
                    >
                        Sign in
                    </Box>
                </Box>

                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <Box
                        sx={{
                            boxSizing: "border-box",
                            padding: "4px 22px 20px",
                            display: "grid",
                            gap: "13px",
                            alignContent: "start",
                        }}
                    >
                        <Field
                            label="S-E-A Username"
                            required
                            htmlFor="email"
                        >
                            <CcInput
                                id="email"
                                name="Email"
                                type="username"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    debouncedCheckUserAd(e.target.value);
                                }}
                                onBlur={() =>
                                    UserExistsInAD({
                                        username: email,
                                    }).then((resp) =>
                                        setShowLocations(!resp.accountCreated)
                                    )
                                }
                                autoFocus
                            />
                        </Field>

                        <Field label="Password" required htmlFor="password">
                            <CcInput
                                id="password"
                                name="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </Field>

                        {showLocations ? (
                            <Reveal>
                                <Field
                                    label={
                                        <Box
                                            component="span"
                                            id="demo-simple-select-standard-label"
                                        >
                                            Location
                                        </Box>
                                    }
                                    // The `required` mark is dropped once the
                                    // list is known to be empty, because at that
                                    // point the form genuinely does not require
                                    // it — `mustPickLocation` is false and
                                    // submit goes through. Leaving the badge up
                                    // would assert a rule nothing enforces.
                                    required={!locationsUnavailable}
                                    htmlFor="location"
                                    // `GetLocations` returns `[]` for a genuinely
                                    // empty list, for an API error AND for a
                                    // thrown/network error, so the page cannot
                                    // tell "there are no offices" from "the
                                    // request failed". The hint therefore states
                                    // only what is true in all three branches.
                                    // Integrator ruling, overriding the spec's
                                    // "No locations are available."; the first
                                    // sentence is MyAccount.js:351's, so the one
                                    // Location select in this app speaks with one
                                    // voice. The second sentence is a fact about
                                    // this form's own gate, which it does know —
                                    // not a promise about the server.
                                    //
                                    // The retry rides in the hint slot rather
                                    // than beside the select so the explanation
                                    // comes before the remedy, matching the
                                    // body-then-`actions` order every other
                                    // "Try again" in the app uses (Rooms.js:1159,
                                    // MyBookings.js:1156, Users.js:1488). It is
                                    // the only in-session way out: the list is
                                    // fetched once on mount, so without it a user
                                    // who loaded the page during an outage had to
                                    // reload to get another attempt. CcButton
                                    // defaults to `type="button"`, so it cannot
                                    // submit the form it sits inside.
                                    hint={
                                        locationsUnavailable ? (
                                            <>
                                                Locations are unavailable right
                                                now. You can sign in without
                                                choosing one.
                                                <Box sx={{ marginTop: "7px" }}>
                                                    <CcButton
                                                        onClick={loadLocations}
                                                        sx={{
                                                            padding: "6px 13px",
                                                            fontSize: "12.5px",
                                                        }}
                                                    >
                                                        Try again
                                                    </CcButton>
                                                </Box>
                                            </>
                                        ) : undefined
                                    }
                                >
                                    {hasLocationsLoaded ? (
                                        <CcSelect
                                            labelId="demo-simple-select-standard-label"
                                            id="location"
                                            // Both mirror `mustPickLocation` so
                                            // the control never advertises a
                                            // requirement it cannot satisfy.
                                            // `disabled` also stops the empty
                                            // menu opening onto nothing.
                                            required={!locationsUnavailable}
                                            disabled={locationsUnavailable}
                                            value={location?.officeid || ""}
                                            name="location"
                                            ariaLabel="Location"
                                            onChange={(e) => {
                                                const selectedItem =
                                                    locations?.find(
                                                        (itm) =>
                                                            itm?.officeid ===
                                                            e.target.value
                                                    );
                                                setLocation(selectedItem); // Return the entire object
                                            }}
                                        >
                                            {locations?.length > 0 &&
                                                locations?.map((itm, index) => (
                                                    <MenuItem
                                                        key={index}
                                                        value={itm?.officeid}
                                                    >
                                                        {itm?.Alias}
                                                    </MenuItem>
                                                ))}
                                        </CcSelect>
                                    ) : (
                                        // Shaped like the control it
                                        // replaces: 21px line + 20px padding
                                        // + the 1.5px border pair, measured at
                                        // 43px in headless Chrome at dpr 1.
                                        <Sk
                                            sx={{
                                                height: "43px",
                                                borderRadius: "14px",
                                            }}
                                        />
                                    )}
                                </Field>
                            </Reveal>
                        ) : (
                            <></>
                        )}

                        <CcSwitch
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(next) =>
                                handleRememberMeChange({
                                    target: { checked: next },
                                })
                            }
                            label="Remember me"
                        />

                        <CcButton
                            variant="primary"
                            type="submit"
                            sx={{ width: "100%", justifyContent: "center" }}
                        >
                            Sign In
                        </CcButton>
                    </Box>

                    <Copyright />
                </Box>
            </Box>
        </Box>
    );
}
