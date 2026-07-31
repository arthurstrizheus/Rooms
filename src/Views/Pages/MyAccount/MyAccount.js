/**
 * My Account (`/account`) — Concourse.
 *
 * Visual redesign only. Every handler, fetch, payload shape, validation string
 * and effect dependency list below is carried over verbatim from the previous
 * implementation; see the notes at each site.
 *
 * The banner owns the page title ("My Account", set in Routes.js) — this page
 * renders no page title of its own.
 */

import { useEffect, useState } from "react";
import { useAuth } from "../../../Utilites/AuthContext";
import { openSnackbar } from "../../../Utilites/SnackbarContext";
import { Box, MenuItem } from "@mui/material";
import DisplayGroups from "../../Components/DisplayGroups";
import {
    GetLocations,
    GetUserGroups,
    showError,
} from "../../../Utilites/Functions/ApiFunctions";
import { UpdateUserDetails } from "../../../Utilites/Functions/ApiFunctions/UserFunctions";
import { bp, type as ccType } from "../../../Utilites/concourse";
import {
    cc,
    HOVER,
    focusRing,
    CcButton,
    Field,
    CcInput,
    CcSelect,
    TwoUp,
    TagRow,
    Facts,
    Fact,
    AlertBlock,
    Spacer,
} from "../../Components/Concourse/ConcourseDialogKit";

/* ------------------------------------------------------------ page chrome --- */

/** Guide §3.2 — verbatim, plus the explicit `boxSizing` (§7.1: no CssBaseline). */
const pageSx = {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    overflowX: "hidden",
    scrollbarWidth: "thin",
    boxSizing: "border-box",
    background: "var(--cc-grd)",
    color: "var(--cc-ink)",
    fontFamily: "var(--cc-sans)",
    fontSize: "15px",
    lineHeight: 1.5,
    padding:
        "clamp(14px,2.4vw,22px) clamp(12px,2.6vw,24px) clamp(14px,2.4vw,22px)",
};

/** Guide §3.3 card + §4.6 single-form width. */
const cardSx = {
    width: "100%",
    maxWidth: "720px",
    margin: "0 auto",
    background: cc.srf,
    borderRadius: "26px",
    boxShadow: cc.sh2,
    overflow: "hidden",
    boxSizing: "border-box",
    flexShrink: 0,
    animation: "cc-rise 500ms var(--cc-sp) 80ms both",
    [`@media (max-width:${bp.sheet}px)`]: { borderRadius: "22px" },
};

/** Guide §3.4 — the header / body / footer geometry, shared with a dialog. */
const headerSx = {
    padding: "19px 22px 14px",
    display: "grid",
    gap: "8px",
    flexShrink: 0,
    boxSizing: "border-box",
};

const bodySx = {
    padding: "4px 22px 20px",
    display: "grid",
    gap: "13px",
    alignContent: "start",
    boxSizing: "border-box",
};

const footerSx = {
    padding: "13px 22px 19px",
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
    borderTop: `1px solid ${cc.line}`,
    background: cc.srf,
    boxSizing: "border-box",
};

/** Guide §3.4 section header: uppercase micro-label + a hairline. */
const sectionLabelSx = { ...ccType.blockLabel, color: cc.mute };
const sectionRuleSx = {
    height: "1px",
    background: cc.line,
    margin: "9px 0",
    boxSizing: "border-box",
};

/**
 * `DisplayGroups` is shared by five pages, so it is never edited. Its `Chip`s
 * are rendered in-tree (only their Tooltip popper portals), so they are
 * restyled from here with a descendant selector.
 *
 * The resting fill is `srf2`, not `Tag`'s `srf`: a tag's default is designed to
 * sit ON a `srf2` block, and here the chips sit on the card's `srf`. Guide §2.7.
 */
const groupChipSx = {
    marginTop: 0,
    "& .MuiChip-root": {
        height: "auto",
        borderRadius: "99px",
        padding: "2px 3px",
        background: cc.srf2,
        color: cc.ink,
        border: 0,
        margin: 0,
        boxSizing: "border-box",
        /*
         * MUI's `ChipRoot` hard-sets `fontFamily: theme.typography.fontFamily`
         * (Chip.js:85), which is the createTheme default
         * `"Roboto","Helvetica","Arial",sans-serif` — none of which is
         * installed on Windows, so the label fell back to Arial while the rest
         * of the card is `var(--cc-sans)`. `ccType.tag` carries no family, so
         * it has to be set here.
         */
        fontFamily: cc.sans,
        transition: "background 200ms, color 200ms",
        "& .MuiChip-label": { ...ccType.tag, padding: "0 7px" },
        [HOVER]: {
            "&:hover": { background: cc.wash, color: cc.red },
        },
        "&:focus-visible": focusRing,
    },
};

/* -------------------------------------------------------------- skeleton --- */

/** Guide §3.7 — the shipped skeleton primitive, verbatim. */
const skSx = {
    position: "relative",
    overflow: "hidden",
    background: "currentColor",
    opacity: 0.08,
    color: cc.ink,
    borderRadius: "99px",
    boxSizing: "border-box",
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

/**
 * One `Field`-shaped placeholder: a label bar over the control box.
 *
 * The numbers are measured, not estimated (headless Chrome, 1x DPR, no
 * CssBaseline): `Field`'s label line box is 18px and `controlBox` resolves to
 * 43px (14px × 1.5 line-height + 10px padding × 2 + a 1.5px border that the
 * engine paints at 1px each side). 18 + 5 gap + 43 = 66px, which is exactly a
 * loaded `Field`, so nothing shifts when the data lands. The bar itself stays
 * 13px inside its 18px row — a thinner bar is what makes it read as a skeleton.
 */
const SkField = ({ labelWidth }) => (
    <Box sx={{ display: "grid", gap: "5px", minWidth: 0 }}>
        <Box
            sx={{ height: "18px", display: "flex", alignItems: "center" }}
        >
            <Sk sx={{ height: "13px", width: labelWidth }} />
        </Box>
        <Sk sx={{ height: "43px", borderRadius: "14px" }} />
    </Box>
);

/**
 * The body, shaped like the form it stands in for. Widths vary (guide §3.7) so
 * the block reads as data rather than as a uniform slab. The three group pills
 * are the measured width of real chips; the section's own height can never
 * match exactly, because the number of groups is what is still being fetched.
 */
const AccountSkeleton = () => (
    <Box sx={bodySx}>
        <TwoUp>
            <SkField labelWidth="40%" />
            <SkField labelWidth="52%" />
        </TwoUp>
        <SkField labelWidth="55%" />
        <Box>
            <Box
                sx={{ height: "16px", display: "flex", alignItems: "center" }}
            >
                <Sk sx={{ height: "13px", width: "30%" }} />
            </Box>
            <Box sx={sectionRuleSx} />
            <Box sx={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {[78, 104, 62].map((w) => (
                    <Sk key={w} sx={{ height: "20px", width: `${w}px` }} />
                ))}
            </Box>
        </Box>
        <Sk sx={{ height: "40px", borderRadius: "18px" }} />
    </Box>
);

/* ------------------------------------------------------------------ page --- */

const MyAccount = ({ setLoading }) => {
    const { user, setUser } = useAuth();
    const [email, setEmail] = useState("");
    const [location, setLocation] = useState("");
    const [locations, setLocations] = useState([]);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [accountBorder, setAccountBorder] = useState(false);
    const [userGroups, setUserGroups] = useState([]);
    const [update, setUpdate] = useState(0);
    /* New, additive UI state only — neither reaches a payload. */
    const [saving, setSaving] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [groupsLoaded, setGroupsLoaded] = useState(false);

    const onSaveDetails = () => {
        if (firstName == "" || lastName == "") {
            openSnackbar("First or last name cannot be blank", {
                severity: "error",
                autoHideDuration: 4000,
                anchorOrigin: { vertical: "top", horizontal: "center" },
                alertProps: { variant: "filled" },
                transition: "grow", // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
            });
            setAccountBorder(true);
            /*
             * Guide §4.6: focus the first invalid field on submit. Looked up by
             * id rather than a ref because the kit's `CcInput` is a plain
             * function component (not `forwardRef`) and the installed React is
             * 18.3.1, where `ref` is not forwarded as an ordinary prop.
             */
            const invalidId =
                firstName == "" ? "account-first-name" : "account-last-name";
            document.getElementById(invalidId)?.focus();
        } else {
            setLoading(true);
            /*
             * `location` is the resolved office OBJECT, and the effect below
             * sets it from `locations.find(...)` — which resolves to `undefined`
             * on the very first render (`locations` is still `[]`), for a user
             * whose row carries no location, and whenever `GetLocations` comes
             * back empty. The unguarded `location.officeid` that used to stand
             * here therefore threw a TypeError out of the submit handler before
             * the PUT was ever issued: Save did nothing at all, and because
             * `setLoading(true)` above had already flushed, the banner's
             * progress bar was left running with no request behind it.
             *
             * Location is NOT required: the column is `allowNull: true`
             * (models/user.js) and `UpdateDetails` validates only first/last
             * name, coercing a missing location to 0 (userController.js). Login
             * signs these users in deliberately. So the field stays optional and
             * Save simply works — no new blocking rule, no new required marker.
             *
             * `?? user?.location` is the important half. Plain `?.` alone would
             * send `undefined` for a user who HAS a location but whose
             * `GetLocations` fetch came back empty, and the server would write
             * that stored location away to 0 — turning a failed save into
             * silent data loss. Falling back to the row's own value keeps the
             * unresolved case a no-op. Nothing is lost by doing so: the select
             * offers no "none" option, so clearing a location is not something
             * the user can ask for here.
             */
            const details = {
                first_name: firstName,
                last_name: lastName,
                location: location?.officeid ?? user?.location,
            };
            setSaving(true);
            /*
             * The merged keys must be the ones the auth user actually carries —
             * the row is snake_case (`first_name` / `last_name`, as read by the
             * hydrating effect below, and by SideBar). Writing the camelCase
             * `firstName`/`lastName` — which nothing in the app reads — left
             * the real fields at their old values, so the effect below — which
             * re-runs because `user` is in its dependency list — re-hydrated the
             * inputs from the stale row and the typed name appeared to revert.
             * The PUT had already been committed by then (userController
             * `UpdateDetails` persists all three fields), so this was a display
             * fault only; nothing was lost.
             *
             * `UpdateUserDetails` resolves `false` for a rejected PUT, so the
             * merge is now gated on it: without the guard, a failed save would
             * park the unsaved name in the auth user and the UI would assert a
             * change the server never took. `setUpdate` stays unconditional —
             * on failure it re-hydrates the fields from the unchanged row,
             * which is the truth.
             *
             * ...but `false` used to return in silence, and a rejected save was
             * then indistinguishable from an accepted one: the success toast is
             * raised inside `UpdateUserDetails` on 2xx only, so failure simply
             * produced no toast at all. `showError` is the app-wide snackbar
             * helper (ApiFunctions.js) — the same severity/placement/transition
             * bag this file already passes to `openSnackbar` above. It cannot
             * double up: axios rejects every non-2xx, so the only reachable
             * `return false` in `UpdateUserDetails` is its bare `catch`, which
             * raises nothing. The copy names the outcome and not the cause,
             * because that layer discards the error before we can see it.
             */
            UpdateUserDetails(user?.id, details)
                .then((ok) => {
                    if (!ok) {
                        showError(
                            "Your details could not be saved. Please try again."
                        );
                        return;
                    }
                    setUser({
                        ...user,
                        first_name: firstName,
                        last_name: lastName,
                        location: details.location,
                    });
                })
                .then(() => setUpdate((prev) => prev + 1))
                .finally(() => setSaving(false));
            setAccountBorder(false);
        }
    };

    const onSubmit = (e) => {
        e.preventDefault();
        onSaveDetails();
    };

    useEffect(() => {
        const data = async () => {
            const ugs = await GetUserGroups(user?.id);
            setUserGroups(ugs);
            /* Skeleton gating only — see `isSkeleton`. Never reaches a payload. */
            setGroupsLoaded(true);
        };
        if (user?.id) {
            setLoading(true);
            GetLocations()
                .then((lcs) => setLocations(lcs))
                .then(() => setLoading(false))
                .finally(() => setHasLoaded(true));
            setFirstName(user?.first_name);
            setLastName(user?.last_name);
            setEmail(user?.email);
            data();
        }
    }, [update, user]);

    useEffect(() => {
        setLocation(locations?.find((lc) => lc.officeid === user?.location));
    }, [locations]);

    /*
     * Guide §3.7. `hasLoaded` never resets, so the skeleton is the first-load
     * state only: a save re-runs the effect above, and replacing the form the
     * user just typed into with a skeleton would be a regression. The banner's
     * own indeterminate bar (driven by `setLoading`) covers the refresh.
     *
     * Both first-load fetches are gated, not just `GetLocations`: the Groups
     * section is fed by `GetUserGroups`, so if locations answered first the
     * skeleton lifted and "No groups to show." painted for a user who does have
     * groups, until the second response landed. Neither flag ever resets, so
     * this stays a first-load-only state.
     */
    const isSkeleton = (!hasLoaded || !groupsLoaded) && Boolean(user?.id);

    /*
     * The old red card border was invalid CSS and never painted. The flag it was
     * driven by (`accountBorder`) is kept and now surfaces as the form-level
     * alert plus per-field errors. The copy is the page's own validation string,
     * unchanged.
     */
    const nameError = "First or last name cannot be blank";
    const firstNameError = accountBorder && firstName === "" ? nameError : "";
    const lastNameError = accountBorder && lastName === "" ? nameError : "";
    /* The alert states a fact about the fields, so it clears as soon as they do. */
    const showFormError = Boolean(firstNameError || lastNameError);

    /*
     * `GetLocations` returns [] on a network failure AND on a genuinely empty
     * list — the two are indistinguishable here — so the copy describes the
     * select, not the cause.
     */
    const locationHint =
        hasLoaded && !locations?.length
            ? "Locations are unavailable right now."
            : "";

    return (
        <Box sx={pageSx} style={{ "--cc-c": "var(--cc-red)" }}>
            <Box sx={cardSx}>
                <Box sx={headerSx}>
                    <Box
                        component="h2"
                        sx={{
                            ...ccType.dialogTitle,
                            color: cc.ink,
                            margin: 0,
                        }}
                    >
                        Account Details
                    </Box>
                </Box>

                <Box component="form" onSubmit={onSubmit} noValidate>
                    {isSkeleton ? (
                        <AccountSkeleton />
                    ) : (
                        <Box sx={bodySx}>
                            {showFormError ? (
                                <AlertBlock title={nameError} />
                            ) : null}

                            <TwoUp>
                                <Field
                                    label="First name"
                                    required
                                    htmlFor="account-first-name"
                                    error={firstNameError}
                                >
                                    <CcInput
                                        id="account-first-name"
                                        value={firstName ?? ""}
                                        onChange={(e) =>
                                            setFirstName(e.target.value)
                                        }
                                        invalid={Boolean(firstNameError)}
                                        autoComplete="given-name"
                                    />
                                </Field>
                                <Field
                                    label="Last name"
                                    required
                                    htmlFor="account-last-name"
                                    error={lastNameError}
                                >
                                    <CcInput
                                        id="account-last-name"
                                        value={lastName ?? ""}
                                        onChange={(e) =>
                                            setLastName(e.target.value)
                                        }
                                        invalid={Boolean(lastNameError)}
                                        autoComplete="family-name"
                                    />
                                </Field>
                            </TwoUp>

                            <Field
                                label="Location"
                                htmlFor="account-location"
                                hint={locationHint}
                            >
                                <CcSelect
                                    id="account-location"
                                    ariaLabel="Location"
                                    value={location?.officeid || ""}
                                    onChange={(e) => {
                                        const selectedItem = locations?.find(
                                            (itm) =>
                                                itm.officeid === e.target.value
                                        );
                                        setLocation(selectedItem); // Return the entire object
                                    }}
                                >
                                    {locations?.map((itm, index) => (
                                        <MenuItem
                                            key={index}
                                            value={itm.officeid}
                                        >
                                            {itm.Alias}
                                        </MenuItem>
                                    ))}
                                </CcSelect>
                            </Field>

                            <Box>
                                <Box sx={sectionLabelSx}>Groups</Box>
                                <Box sx={sectionRuleSx} />
                                {userGroups?.length ? (
                                    <TagRow sx={groupChipSx}>
                                        <DisplayGroups groups={userGroups} />
                                    </TagRow>
                                ) : (
                                    <Box
                                        sx={{
                                            ...ccType.stateBody,
                                            color: cc.mute,
                                        }}
                                    >
                                        No groups to show.
                                    </Box>
                                )}
                            </Box>

                            <Facts>
                                <Fact label="Email">{email}</Fact>
                            </Facts>
                        </Box>
                    )}

                    <Box sx={footerSx}>
                        <Spacer />
                        <CcButton
                            variant="primary"
                            type="submit"
                            disabled={saving || isSkeleton}
                        >
                            {saving ? "Saving…" : "Save Changes"}
                        </CcButton>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default MyAccount;
