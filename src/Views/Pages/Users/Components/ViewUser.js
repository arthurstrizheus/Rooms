import React from "react";
import { Grid, Stack, Button, Box } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import { useAuth } from "../../../../Utilites/AuthContext";
import SectionCard from "../../../Components/UI/SectionCard";
import DetailField from "../../../Components/UI/DetailField";
import RoleChips from "./RoleChips";

/**
 * The expanded detail panel under a user row.
 *
 * Was two fixed 550px-wide panels side by side — which overflowed on anything
 * narrower than a desktop. Now a responsive two-column grid that stacks.
 */
const ViewUser = ({ location, row, rowUser, setOpen, locations }) => {
    const { user } = useAuth();

    if (!rowUser || !location || !row) return null;

    const canEdit =
        user?.admin ||
        user?.equipment_admin ||
        `${user?.equipment_office_admin}` === `${location?.officeid}`;

    const lastLogin = rowUser?.last_login
        ? new Date(rowUser.last_login).toLocaleDateString("en-US", {
              hour: "numeric",
              minute: "numeric",
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
          })
        : "Has not logged in";

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            <Grid container spacing={{ xs: 1.5, sm: 2.5 }}>
                <Grid item xs={12} md={6}>
                    <SectionCard
                        title="User details"
                        icon={<BadgeOutlinedIcon />}
                        action={
                            canEdit && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={
                                        <EditOutlinedIcon
                                            sx={{ fontSize: 16 }}
                                        />
                                    }
                                    onClick={() => setOpen(rowUser, location)}
                                >
                                    Edit
                                </Button>
                            )
                        }
                    >
                        <Stack spacing={2}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <DetailField
                                        label="Name"
                                        value={row.name}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <DetailField
                                        label="Email"
                                        value={row.email}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <DetailField
                                        label="Last login"
                                        value={lastLogin}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <DetailField
                                        label="Updated by"
                                        value={
                                            rowUser?.UserUpdatedBy
                                                ? `${rowUser.UserUpdatedBy.first_name} ${rowUser.UserUpdatedBy.last_name}`
                                                : null
                                        }
                                        hideEmpty
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <DetailField label="Roles">
                                        <Box sx={{ mt: 0.75 }}>
                                            <RoleChips
                                                row={row}
                                                locations={locations}
                                                // Roles are shown in full here
                                                // rather than scoped to the
                                                // office filter on the table.
                                                filterLocation={{ officeid: 0 }}
                                            />
                                        </Box>
                                    </DetailField>
                                </Grid>
                            </Grid>
                        </Stack>
                    </SectionCard>
                </Grid>

                <Grid item xs={12} md={6}>
                    <SectionCard
                        title="Location"
                        subtitle={location.Alias}
                        icon={<PlaceOutlinedIcon />}
                    >
                        <Grid container spacing={2}>
                            <Grid item xs={6} sm={4}>
                                <DetailField
                                    label="Alias"
                                    value={location.Alias}
                                />
                            </Grid>
                            <Grid item xs={6} sm={4}>
                                <DetailField
                                    label="Number"
                                    value={location.Number}
                                />
                            </Grid>
                            <Grid item xs={6} sm={4}>
                                <DetailField
                                    label="Airport"
                                    value={location.Airport}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <DetailField
                                    label="Address"
                                    value={location.SAddress}
                                />
                            </Grid>
                            <Grid item xs={6} sm={4}>
                                <DetailField
                                    label="City"
                                    value={location.City}
                                />
                            </Grid>
                            <Grid item xs={6} sm={4}>
                                <DetailField
                                    label="State"
                                    value={location.state}
                                />
                            </Grid>
                            <Grid item xs={6} sm={4}>
                                <DetailField label="Zip" value={location.Zip} />
                            </Grid>
                        </Grid>
                    </SectionCard>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ViewUser;
