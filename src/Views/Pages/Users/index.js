/**
 * Users & Groups shell — `/manage/users`.
 *
 * Concourse redesign. Visual only: the two panels, their props, the panel ids
 * (`simple-tabpanel-{i}` / `simple-tab-{i}`) and the mount-only-when-active
 * behaviour (switching tabs unmounts the panel and forces a refetch) are the
 * originals.
 *
 * Tab treatment: the guide (§4.3) defaults two short labels to the §3.6
 * segmented control, but that control's track is `--cc-srf2` and this strip
 * sits on the page ground `--cc-grd`. In light mode that is a ~2% luminance
 * step and the track disappears; inverting a token to fix it is forbidden
 * (§0.1). So this uses §4.3's underline tablist, which is specified to sit on
 * a `--cc-line` rail and needs no track.
 *
 * The shell owns ZERO page padding. Each panel supplies its own `pageSx`,
 * because `Groups` is also the standalone `/manage/groups` route and must keep
 * working on its own — if the shell padded as well the page would double-frame.
 */

import { useRef, useState } from "react";
import { Box } from "@mui/material";
import { type as ccType } from "../../../Utilites/concourse";
import { focusRing } from "../../Components/Concourse/ConcourseDialogKit";
import { btnReset, hover } from "../../Components/Banner/Components/atoms";
import Groups from "../Groups/Groups";
import Users from "./Components/Users";

const TAB_LABELS = ["Users", "Groups"];

const shellSx = {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxSizing: "border-box",
    background: "var(--cc-grd)",
    color: "var(--cc-ink)",
    fontFamily: "var(--cc-sans)",
    fontSize: "15px",
    lineHeight: 1.5,
    // Deliberately 0 — the panels own their own padding (see the note above).
    padding: 0,
};

const tabStripSx = {
    flexShrink: 0,
    boxSizing: "border-box",
    padding: "clamp(14px,2.4vw,22px) clamp(12px,2.6vw,24px) 0",
};

const tablistSx = {
    display: "flex",
    gap: "2px",
    flexWrap: "wrap",
    boxSizing: "border-box",
    borderBottom: "1px solid var(--cc-line)",
    padding: "0 6px",
    "@media (max-width:620px)": {
        overflowX: "auto",
        scrollbarWidth: "thin",
        flexWrap: "nowrap",
        "& > button": { flex: "none" },
    },
};

const tabSx = (selected) => ({
    ...btnReset,
    boxSizing: "border-box",
    padding: "10px 14px",
    borderRadius: "13px 13px 0 0",
    ...ccType.modeToggle,
    color: selected ? "var(--cc-ink)" : "var(--cc-mute)",
    position: "relative",
    transition: "color 200ms, background 200ms",
    ...hover({ background: "var(--cc-wash)", color: "var(--cc-ink)" }),
    "&:focus-visible": { ...focusRing, outlineOffset: "-2px" },
    ...(selected
        ? {
              "&::after": {
                  content: '""',
                  position: "absolute",
                  left: "14px",
                  right: "14px",
                  bottom: "-1px",
                  height: "2px",
                  borderRadius: "99px",
                  background: "var(--cc-red)",
              },
          }
        : null),
});

const panelSx = (active) => ({
    flex: active ? 1 : "none",
    minHeight: 0,
    minWidth: 0,
    display: active ? "flex" : "none",
    flexDirection: "column",
    boxSizing: "border-box",
    "&:focus-visible": { ...focusRing, outlineOffset: "-2px" },
});

function CustomTabPanel({ children, value, index }) {
    const active = value === index;
    return (
        <Box
            role="tabpanel"
            hidden={!active}
            tabIndex={0}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            sx={panelSx(active)}
        >
            {/* Mounted only when active — preserved from the original. */}
            {active && children}
        </Box>
    );
}

const Resournces = ({ setLoading }) => {
    const [value, setValue] = useState(0);
    const tabRefs = useRef([]);

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    // §4.3 — ArrowLeft/ArrowRight move between tabs, Home/End jump to the ends.
    const handleTabKeyDown = (event) => {
        const last = TAB_LABELS.length - 1;
        let next = null;
        if (event.key === "ArrowRight") next = value === last ? 0 : value + 1;
        else if (event.key === "ArrowLeft") next = value === 0 ? last : value - 1;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = last;
        if (next === null) return;
        event.preventDefault();
        setValue(next);
        tabRefs.current[next]?.focus();
    };

    return (
        <Box sx={shellSx}>
            <Box sx={tabStripSx}>
                <Box
                    role="tablist"
                    aria-label="Users and groups"
                    onKeyDown={handleTabKeyDown}
                    sx={tablistSx}
                >
                    {TAB_LABELS.map((label, index) => (
                        <Box
                            key={label}
                            component="button"
                            type="button"
                            role="tab"
                            ref={(node) => {
                                tabRefs.current[index] = node;
                            }}
                            id={`simple-tab-${index}`}
                            aria-controls={`simple-tabpanel-${index}`}
                            aria-selected={value === index}
                            tabIndex={value === index ? 0 : -1}
                            onClick={(event) => handleChange(event, index)}
                            sx={tabSx(value === index)}
                        >
                            {label}
                        </Box>
                    ))}
                </Box>
            </Box>

            <CustomTabPanel value={value} index={0}>
                <Users setLoading={setLoading} />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={1}>
                <Groups setLoading={setLoading} />
            </CustomTabPanel>
        </Box>
    );
};

export default Resournces;
