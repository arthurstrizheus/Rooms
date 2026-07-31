import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import RoomResources from "./Components/RoomResources";
import Resources from "./Components/Resources";
import { bp, motion as ccMotion } from "../../../Utilites/concourse";
import { SegmentedControl } from "./Components/ResourcesUi";

const PHONE_Q = `@media (max-width:${bp.sheet}px)`;

/** Guide §3.2. `--cc-c` is pinned to the brand red: this page has no per-record
 *  accent, and any kit component painting `cc.c` would otherwise render the
 *  meeting-type fallback green (§7.5). */
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

/** Guide §3.3, in its `fillHeight` shape — the table scrolls inside the card. */
const cardSx = {
    background: "var(--cc-srf)",
    borderRadius: "26px",
    boxShadow: "var(--cc-sh2)",
    overflow: "hidden",
    boxSizing: "border-box",
    animation: `${ccMotion.keyframes.card} ${ccMotion.dur.card}ms var(--cc-sp) ${ccMotion.delay.card}ms both`,
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    [PHONE_Q]: { borderRadius: "22px" },
};

/**
 * The inactive panel still renders nothing (`value === index`), so switching
 * views unmounts the other tab and refires its fetch — unchanged from before.
 * `display:none` is set explicitly: the `hidden` attribute's UA rule would be
 * beaten by the `display:flex` the active panel needs, and this app mounts no
 * CssBaseline.
 */
function CustomTabPanel(props) {
    const { children, value, index, ...other } = props;
    const active = value === index;

    return (
        <Box
            role="tabpanel"
            hidden={!active}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            tabIndex={0}
            {...other}
            sx={{
                width: "100%",
                boxSizing: "border-box",
                ...(active
                    ? {
                          flex: 1,
                          minHeight: 0,
                          display: "flex",
                          flexDirection: "column",
                      }
                    : { display: "none" }),
            }}
        >
            {active && children}
        </Box>
    );
}

const Resournces = ({ setLoading }) => {
    const [value, setValue] = useState(0);
    const headers = ["Room Resources", "Resources"];
    /* The segmented control lives inside the panel it switches, so activating a
       button unmounts that button and the browser drops focus to <body> (MUI's
       Tabs used to sit outside the panels and kept it). Re-point focus at the
       freshly mounted twin, and only after a real activation — never on mount. */
    const restoreFocus = useRef(false);
    const handleChange = (event, newValue) => {
        restoreFocus.current = true;
        setValue(newValue);
    };

    useEffect(() => {
        if (!restoreFocus.current) return;
        restoreFocus.current = false;
        document.getElementById(`simple-tab-${value}`)?.focus();
    }, [value]);

    /* One card wraps both tab bodies, so the segmented control is shared chrome
       that each tab renders left-most in its own toolbar (the rest of the
       toolbar — filter, delete, add — is per-tab state). */
    const tabs = (
        <SegmentedControl
            label="Resource view"
            value={value}
            onChange={handleChange}
            options={headers.map((label, index) => ({
                value: index,
                label,
                id: `simple-tab-${index}`,
                controls: `simple-tabpanel-${index}`,
            }))}
        />
    );

    return (
        <Box sx={pageSx} style={{ "--cc-c": "var(--cc-red)" }}>
            <Box sx={cardSx}>
                <CustomTabPanel value={value} index={0}>
                    <RoomResources setLoading={setLoading} tabs={tabs} />
                </CustomTabPanel>
                <CustomTabPanel value={value} index={1}>
                    <Resources setLoading={setLoading} tabs={tabs} />
                </CustomTabPanel>
            </Box>
        </Box>
    );
};

export default Resournces;
