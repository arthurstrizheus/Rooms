import React from "react";
import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { isMobile } from "react-device-detect";
import { type as ccType } from "../../../Utilites/concourse";
import { CcButton } from "../../Components/Concourse/ConcourseDialogKit";

/* ==========================================================================
 * Concourse page shell.
 *
 * This page renders in two shells: inside the authenticated frame (SideBar +
 * Banner, App.js:247-263) and, for ~1 frame before the /login redirect, inside
 * a bare <Stack> (App.js:277-281). `flex:1; minHeight:0` claims a height in
 * both; nothing here depends on `height:100%` resolving.
 *
 * Vertical centring is `margin:"auto 0"` on the CARD, never
 * `justifyContent:"center"` on this root: in a scrolling flex column, centring
 * places overflow above the origin where the scroller cannot reach it. That is
 * the measured defect on the old page (a 566px block in a 515px viewport was
 * clipped 25px at each end, unreachably). Auto margins centre while there is
 * free space and collapse to 0 when there is not.
 * ========================================================================*/

const pageSx = {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    overflowY: "auto",
    overflowX: "hidden",
    scrollbarWidth: "thin",
    // No CssBaseline outside Login/Signup — content-box is in force.
    boxSizing: "border-box",
    background: "var(--cc-grd)",
    color: "var(--cc-ink)",
    fontFamily: "var(--cc-sans)",
    fontSize: "15px",
    lineHeight: 1.5,
    padding: "clamp(14px,2.4vw,22px) clamp(12px,2.6vw,24px) clamp(14px,2.4vw,22px)",
};

/* The auth-screen card shape: one floating 420px card that IS the page. This
 * page owns no data surface, so it borrows that shape rather than inventing a
 * new one. */
const cardSx = {
    background: "var(--cc-srf)",
    borderRadius: "26px",
    boxShadow: "var(--cc-sh2)",
    overflow: "hidden",
    boxSizing: "border-box",
    flexShrink: 0,
    width: "100%",
    maxWidth: "420px",
    margin: "auto 0",
    animation: "cc-rise 500ms var(--cc-sp) 80ms both",
    "@media (max-width:620px)": { borderRadius: "22px" },
};

/* ==========================================================================
 * Empty / error state block.
 *
 * Copied from src/Views/Pages/Calendar/index.jsx:503-543, which declares it
 * `const` and does not export it (and that tree is read-only).
 * Candidate for promotion into ConcourseDialogKit.
 *
 * ONE deviation from that copy: the title accepts an element name (`titleAs`).
 * It defaults to "div", so the default render is byte-identical to the
 * Calendar's. This page passes "h1" because the block IS the whole page here
 * and the old page rendered a real <h1>; the Banner's title is a <div>
 * (Banner.js:160), so without it the route has no heading at all and
 * heading-navigation in a screen reader finds nothing.
 * ========================================================================*/

const StateBlock = ({ icon, danger, title, titleAs = "div", body, actions }) => (
    <Box
        sx={{
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            padding: "52px 26px",
            gap: "11px",
        }}
    >
        <Box
            aria-hidden="true"
            sx={{
                width: "56px",
                height: "56px",
                borderRadius: "20px",
                display: "grid",
                placeItems: "center",
                fontSize: "23px",
                boxShadow: "var(--cc-sh1)",
                background: danger ? "var(--cc-wash)" : "var(--cc-srf2)",
                color: danger ? "var(--cc-red)" : "var(--cc-ink)",
            }}
        >
            {icon}
        </Box>
        <Box component={titleAs} sx={{ ...ccType.stateTitle, margin: 0 }}>
            {title}
        </Box>
        <Box sx={{ ...ccType.stateBody, color: "var(--cc-mute)" }}>{body}</Box>
        <Box
            sx={{
                display: "flex",
                gap: "9px",
                flexWrap: "wrap",
                justifyContent: "center",
                marginTop: "4px",
            }}
        >
            {actions}
        </Box>
    </Box>
);

/* ==========================================================================
 * NotFoundPage
 *
 * Nine call sites render this bare, with no props: the catch-all `*`
 * (Routes.js:294) and the permission-denied fallback of eight gated routes
 * (Routes.js:193, 203, 216, 232, 242, 255, 265, 278). The component receives
 * no signal that distinguishes the two and must not derive one — the gate
 * `user?.admin || user?.office_admin > 0` lives in Routes.js and stays there.
 *
 * The body copy therefore hedges the cause. The previous sub-line ("does not
 * exist or has been moved") asserted a cause that is false on eight of the
 * nine renders: those pages do exist and have not moved.
 *
 * The banner owns the title ("Page Not Found", Routes.js:107), so this page
 * renders none; the state title is deliberately worded differently.
 *
 * No props, no state, no effects, no fetch, no gating, no route params, no
 * redirect. There is nothing to skeleton, nothing to empty and no fetch of its
 * own to fail, so the four-state model does not apply here.
 * ========================================================================*/

const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <Box sx={pageSx}>
            <Box sx={cardSx}>
                <StateBlock
                    icon="?"
                    title="We can't find that page"
                    titleAs="h1"
                    body="The address may be wrong, or this page may not be available to your account."
                    actions={
                        <>
                            <CcButton
                                variant="primary"
                                onClick={() =>
                                    navigate(
                                        isMobile
                                            ? "/schedule/type/week"
                                            : "/schedule/type/month"
                                    )
                                }
                            >
                                Go to the schedule
                            </CcButton>
                            <CcButton onClick={() => navigate("/book")}>
                                My bookings
                            </CcButton>
                        </>
                    }
                />
            </Box>
        </Box>
    );
};

export default NotFoundPage;
