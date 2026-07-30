import { Box, LinearProgress } from "@mui/material";
import {
    motion,
    radius,
    type as ccType,
    zIndex,
} from "../../../Utilites/concourse";
import DateSelector from "./Components/DateSelector";
import { btnReset, BurgerIcon, hover } from "./Components/atoms";
import { isScheduleTitle } from "./Components/period";

/**
 * The Concourse banner — ARBITER §10.6.
 *
 * Row order: [burger, only while the menu is closed] -> page title ->
 * date switcher (margin-left:auto) -> Today -> Book a room. Under the row: the
 * picker panel when open, then the loading bar.
 *
 * `position: relative` is load-bearing: the picker panel is absolutely
 * positioned against this element. Never put `overflow: hidden` on it.
 *
 * THE BANNER OWNS THE PERIOD TITLE. The calendar card's toolbar must not repeat
 * it (§10.10, §14 conflict 14, §15.10) — that is today's duplicate-title defect.
 *
 * The shell has no collapsed icon rail (§13-G2): the side menu collapses to
 * width 0 and this burger is the only way back, so it renders at every width.
 */

const MQ_STACK = "@media (max-width:700px)";

const rootSx = {
    flex: "none",
    width: "100%",
    position: "relative",
    zIndex: zIndex.banner,
    background: "var(--cc-srf)",
    color: "var(--cc-ink)",
    borderBottom: "1px solid var(--cc-line)",
    // Concourse root owns its own font — no global typography override (§6/G10)
    fontFamily: "var(--cc-sans)",
    fontSize: "15px",
    lineHeight: 1.5,
    WebkitFontSmoothing: "antialiased",
};

const rowSx = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    padding: "11px clamp(12px,2.6vw,24px)",
};

const burgerSx = {
    ...btnReset,
    width: "34px",
    height: "34px",
    borderRadius: `${radius.xs}px`,
    background: "var(--cc-srf2)",
    color: "var(--cc-mute)",
    transition: [
        `background ${motion.dur.colour}ms`,
        `color ${motion.dur.colour}ms`,
        `transform ${motion.dur.lift}ms ${motion.spring}`,
    ].join(", "),
    ...hover({
        background: "var(--cc-wash)",
        color: "var(--cc-red)",
        transform: "scale(1.06)",
    }),
};

const titleSx = {
    margin: 0,
    minWidth: 0,
    color: "var(--cc-ink)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    ...ccType.pageTitle,
    // §9 <=700px: flat 18px, no clamp
    [MQ_STACK]: { fontSize: "18px" },
};

const titleMutedSx = {
    fontStyle: "normal",
    fontWeight: 500,
    color: "var(--cc-mute)",
};

const ctaSx = {
    ...btnReset,
    padding: "9px 18px",
    borderRadius: "99px",
    background: "var(--cc-red)",
    color: "var(--cc-on-red)",
    boxShadow: "var(--cc-glow-cta)",
    ...ccType.cta,
    transition: `transform ${motion.dur.chevron}ms ${motion.spring}, filter ${motion.dur.colour}ms`,
    ...hover({
        transform: "translateY(-2px) scale(1.02)",
        filter: "brightness(1.05)",
    }),
    "&:active": { transform: "scale(.97)" },
    [MQ_STACK]: { order: 8, flex: 1 },
};

/**
 * §10.6 loading bar: 3px, `srf3` track, a single 40%-wide red fill sweeping via
 * `cc-bar`. Kept on MUI's LinearProgress (so the progressbar role and its ARIA
 * come for free) with the indeterminate pair replaced by the one specified fill.
 */
const loadingSx = {
    height: "3px",
    backgroundColor: "var(--cc-srf3)",
    "& .MuiLinearProgress-bar": { backgroundColor: "var(--cc-red)" },
    "& .MuiLinearProgress-bar1Indeterminate": {
        width: "40%",
        transform: "none",
        animation: `${motion.keyframes.loadingBar} ${motion.dur.loadingBar}ms ${motion.easeInOut} infinite`,
    },
    "& .MuiLinearProgress-bar2Indeterminate": { display: "none" },
};

/** `Month Schedule` -> `Month` in ink + `Schedule` in mute/500 (§10.6). */
const splitTitle = (text) => {
    const value = String(text || "");
    const at = value.lastIndexOf(" ");
    if (at < 1) return [value, ""];
    return [value.slice(0, at), value.slice(at + 1)];
};

const Banner = ({
    bannerText,
    loading,
    selectedDate,
    setSelectedDate,
    onOpenDrawer,
    drawerOpen,
    onBookRoom,
}) => {
    // Only the three schedule routes own a date (Routes.js:47-53).
    const hasDate = isScheduleTitle(bannerText);
    const [head, tail] = hasDate ? splitTitle(bannerText) : [bannerText, ""];

    return (
        <Box sx={rootSx}>
            <Box sx={rowSx}>
                {!drawerOpen && (
                    <Box
                        component="button"
                        type="button"
                        aria-label="Open menu"
                        onClick={onOpenDrawer}
                        sx={burgerSx}
                    >
                        <BurgerIcon />
                    </Box>
                )}

                <Box component="div" sx={titleSx}>
                    {head}
                    {tail ? (
                        <>
                            {" "}
                            <Box component="em" sx={titleMutedSx}>
                                {tail}
                            </Box>
                        </>
                    ) : null}
                </Box>

                {hasDate && (
                    <DateSelector
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                    />
                )}

                {typeof onBookRoom === "function" && (
                    <Box
                        component="button"
                        type="button"
                        onClick={onBookRoom}
                        sx={ctaSx}
                    >
                        Book a room
                    </Box>
                )}
            </Box>

            {loading && <LinearProgress aria-label="Loading" sx={loadingSx} />}
        </Box>
    );
};

export default Banner;
