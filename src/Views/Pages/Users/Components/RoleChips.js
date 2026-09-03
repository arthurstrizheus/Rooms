import React from "react";
import { Chip, Stack, Tooltip, Typography } from "@mui/material";

// ============================================================================
// Role badges
// ----------------------------------------------------------------------------
// Role colors used to be raw hex literals repeated in the user table, the user
// cards and the user detail panel — with "Equipment Admin" rendered in two
// different blues depending on which of the two flags was set. One table now.
// ============================================================================

const ROLE_STYLES = {
    admin: { bg: "#0F5132", label: "Admin" },
    office_admin: { bg: "#8A6100", label: "Office Admin" },
    equipment_admin: { bg: "#12609E", label: "Equipment Admin" },
    equipment_office_admin: { bg: "#2E7FB8", label: "Equipment Office Admin" },
    tax_admin: { bg: "#6A2C86", label: "Tax Admin" },
};

const chipSx = (bg) => ({
    bgcolor: bg,
    color: "common.white",
    fontWeight: 600,
    // Chips sit in a wrapping row; the gap comes from the parent Stack.
    "& .MuiChip-label": { px: 1 },
});

/**
 * The role badges for one user row.
 *
 * `office_admin` and `equipment_office_admin` hold an office id rather than a
 * boolean, so they only render when they match the office currently being
 * filtered (or when viewing all offices).
 */
export default function RoleChips({
    row,
    locations = [],
    filterLocation,
    size = "small",
}) {
    const officeName = (officeId) =>
        locations?.find((lc) => `${lc.officeid}` === `${officeId}`)?.Alias ||
        "this office";

    const viewingAllOffices = `${filterLocation?.officeid}` === "0";

    const matchesFilteredOffice = (value) =>
        Boolean(value) &&
        (`${value}` === `${filterLocation?.officeid}` || viewingAllOffices);

    const badges = [
        row.admin && {
            key: "admin",
            style: ROLE_STYLES.admin,
            tooltip: "Admin access",
        },
        matchesFilteredOffice(row.office_admin) && {
            key: "office_admin",
            style: ROLE_STYLES.office_admin,
            tooltip: `Admin access for ${officeName(row.office_admin)}`,
        },
        row.equipment_admin && {
            key: "equipment_admin",
            style: ROLE_STYLES.equipment_admin,
            tooltip: "Equipment admin access for all offices",
        },
        matchesFilteredOffice(row.equipment_office_admin) && {
            key: "equipment_office_admin",
            style: ROLE_STYLES.equipment_office_admin,
            tooltip: `Equipment admin access for ${officeName(
                row.equipment_office_admin,
            )}`,
        },
        row.tax_admin && {
            key: "tax_admin",
            style: ROLE_STYLES.tax_admin,
            tooltip: "Tax admin access",
        },
    ].filter(Boolean);

    if (badges.length === 0) {
        return (
            <Typography variant="caption" color="text.disabled">
                —
            </Typography>
        );
    }

    return (
        <Stack
            direction="row"
            spacing={0.5}
            sx={{ flexWrap: "wrap", gap: 0.5 }}
        >
            {badges.map((badge) => (
                <Tooltip key={badge.key} title={badge.tooltip} arrow>
                    <Chip
                        size={size}
                        label={badge.style.label}
                        sx={{ cursor: "default", ...chipSx(badge.style.bg) }}
                    />
                </Tooltip>
            ))}
        </Stack>
    );
}

export { ROLE_STYLES };
