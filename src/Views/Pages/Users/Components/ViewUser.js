/**
 * ViewUser — the expanded row detail under a user row.
 *
 * Concourse redesign. Visual only. Every value, its literal copy and the two
 * date formats are the originals; the `user?.admin || user?.office_admin ==
 * location?.officeid` gate on Edit is byte-identical (the loose `==` is
 * load-bearing — `office_admin` may arrive as a string).
 *
 * Changed on purpose, per spec:
 *   - the two hand-rolled `linear-gradient` headers and every
 *     `theme.palette.*` read are gone (§0.1/§0.2), along with `useTheme`,
 *     `hexToRgba` and `darkenHexColorWithAplha`, which are now unused here;
 *   - `minWidth: 550px` on each card is deleted — it forced ~1140px of
 *     horizontal overflow inside a table cell (recon §7.7);
 *   - the Edit button's `EventBusyIcon` ("busy calendar") is replaced with
 *     `EditOutlined`;
 *   - the per-render `console.log(row.groups)` is deleted;
 *   - when the guard fails the pane now renders a one-line note instead of
 *     nothing, so a row cannot open into a void. The note claims no reason,
 *     because the component cannot know one.
 *
 * NOT changed (recon §7.6, report-only): `Last Login` here still runs
 * `new Date(rowUser?.last_login)` with no null guard and therefore still
 * renders `Invalid Date` for a user who has never logged in, while the table
 * cell for the same user shows `Has not Logged In`.
 */

import { Box } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useAuth } from "../../../../Utilites/AuthContext";
import { type as ccType } from "../../../../Utilites/concourse";
import {
    CcButton,
    Fact,
    Facts,
    Spacer,
} from "../../../Components/Concourse/ConcourseDialogKit";
import DisplayGroups from "../../../Components/DisplayGroups";
import { groupChipsSx } from "./UsersConcourse";

const detailSx = {
    padding: "0 14px 12px",
    boxSizing: "border-box",
    minWidth: 0,
};

const gridSx = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    alignItems: "start",
    boxSizing: "border-box",
    minWidth: 0,
    // §6 — one column once the side menu stops being in flow.
    "@media (max-width:979.95px)": { gridTemplateColumns: "1fr" },
};

const groupHeaderSx = {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginBottom: "8px",
    minWidth: 0,
};

const groupLabelSx = {
    ...ccType.blockLabel,
    color: "var(--cc-mute)",
    whiteSpace: "nowrap",
};

const editButtonSx = {
    padding: "6px 13px",
    fontSize: "12.5px",
    flex: "none",
};

/**
 * `Fact`'s own row is `--cc-srf2`, so the shared chip treatment (which is
 * written for the `--cc-srf` table cell) would paint the chips in exactly the
 * row's own colour and they would read as bare text. Read the other token —
 * never derive one surface from the other, because `srf`/`srf2` invert in dark.
 */
const factGroupsSx = {
    ...groupChipsSx,
    justifyContent: "flex-end",
    "& .MuiChip-root": {
        ...groupChipsSx["& .MuiChip-root"],
        background: "var(--cc-srf)",
    },
};

const ViewUser = ({ location, row, rowUser, setOpen, locations }) => {
    const { user } = useAuth();

    if (!(rowUser && location && row)) {
        return (
            <Box sx={{ ...detailSx, paddingTop: "10px" }}>
                <Box sx={{ fontSize: "13.5px", color: "var(--cc-mute)" }}>
                    Details unavailable for this user.
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={detailSx}>
            <Box sx={gridSx}>
                <Box sx={{ minWidth: 0 }}>
                    <Box sx={groupHeaderSx}>
                        <Box sx={groupLabelSx}>User Details</Box>
                        <Spacer />
                        {(user?.admin ||
                            user?.office_admin == location?.officeid) && (
                            <CcButton
                                onClick={() => setOpen(rowUser, location)}
                                sx={editButtonSx}
                            >
                                <EditOutlinedIcon
                                    sx={{
                                        fontSize: "18px",
                                        opacity: 0.82,
                                    }}
                                />
                                Edit
                            </CcButton>
                        )}
                    </Box>
                    <Facts>
                        <Fact label="Name">{row.name}</Fact>
                        <Fact label="Email">{row.email}</Fact>
                        <Fact label="Admin">
                            {row.admin ? "True" : "False"}
                        </Fact>
                        <Fact label="Office Admin">
                            {row.office_admin
                                ? `${
                                      locations?.find(
                                          (lc) =>
                                              lc.officeid == row?.office_admin
                                      )?.Alias
                                  }`
                                : "None"}
                        </Fact>
                        <Fact label="Last Login" mono>
                            {new Date(rowUser?.last_login).toLocaleDateString(
                                "en-US",
                                {
                                    hour: "numeric",
                                    minute: "numeric",
                                    weekday: "long",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                }
                            )}
                        </Fact>
                        <Fact label="Groups">
                            {row.groups.length == 0 ? (
                                "None"
                            ) : (
                                <Box sx={factGroupsSx}>
                                    <DisplayGroups groups={row.groups} />
                                </Box>
                            )}
                        </Fact>
                    </Facts>
                </Box>

                <Box sx={{ minWidth: 0 }}>
                    <Box sx={groupHeaderSx}>
                        <Box sx={groupLabelSx}>User Location</Box>
                    </Box>
                    <Facts>
                        <Fact label="Alias">{location.Alias}</Fact>
                        <Fact label="Number" mono>
                            {location.Number}
                        </Fact>
                        <Fact label="City">{location.City}</Fact>
                        <Fact label="State">{location.state}</Fact>
                        <Fact label="Zip" mono>
                            {location.Zip}
                        </Fact>
                        <Fact label="Address">{location.SAddress}</Fact>
                        <Fact label="Airport" mono>
                            {location.Airport}
                        </Fact>
                    </Facts>
                </Box>
            </Box>
        </Box>
    );
};

export default ViewUser;
