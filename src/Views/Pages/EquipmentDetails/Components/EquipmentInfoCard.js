import React from "react";
import { Stack, Grid, Chip, Typography } from "@mui/material";
import { Warning } from "@mui/icons-material";
import { format } from "date-fns";
import DetailField from "../../../Components/UI/DetailField";
import StatusChip from "../../../Components/UI/StatusChip";

/**
 * The identity block on the equipment detail page: status, serial, location,
 * contact and (for admins) the audit stamp.
 */
const EquipmentInfoCard = ({
    equipment,
    isCalibrationDueSoon,
    activeCheckouts,
    user,
}) => {
    const isCurrentlyCheckedOut = () =>
        activeCheckouts.some((checkout) => {
            if (checkout.equipment_id !== equipment.id) return false;
            if (checkout.status === "cancelled") return false;
            const now = new Date();
            return (
                now >= new Date(checkout.start_time) &&
                now <= new Date(checkout.end_time)
            );
        });

    const getDisplayStatus = () => {
        if (!equipment) return "available";
        return isCurrentlyCheckedOut() ? "reserved" : equipment.status;
    };

    const calculateDueDate = () => {
        if (
            !equipment.last_calibration_date ||
            !equipment.calibration_interval_value
        ) {
            return null;
        }
        const dueDate = new Date(equipment.last_calibration_date);
        switch (equipment.calibration_interval_unit) {
            case "days":
                dueDate.setDate(
                    dueDate.getDate() + equipment.calibration_interval_value,
                );
                break;
            case "months":
                dueDate.setMonth(
                    dueDate.getMonth() + equipment.calibration_interval_value,
                );
                break;
            case "years":
                dueDate.setFullYear(
                    dueDate.getFullYear() +
                        equipment.calibration_interval_value,
                );
                break;
            default:
                break;
        }
        return dueDate;
    };

    const canSeeAudit =
        user?.equipment_admin ||
        user?.admin ||
        user?.tax_admin ||
        user?.equipment_office_admin;

    return (
        <Grid container spacing={2.5}>
            {equipment?.can_book !== false && (
                <Grid item xs={12} sm={6}>
                    <DetailField label="Status">
                        <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.75 }}
                        >
                            <StatusChip status={getDisplayStatus()} />
                            {isCalibrationDueSoon(calculateDueDate()) && (
                                <Chip
                                    icon={
                                        <Warning
                                            sx={{ fontSize: "14px !important" }}
                                        />
                                    }
                                    label="Calibration due soon"
                                    size="small"
                                    sx={{
                                        bgcolor: "warning.light",
                                        color: "warning.dark",
                                        border: "1px solid",
                                        borderColor: "rgba(199, 119, 0, 0.24)",
                                        "& .MuiChip-icon": {
                                            color: "warning.main",
                                        },
                                    }}
                                />
                            )}
                        </Stack>
                    </DetailField>
                </Grid>
            )}

            <Grid item xs={12} sm={6}>
                <DetailField
                    label="Serial number"
                    value={equipment.serial_number}
                    mono
                />
            </Grid>

            <Grid item xs={12} sm={6}>
                <DetailField label="Location" value={equipment.location} />
            </Grid>

            <Grid item xs={12} sm={6}>
                <DetailField
                    label="Contact person"
                    value={equipment.contact_person}
                />
            </Grid>

            {equipment?.UpdatedBy && canSeeAudit && (
                <Grid item xs={12} sm={6}>
                    <DetailField
                        label="Last updated by"
                        value={`${equipment.UpdatedBy.first_name} ${equipment.UpdatedBy.last_name}`}
                    />
                    {equipment.updatedAt && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mt: 0.25 }}
                        >
                            {format(new Date(equipment.updatedAt), "PPpp")}
                        </Typography>
                    )}
                </Grid>
            )}
        </Grid>
    );
};

export default EquipmentInfoCard;
