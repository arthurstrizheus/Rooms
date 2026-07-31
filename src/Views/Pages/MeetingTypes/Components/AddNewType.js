import { useState } from "react";
import { Box, Dialog, useMediaQuery } from "@mui/material";
import { SketchPicker } from "react-color";
import { showError } from "../../../../Utilites/Functions/ApiFunctions";
import { PostMeetingType } from "../../../../Utilites/Functions/ApiFunctions/MeetingTypeFunctions";
import { useAuth } from "../../../../Utilites/AuthContext";
import {
  CcButton,
  CcInput,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSurface,
  Field,
  PHONE,
  Spacer,
  scopeDialogProps,
} from "../../../Components/Concourse/ConcourseDialogKit";
import { layout } from "../../../../Utilites/concourse";
import ColorChip from "./ColorChip";

/** Bottom-sheet grab handle, matching the Calendar's dialogs (index.jsx:241-257). */
const GrabHandle = () => (
  <Box
    aria-hidden="true"
    sx={{
      width: "38px",
      height: "4px",
      flexShrink: 0,
      borderRadius: "99px",
      background: "var(--cc-line)",
      margin: "9px auto 0",
      boxSizing: "border-box",
    }}
  />
);

/* --------------------------------------------------------------------------
 * The colour picker.
 *
 * Nothing in Concourse is a colour picker, so `react-color`'s SketchPicker is
 * kept — same dependency, same `newColor.hex` output, zero payload risk — and
 * restyled. Two layers are needed:
 *
 * 1. `styles` (below). Sketch.js:47-127 deep-merges a `styles` prop over its
 *    own reactcss classes, so the picker root, the saturation box, the hue bar
 *    and the swatch preview are all reachable from here. Note Sketch.js:58
 *    sets `boxSizing:'initial'` on the root — precisely the trap the app hits
 *    with no CssBaseline — so `border-box` is restated.
 *    The capitalised `Saturation` / `Hue` keys are deliberately NOT passed:
 *    Sketch hands them to those components as `style`, but they read
 *    `props.radius` / `props.shadow` instead (Saturation.js:106-115,
 *    Hue.js:80-89), so they are inert in this build. The rounding is done on
 *    the wrapper divs (`saturation`, `hue`), which do work.
 *    The `disableAlpha` scope merges OVER `default` in reactcss
 *    (mergeClasses.js:23-35), so the two heights it sets are restated there.
 *
 * 2. The `!important` block on the wrapper. SketchFields.js:52-66 writes the
 *    hex/RGB input ring and the `#222` field labels as React inline styles,
 *    and SketchFields never receives the parent's `styles` prop, so nothing
 *    short of `!important` can reach them. Without it those labels are
 *    unreadable on the dark surface. This is the one `!important` in the lane
 *    and it is scoped to `.sketch-picker` descendants.
 * ------------------------------------------------------------------------*/

const pickerStyles = {
  default: {
    picker: {
      width: "100%",
      padding: "12px 12px 0",
      boxSizing: "border-box",
      background: "var(--cc-srf2)",
      borderRadius: "18px",
      boxShadow: "none",
    },
    saturation: { borderRadius: "14px" },
    hue: { height: "12px", borderRadius: "99px" },
    color: {
      width: "26px",
      height: "26px",
      borderRadius: "9px",
      overflow: "hidden",
    },
    activeColor: { borderRadius: "9px" },
  },
  disableAlpha: {
    color: { width: "26px", height: "26px" },
    hue: { height: "12px" },
  },
};

const pickerWrapSx = {
  boxSizing: "border-box",
  "& .sketch-picker": {
    fontFamily: "var(--cc-sans)",
    boxSizing: "border-box",
  },
  "& .sketch-picker input": {
    background: "var(--cc-srf) !important",
    color: "var(--cc-ink) !important",
    boxShadow: "inset 0 0 0 1.5px var(--cc-line) !important",
    borderRadius: "9px !important",
    fontFamily: "var(--cc-mono) !important",
  },
  "& .sketch-picker label": {
    color: "var(--cc-mute) !important",
    fontFamily: "var(--cc-sans) !important",
  },
  // SketchPresetColors.js:38 hard-codes a `1px solid #eee` rule above the
  // swatch row; that div is the picker's last child.
  "& .sketch-picker > .flexbox-fix:last-child": {
    borderTopColor: "var(--cc-line) !important",
  },
};

const AddNewType = ({ open, setOpen, setUpdate }) => {
  const [color, setColor] = useState("");
  const [typeName, setTypeName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState("");
  const [colorError, setColorError] = useState("");
  const { user } = useAuth();

  // Dialog furniture follows the KIT's phone query, not the page's, so the grab
  // handle and the bottom sheet engage at exactly the same width. (The two
  // numbers disagree at 620px app-wide — adoption guide §8-1.)
  const isPhone = useMediaQuery(PHONE.replace("@media ", ""));

  // Dismissal only. Cancel, the header ✕, Escape and a backdrop click all land
  // here, and none of them changed any data, so none of them may bump
  // `setUpdate`: that prop drives the page's refetch effect, which raises the
  // app-wide `loading` flag the table reads as `isSkeleton`. Bumping it on
  // dismissal replaced the whole list with skeleton rows for the length of a
  // needless GET. The refetch now happens only where a row really was created.
  const onClose = () => {
    setOpen(false);
    setTypeName("");
    setColor("");
    setSubmitting(false);
    setNameError("");
    setColorError("");
  };

  const handleChange = (newColor) => {
    setColor(newColor.hex);
    setColorError("");
  };

  const onSubmit = async () => {
    if (color != "" && typeName != "") {
      setNameError("");
      setColorError("");
      setSubmitting(true);
      const res = await PostMeetingType({
        value: typeName,
        color: color,
        created_user_id: user?.id,
      });
      // The previous implementation closed unconditionally, so a rejected POST
      // discarded the name and the colour the user had just picked while the
      // error snackbar was still on screen. The payload, the field names and
      // the snackbars are untouched; only the close is now conditional.
      if (res) {
        onClose();
        // A row really was created, so this is the one path that refreshes the
        // table.
        setUpdate((prev) => prev + 1);
      } else {
        setSubmitting(false);
      }
    } else {
      showError("Fields cannot be empty");
      setNameError(typeName != "" ? "" : "Fields cannot be empty");
      setColorError(color != "" ? "" : "Fields cannot be empty");
      // The kit's CcInput is a plain function component, not forwardRef, so the
      // first invalid field is focused by id (adoption guide §4.6).
      if (typeName == "") document.getElementById("type-name")?.focus();
    }
  };

  return (
    <Dialog
      open={!!open}
      onClose={onClose}
      {...scopeDialogProps(layout.dialogWidth.scope)}
    >
      {isPhone && <GrabHandle />}
      {/* The accent IS the data being edited: as the picker moves, the header
          wash and the badge dot follow it. Before a colour is picked
          DialogSurface falls back to TYPE_FALLBACK (#91E041) — on this page
          that is not a stray green, it is literally the meeting-type fallback
          the Calendar paints for a type with no colour. */}
      <DialogSurface accent={color || undefined}>
        <DialogHeader
          badge={typeName || undefined}
          title="Add Item Type"
          sub="Meeting types color the event chips on the calendar."
          onClose={onClose}
        />
        <DialogBody>
          <Field
            label="Type name"
            required
            htmlFor="type-name"
            error={nameError}
          >
            <CcInput
              id="type-name"
              value={typeName}
              onChange={(e) => {
                setTypeName(e.target.value);
                setNameError("");
              }}
              placeholder="Type Name"
              invalid={Boolean(nameError)}
            />
          </Field>

          <Field
            label="Calendar color"
            required
            hint="Used for this type's chips on the calendar."
            error={colorError}
          >
            <Box sx={{ display: "grid", gap: "10px", minWidth: 0 }}>
              {color ? (
                <ColorChip
                  color={color}
                  label={typeName || undefined}
                  sx={{ width: "100%" }}
                />
              ) : null}
              <Box sx={pickerWrapSx}>
                <SketchPicker
                  color={color}
                  onChange={(e) => handleChange(e)}
                  disableAlpha
                  width="100%"
                  styles={pickerStyles}
                />
              </Box>
            </Box>
          </Field>
        </DialogBody>
        <DialogFooter>
          <Spacer />
          <CcButton onClick={onClose}>Cancel</CcButton>
          <CcButton variant="primary" onClick={onSubmit} disabled={submitting}>
            {submitting ? "Adding…" : "Add type"}
          </CcButton>
        </DialogFooter>
      </DialogSurface>
    </Dialog>
  );
};

export default AddNewType;
