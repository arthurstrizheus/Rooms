/**
 * AddNewUser — the create / edit user dialog.
 *
 * Concourse redesign. Visual only. Byte-identical and deliberately untouched:
 *   - `emailPattern` and the `!emailPattern.test(email) && email !== ""`
 *     predicate, plus the helper string `***.***@***.com OR ***@***.com`;
 *   - the submit guard and its `showError("Fields cannot be empty")`;
 *   - the `PostUser` / `UpdateUser` / `PostGroupUser` / `DeleteGroupUserById`
 *     payloads, field for field, including the create/update asymmetry
 *     (`office_admin: null` on create, `officeAdmin` on update);
 *   - the two group-option filters, the `locations.filter(lc => lc.Alias !=
 *     "All")` list and its trailing `<MenuItem key={999} value="">None</…>`;
 *   - `onClose`'s reset list (which still does NOT reset `officeAdmin` —
 *     recon §7.9, report-only) and the `[selectedUser, userLocation]` effect;
 *   - the `user?.admin` gate on the Admin switch.
 *
 * Changed on purpose, per spec:
 *   - the frame is `scopeDialogProps(560)` + `DialogSurface`/`DialogHeader`/
 *     `DialogBody`/`DialogFooter`; the `Courier New` title and the `<Divider>`
 *     are dropped because `DialogHeader` carries both roles;
 *   - `accent="var(--cc-red)"` — without it `--cc-c` falls back to the
 *     meeting-type green and the header wash goes green (guide §7.5);
 *   - the MUI `Switch` is `CcSwitch`. **Its `onChange` hands back a boolean**,
 *     so `setAdmin` is passed directly; the old `e.target.checked` would put
 *     `undefined` into the `admin` payload field. The whole
 *     `theme.palette.mode === "dark"` branch is deleted (guide §0.1);
 *   - a `Cancel` button is added. It calls the existing `onClose` and nothing
 *     else — the dialog previously had no dismiss control at all.
 *   - `submitAttempted` is new, presentational state: it turns on `invalid`
 *     for whichever of the four guarded fields is empty and focuses the first
 *     one. It mirrors the guard exactly and changes no payload.
 *
 * Deliberately NOT added: a pending / `Saving…` state. `onSubmit` is
 * fire-and-forget and `onClose()` runs synchronously, so a real pending flag
 * would mean restructuring the promise chain — a behaviour change. Reported.
 */

import { useEffect, useState } from "react";
import { Box, Dialog, MenuItem, Tooltip } from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { type as ccType } from "../../../../Utilites/concourse";
import {
    CcButton,
    CcInput,
    CcSelect,
    CcSwitch,
    DialogBody,
    DialogFooter,
    DialogHeader,
    DialogSurface,
    Field,
    scopeDialogProps,
    Spacer,
    Tag,
    TagRow,
    TwoUp,
} from "../../../Components/Concourse/ConcourseDialogKit";
import { btnReset, hover } from "../../../Components/Banner/Components/atoms";
import { ccTooltipSlotProps } from "./UsersConcourse";
import {
    PostUser,
    UpdateUser,
} from "../../../../Utilites/Functions/ApiFunctions/UserFunctions";
import {
    DeleteGroupUserById,
    PostGroupUser,
} from "../../../../Utilites/Functions/ApiFunctions/GroupUsersFunctions";
import { useAuth } from "../../../../Utilites/AuthContext";
import {
    showError,
    showSuccess,
} from "../../../../Utilites/Functions/ApiFunctions";

const emailPattern = /^[^\s@]+(\.[^\s@]+)?@[^\s@]+\.[^\s@]+$/;

/* --------------------------------------------------------------- styles --- */

const groupLabelSx = {
    ...ccType.blockLabel,
    color: "var(--cc-mute)",
    marginBottom: "8px",
};

const permissionsBoxSx = {
    background: "var(--cc-srf2)",
    borderRadius: "18px",
    padding: "14px",
    display: "grid",
    gap: "12px",
    boxSizing: "border-box",
};

/**
 * A control sitting inside the `srf2` permissions group inverts to `srf`, the
 * same way `Tag` and the status pill do (guide §2.7 / §4.10), or it vanishes
 * into the block behind it.
 */
const insetControlSx = { background: "var(--cc-srf)" };

/** The multi-select chip row: the original's 105px scroll box, in Tag form. */
const chipRowSx = {
    marginTop: 0,
    maxHeight: "105px",
    overflowY: "auto",
    scrollbarWidth: "thin",
    boxSizing: "border-box",
};

const passwordWrapSx = { position: "relative", minWidth: 0 };

const passwordToggleSx = {
    ...btnReset,
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "24px",
    height: "24px",
    borderRadius: "99px",
    boxSizing: "border-box",
    color: "var(--cc-mute)",
    transition: "color 200ms",
    ...hover({ color: "var(--cc-ink)" }),
};

/* ------------------------------------------------------------ component --- */

const AddNewUser = ({
    open,
    setOpen,
    groups,
    userLocation,
    userGroups,
    selectedUser,
    locations,
    setUpdate,
    filterLocation,
}) => {
    const { user } = useAuth();
    const [admin, setAdmin] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [location, setLocation] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [viewPassword, setViewPassword] = useState(false);
    const [fullControl, setFullControl] = useState([]);
    const [readAccess, setReadAccess] = useState([]);
    const [oldFullControl, setOldFullControl] = useState([]);
    const [oldReadAccess, setOldReadAccess] = useState([]);
    const [officeAdmin, setOfficeAdmin] = useState("");
    // Presentational only — see the header note.
    const [submitAttempted, setSubmitAttempted] = useState(false);

    const onClose = () => {
        setOpen(false);
        // if (!selectedUser) {
        setLocation("");
        setEmail("");
        setFirstName("");
        setPassword("");
        setLastName("");
        setAdmin(false);
        setFullControl([]);
        setReadAccess([]);
        setOldFullControl([]);
        setOldReadAccess([]);
        // }
        setSubmitAttempted(false);
    };

    /** Mirrors the submit guard exactly; invents no rule of its own. */
    const focusFirstInvalid = () => {
        const target =
            firstName === ""
                ? "u-first"
                : lastName === ""
                ? "u-last"
                : !(location?.officeid || location?.officeid === 0)
                ? "u-loc"
                : email === ""
                ? "u-email"
                : null;
        if (target) document.getElementById(target)?.focus();
    };

    const onSubmit = () => {
        setSubmitAttempted(true);
        if (
            firstName !== "" &&
            lastName !== "" &&
            (location?.officeid || location?.officeid === 0) &&
            email !== ""
        ) {
            if (!selectedUser?.id) {
                PostUser({
                    first_name: firstName,
                    last_name: lastName,
                    location: location.officeid,
                    created_user_id: user?.id,
                    email: email,
                    password: password,
                    admin: admin,
                    active: true,
                    office_admin: officeAdmin != "" ? officeAdmin : null,
                })
                    .then(async (resp) => {
                        if (resp) {
                            showSuccess("User Created");
                            let promises = fullControl?.map(async (fc) =>
                                PostGroupUser({
                                    group_id: fc,
                                    user_id: resp.id,
                                    created_user_id: user?.id,
                                })
                            );
                            await Promise.all(promises);
                            promises = readAccess?.map(async (or) =>
                                PostGroupUser({
                                    group_id: or,
                                    user_id: resp.id,
                                    created_user_id: user?.id,
                                })
                            );
                            await Promise.all(promises);
                        }
                    })
                    .then(() => setUpdate((prev) => prev + 1));
            } else {
                UpdateUser(selectedUser?.id, {
                    first_name: firstName,
                    last_name: lastName,
                    location: location.officeid,
                    email: email,
                    admin: admin,
                    office_admin: officeAdmin,
                })
                    .then((resp) => {
                        if (resp) {
                            // Add new groups
                            fullControl?.map((fc) =>
                                oldFullControl?.find((ofc) => ofc === fc)
                                    ? null
                                    : PostGroupUser({
                                          group_id: fc,
                                          user_id: selectedUser?.id,
                                          created_user_id: user?.id,
                                      })
                            );
                            readAccess?.map((or) =>
                                oldReadAccess?.find((ora) => ora === or)
                                    ? null
                                    : PostGroupUser({
                                          group_id: or,
                                          user_id: selectedUser?.id,
                                          created_user_id: user?.id,
                                      })
                            );
                            // Delete removed groups
                            oldFullControl?.map((ofc) =>
                                fullControl?.find((fc) => ofc === fc)
                                    ? null
                                    : DeleteGroupUserById({
                                          group_id: ofc,
                                          user_id: selectedUser?.id,
                                      })
                            );
                            oldReadAccess?.map((ora) =>
                                readAccess?.find((or) => ora === or)
                                    ? null
                                    : DeleteGroupUserById({
                                          group_id: ora,
                                          user_id: selectedUser?.id,
                                      })
                            );
                        }
                    })
                    .then(() => setUpdate((prev) => prev + 1));
            }
            onClose();
        } else {
            showError("Fields cannot be empty");
            focusFirstInvalid();
        }
    };

    const handleFullControlChange = (event) => {
        const {
            target: { value },
        } = event;
        setFullControl(
            // Ensure that value is always an array of IDs.
            typeof value === "string" ? value.split(",") : value
        );
    };
    const handleReadAccessChange = (event) => {
        const {
            target: { value },
        } = event;
        setReadAccess(
            // Ensure that value is always an array of IDs.
            typeof value === "string" ? value.split(",") : value
        );
    };
    useEffect(() => {
        if (selectedUser) {
            setLocation(userLocation);
            setFirstName(selectedUser?.first_name);
            setLastName(selectedUser?.last_name);
            setEmail(selectedUser?.email);
            setAdmin(selectedUser?.admin);
            setOfficeAdmin(selectedUser?.office_admin);
            const usersGroups = [];
            userGroups
                .filter((gp) => gp.user_id == selectedUser?.id)
                ?.map((ug) =>
                    usersGroups.push(groups?.find((gp) => gp.id == ug.group_id))
                );
            usersGroups?.map((ug) => {
                if (ug.access == "Full" && !fullControl.includes(ug.id)) {
                    fullControl.push(ug.id);
                    oldFullControl.push(ug.id);
                } else if (!readAccess.includes(ug.id)) {
                    readAccess.push(ug.id);
                    oldReadAccess.push(ug.id);
                }
            });
        }
    }, [selectedUser, userLocation]);

    /* -- derived, presentational ------------------------------------------ */

    const emailInvalid = !emailPattern.test(email) && email !== "";
    const missing = (value) => submitAttempted && value === "";
    const locationMissing =
        submitAttempted && !(location?.officeid || location?.officeid === 0);

    const renderChips = (selected) => (
        <TagRow sx={chipRowSx}>
            {selected?.map((value) => (
                <Tag key={value}>
                    {groups?.find((gp) => gp.id === value)?.group_name}
                </Tag>
            ))}
        </TagRow>
    );

    return (
        <Dialog open={!!open} onClose={onClose} {...scopeDialogProps(560)}>
            <DialogSurface accent="var(--cc-red)">
                <DialogHeader
                    title={`${selectedUser ? "Edit" : "Add"} User`}
                    onClose={onClose}
                />
                <DialogBody>
                    <TwoUp>
                        <Field label="First Name" required htmlFor="u-first">
                            <CcInput
                                id="u-first"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                invalid={missing(firstName)}
                                autoComplete="off"
                            />
                        </Field>
                        <Field label="Last Name" required htmlFor="u-last">
                            <CcInput
                                id="u-last"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                invalid={missing(lastName)}
                                autoComplete="off"
                            />
                        </Field>
                    </TwoUp>

                    <Field
                        label="Email"
                        required
                        htmlFor="u-email"
                        error={
                            emailInvalid
                                ? "***.***@***.com OR ***@***.com"
                                : undefined
                        }
                    >
                        <CcInput
                            id="u-email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                const value = e.target.value;
                                setEmail(value);
                            }}
                            invalid={emailInvalid || missing(email)}
                            autoComplete="off"
                        />
                    </Field>

                    <Field label="Location" required>
                        <CcSelect
                            // The id is what `focusFirstInvalid` focuses. MUI
                            // then builds `aria-labelledby` from it, which on
                            // this element points AT ITSELF and would make the
                            // accessible name the selected office instead of
                            // "Location"; clearing it lets `aria-label` win.
                            SelectDisplayProps={{
                                id: "u-loc",
                                "aria-labelledby": undefined,
                            }}
                            ariaLabel="Location"
                            invalid={locationMissing}
                            value={location?.officeid || ""}
                            onChange={(e) => {
                                const selectedItem = locations?.find(
                                    (itm) => itm.officeid === e.target.value
                                );
                                setLocation(selectedItem); // Return the entire object
                            }}
                        >
                            {locations?.map((itm, index) => (
                                <MenuItem key={index} value={itm.officeid}>
                                    {itm.Alias}
                                </MenuItem>
                            ))}
                        </CcSelect>
                    </Field>

                    <Field
                        label="Full Control"
                        hint="Full access groups user is in"
                    >
                        <CcSelect
                            ariaLabel="Full Control"
                            multiple
                            value={fullControl}
                            onChange={handleFullControlChange}
                            renderValue={renderChips}
                        >
                            {groups
                                .filter(
                                    (gp) =>
                                        (gp.access != "Read" &&
                                            gp.location ===
                                                filterLocation?.officeid) ||
                                        (gp.access != "Read" &&
                                            filterLocation?.officeid == 0)
                                )
                                ?.map((name, index) => (
                                    <MenuItem key={index} value={name.id}>
                                        {name.group_name}
                                    </MenuItem>
                                ))}
                        </CcSelect>
                    </Field>

                    <Field
                        label="Read Access"
                        hint="Read access groups user is in"
                    >
                        <CcSelect
                            ariaLabel="Read Access"
                            multiple
                            value={readAccess}
                            onChange={handleReadAccessChange}
                            renderValue={renderChips}
                        >
                            {groups
                                .filter(
                                    (gp) =>
                                        (gp.access != "Full" &&
                                            gp.location ===
                                                filterLocation?.officeid) ||
                                        (gp.access != "Full" &&
                                            filterLocation?.officeid == 0)
                                )
                                ?.map((name, index) => (
                                    <MenuItem key={index} value={name.id}>
                                        {name.group_name}
                                    </MenuItem>
                                ))}
                        </CcSelect>
                    </Field>

                    <Box>
                        <Box sx={groupLabelSx}>Permissions</Box>
                        <Box sx={permissionsBoxSx}>
                            {user?.admin && (
                                <CcSwitch
                                    id="u-admin"
                                    checked={admin}
                                    onChange={setAdmin}
                                    label="Admin"
                                />
                            )}
                            <Field label="Admin Of Office">
                                <CcSelect
                                    // Same reason as "Location" above.
                                    SelectDisplayProps={{
                                        id: "u-office-admin",
                                        "aria-labelledby": undefined,
                                    }}
                                    ariaLabel="Admin Of Office"
                                    sx={insetControlSx}
                                    value={officeAdmin || ""}
                                    onChange={(e) => {
                                        const selectedItem = locations?.find(
                                            (itm) =>
                                                itm.officeid === e.target.value
                                        );
                                        setOfficeAdmin(selectedItem?.officeid); // Return the entire object
                                    }}
                                >
                                    {locations
                                        ?.filter((lc) => lc.Alias != "All")
                                        ?.map((itm, index) => (
                                            <MenuItem
                                                key={index}
                                                value={itm.officeid}
                                            >
                                                {itm.Alias}
                                            </MenuItem>
                                        ))}
                                    <MenuItem key={999} value={""}>
                                        None
                                    </MenuItem>
                                </CcSelect>
                            </Field>
                        </Box>
                    </Box>

                    {!selectedUser?.id && (
                        <Field label="Password" htmlFor="u-pass">
                            <Box sx={passwordWrapSx}>
                                <CcInput
                                    id="u-pass"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    type={viewPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    sx={{ paddingRight: "38px" }}
                                />
                                <Tooltip
                                    arrow
                                    title={
                                        viewPassword
                                            ? "Hide password"
                                            : "Unhide password"
                                    }
                                    slotProps={ccTooltipSlotProps}
                                >
                                    <Box
                                        component="button"
                                        type="button"
                                        aria-label={
                                            viewPassword
                                                ? "Hide password"
                                                : "Unhide password"
                                        }
                                        onClick={() =>
                                            setViewPassword(!viewPassword)
                                        }
                                        sx={passwordToggleSx}
                                    >
                                        {viewPassword ? (
                                            <VisibilityOffOutlinedIcon
                                                sx={{ fontSize: "18px" }}
                                            />
                                        ) : (
                                            <VisibilityOutlinedIcon
                                                sx={{ fontSize: "18px" }}
                                            />
                                        )}
                                    </Box>
                                </Tooltip>
                            </Box>
                        </Field>
                    )}
                </DialogBody>

                <DialogFooter>
                    <Spacer />
                    <CcButton onClick={onClose}>Cancel</CcButton>
                    <CcButton variant="primary" onClick={onSubmit}>
                        Submit
                    </CcButton>
                </DialogFooter>
            </DialogSurface>
        </Dialog>
    );
};

export default AddNewUser;
