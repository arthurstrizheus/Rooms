import { useState } from "react";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enGB } from "date-fns/locale"; // Import the locale that starts weeks on Monday
import { Box, Dialog, MenuItem } from "@mui/material";
import {
    LocalizationProvider,
    StaticDateTimePicker,
} from "@mui/x-date-pickers";
import {
    showError,
    showSuccess,
} from "../../../../Utilites/Functions/ApiFunctions";
import { PostBlockedDate } from "../../../../Utilites/Functions/ApiFunctions/BlockedDatesFunctions";
import { useAuth } from "../../../../Utilites/AuthContext";
import { type as ccType } from "../../../../Utilites/concourse";
import {
    CcButton,
    CcInput,
    CcSelect,
    CcTextarea,
    DialogBody,
    DialogFooter,
    DialogHeader,
    DialogSurface,
    Disclosure,
    Field,
    HOVER,
    Spacer,
    scopeDialogProps,
} from "../../../Components/Concourse/ConcourseDialogKit";

/**
 * The frame width is measured, not guessed.
 *
 * `StaticDateTimePicker orientation="landscape"` composes as a `max-content`
 * grid: a 174px toolbar column beside the 320px content column, so
 * `.MuiPickersLayout-root` is **494px** wide. Measured headlessly in Chrome
 * 2026-07-30 against @mui/x-date-pickers 6.20.2 with the app's own theme
 * settings (no font override, no CssBaseline), and it did not vary with the
 * selected value (null / Jul / Sep / Dec all measured 494.03px).
 *
 *   494  the picker
 * +  24  the srf2 group's 12px padding each side
 * +  44  DialogBody's 22px padding each side
 * +  18  DialogBody's own vertical scrollbar, which is always up here because
 *        the fields plus a 382px picker are taller than any frame this dialog
 *        is allowed to be. Measured at 10px in Chrome (the kit sets
 *        `scrollbar-width: thin` on the body); 18 is the classic-scrollbar
 *        worst case, and the slack costs nothing on platforms with overlay
 *        scrollbars.
 * = 580.
 *
 * The spec's starting number was 620 and its arithmetic was picker + 44. That
 * omits both the group padding and the body scrollbar: at 562 the picker
 * measured 484px of client width against 494px of content, i.e. a permanent
 * 10px horizontal scrollbar inside the group on every desktop width.
 */
const DIALOG_WIDTH = 580;

/**
 * The picker is a third-party surface: it is restyled by class selector from
 * the group that contains it, never by branching on `mode` and never through
 * `theme.palette`. `PickerStaticLayout` paints `palette.background.paper` on
 * its root, so the root has to be pushed back to transparent explicitly.
 */
const pickerGroupSx = {
    background: "var(--cc-srf2)",
    borderRadius: "18px",
    padding: "12px",
    boxSizing: "border-box",
    overflowX: "auto",
    scrollbarWidth: "thin",
    "& .MuiPickersLayout-root, & .MuiPickersLayout-contentWrapper": {
        background: "transparent",
        backgroundImage: "none",
    },
    "& .MuiPaper-root": { backgroundImage: "none" },
    "& .MuiPickersToolbar-root": { color: "var(--cc-mute)" },
    "& .MuiPickersToolbarText-root": { color: "var(--cc-mute)" },
    "& .MuiPickersToolbarText-root.Mui-selected": { color: "var(--cc-ink)" },
    "& .MuiPickersCalendarHeader-label, & .MuiPickersYear-yearButton, & .MuiPickersMonth-monthButton":
        {
            color: "var(--cc-ink)",
            fontFamily: "var(--cc-sans)",
        },
    "& .MuiPickersYear-yearButton.Mui-selected, & .MuiPickersMonth-monthButton.Mui-selected":
        {
            background: "var(--cc-red)",
            color: "var(--cc-on-red)",
        },
    "& .MuiPickersDay-root": {
        color: "var(--cc-ink)",
        fontFamily: "var(--cc-sans)",
    },
    "& .MuiPickersDay-root:not(.Mui-selected)": {
        [HOVER]: { "&:hover": { background: "var(--cc-wash)" } },
    },
    // MUI's own selected/today rules are two- and three-class selectors, so
    // these have to out-specify them rather than merely follow them — emotion's
    // injection order between a page sx and a styled() component is not a
    // guarantee. Measured: at equal specificity the today ring stayed
    // `palette.text.secondary` grey.
    "& .MuiPickersDay-root.Mui-selected, & .MuiPickersDay-root.Mui-selected:hover, & .MuiPickersDay-root.Mui-selected:focus":
        {
            background: "var(--cc-red)",
            color: "var(--cc-on-red)",
        },
    "& .MuiPickersDay-root.MuiPickersDay-today:not(.Mui-selected)": {
        borderColor: "var(--cc-red)",
    },
    // The date/time tab strip paints `palette.primary`, which is the
    // mode-invariant #C8102E and wrong on the dark ground.
    "& .MuiDateTimePickerTabs-root": {
        borderColor: "var(--cc-line)",
    },
    "& .MuiTabs-indicator": { backgroundColor: "var(--cc-red)" },
    "& .MuiTab-root": { color: "var(--cc-mute)" },
    "& .MuiTab-root.Mui-selected": { color: "var(--cc-red)" },
    "& .MuiDayCalendar-weekDayLabel": {
        color: "var(--cc-mute)",
        ...ccType.blockLabel,
    },
    "& .MuiClock-clock": { background: "var(--cc-srf2)" },
    "& .MuiClockNumber-root": { color: "var(--cc-ink)" },
    "& .MuiClockNumber-root.Mui-selected": { color: "var(--cc-on-red)" },
    "& .MuiClockPointer-root, & .MuiClock-pin, & .MuiClockPointer-thumb": {
        backgroundColor: "var(--cc-red)",
    },
    "& .MuiClockPointer-thumb": { borderColor: "var(--cc-red)" },
    "& .MuiPickersArrowSwitcher-button, & .MuiPickersCalendarHeader-switchViewButton":
        {
            color: "var(--cc-mute)",
        },
};

const AddBlockedDate = ({ open, setOpen, rooms, setUpdate }) => {
    const { user } = useAuth();
    const [name, setName] = useState("");
    const [room, setRoom] = useState("");
    const [description, setDescription] = useState("");
    const [repeats, setRepeats] = useState("");
    const [showDesc, setShowDesc] = useState(false);
    const [selectedStartDateTime, setSelectedStartDateTime] = useState(null);
    const [selectedEndDateTime, setSelectedEndDateTime] = useState(null);
    const [showEndTime, setShowEndTime] = useState(false);
    const [saving, setSaving] = useState(false);

    const onClose = () => {
        setName("");
        setShowEndTime(false);
        setSelectedStartDateTime(null);
        setSelectedEndDateTime(null);
        setRepeats("");
        setRoom("");
        setDescription("");
        setShowDesc(false);
        setSaving(false);
        setOpen(false);
    };
    const onSubmit = () => {
        if (name != "" && room?.id && selectedStartDateTime) {
            // The payload is built BEFORE `setSaving(true)` on purpose. The
            // guard above does not cover `selectedEndDateTime` (pre-existing
            // bug — reported, not fixed), so `end_time` throws when the user
            // reaches step 2 and submits without touching the end picker. If
            // `saving` had already been committed, React would keep the queued
            // update and leave Submit permanently `disabled` reading "Saving…".
            // Constructing the payload first restores the original behaviour:
            // the click throws and nothing changes.
            const payload = {
                name: name,
                room_id: room.id,
                description: description,
                start_time: selectedStartDateTime.toISOString(),
                end_time: selectedEndDateTime.toISOString(),
                created_user_id: user?.id,
                repeats: repeats,
            };
            setSaving(true);
            PostBlockedDate(payload)
                .then((resp) => (resp ? showSuccess("Saved") : ""))
                .then(() => setUpdate((prev) => prev + 1))
                .finally(() => setSaving(false));
            onClose();
        } else {
            showError("Name field cannot be empty");
        }
    };

    const handleStartDateTimeChange = (newValue) => {
        setSelectedStartDateTime(newValue);
    };
    const handleEndDateTimeChange = (newValue) => {
        setSelectedEndDateTime(newValue);
    };
    const handleAcceptStart = () => {
        if (selectedStartDateTime) {
            setShowEndTime(true);
        }
    };
    const handleCancelEnd = () => {
        setSelectedEndDateTime(null);
        setShowEndTime(false);
    };

    return (
        <Dialog
            open={!!open}
            onClose={onClose}
            {...scopeDialogProps(DIALOG_WIDTH)}
        >
            <DialogSurface accent="var(--cc-red)">
                <DialogHeader title="Block A Time Slot" onClose={onClose} />
                <DialogBody>
                    <Field label="Block Name" required htmlFor="bd-name">
                        <CcInput
                            id="bd-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Block Name"
                        />
                    </Field>

                    <Field label="Select Room" required htmlFor="bd-room">
                        <CcSelect
                            id="bd-room"
                            ariaLabel="Select Room"
                            value={room?.id || ""}
                            onChange={(e) => {
                                const selectedItem = rooms?.find(
                                    (itm) => itm.id === e.target.value
                                );
                                setRoom(selectedItem); // Return the entire object
                            }}
                        >
                            {rooms?.map((itm, index) => (
                                <MenuItem key={index} value={itm.id}>
                                    {itm.value}
                                </MenuItem>
                            ))}
                        </CcSelect>
                    </Field>

                    <Disclosure
                        open={showDesc}
                        onToggle={() => setShowDesc(!showDesc)}
                        summary="Add details"
                        controls="bd-details"
                    >
                        <Field label="Repeats" htmlFor="bd-repeats">
                            <CcSelect
                                id="bd-repeats"
                                ariaLabel="Repeats"
                                value={repeats}
                                onChange={(e) => setRepeats(e.target.value)}
                            >
                                <MenuItem key={0} value={""}>
                                    {"-- None --"}
                                </MenuItem>
                                <MenuItem key={1} value={"Daily"}>
                                    {"Daily"}
                                </MenuItem>
                                <MenuItem key={2} value={"Weekly"}>
                                    {"Weekly"}
                                </MenuItem>
                                <MenuItem key={3} value={"Monthly"}>
                                    {"Monthly"}
                                </MenuItem>
                                <MenuItem key={4} value={"Yearly"}>
                                    {"Yearly"}
                                </MenuItem>
                            </CcSelect>
                        </Field>
                        <Field label="Description" htmlFor="bd-description">
                            <CcTextarea
                                id="bd-description"
                                rows={2}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </Field>
                    </Disclosure>

                    <Box sx={pickerGroupSx}>
                        <Box
                            sx={{
                                ...ccType.blockLabel,
                                color: "var(--cc-mute)",
                                marginBottom: "8px",
                            }}
                        >
                            {!showEndTime
                                ? "Select Start Time"
                                : "Select End Time"}
                        </Box>
                        {!showEndTime ? (
                            <LocalizationProvider
                                dateAdapter={AdapterDateFns}
                                adapterLocale={enGB}
                            >
                                <StaticDateTimePicker
                                    orientation="landscape"
                                    minutesStep={15}
                                    ampm={true}
                                    value={selectedStartDateTime}
                                    onChange={handleStartDateTimeChange} // Handles change as the user selects a date/time
                                    slotProps={{ actionBar: { actions: [] } }}
                                />
                            </LocalizationProvider>
                        ) : (
                            <LocalizationProvider
                                dateAdapter={AdapterDateFns}
                                adapterLocale={enGB}
                            >
                                <StaticDateTimePicker
                                    orientation="landscape"
                                    minutesStep={15}
                                    ampm={true}
                                    value={selectedEndDateTime}
                                    onChange={handleEndDateTimeChange} // Handles change as the user selects a date/time
                                    slotProps={{ actionBar: { actions: [] } }}
                                />
                            </LocalizationProvider>
                        )}
                    </Box>
                </DialogBody>

                <DialogFooter>
                    {!showEndTime ? (
                        <>
                            <Spacer />
                            <CcButton onClick={onClose}>Cancel</CcButton>
                            <CcButton
                                variant="primary"
                                onClick={handleAcceptStart}
                                disabled={!selectedStartDateTime}
                            >
                                Next
                            </CcButton>
                        </>
                    ) : (
                        <>
                            <CcButton onClick={handleCancelEnd}>Back</CcButton>
                            <Spacer />
                            <CcButton
                                variant="primary"
                                onClick={onSubmit}
                                disabled={saving}
                            >
                                {saving ? "Saving…" : "Submit"}
                            </CcButton>
                        </>
                    )}
                </DialogFooter>
            </DialogSurface>
        </Dialog>
    );
};

export default AddBlockedDate;
