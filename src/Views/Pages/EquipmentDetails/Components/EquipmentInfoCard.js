import React from "react";
import {
    Card,
    CardContent,
    Typography,
    Divider,
    Box,
    Chip,
    Grid,
} from "@mui/material";
import { Warning } from "@mui/icons-material";
import { format } from "date-fns";

const EquipmentInfoCard = ({
    equipment,
    isCalibrationDueSoon,
    activeCheckouts,
    user,
}) => {
    const getStatusColor = (status) => {
        switch (status) {
            case "available":
                return "success";
            case "unavailable":
                return "error";
            case "reserved":
                return "info";
            case "maintenance":
                return "warning";
            case "retired":
                return "default";
            default:
                return "default";
        }
    };
    const calculateDueDate = () => {
        if (
            !equipment.last_calibration_date ||
            !equipment.calibration_interval_value
        ) {
            return null;
        }
        const lastCal = new Date(equipment.last_calibration_date);
        const dueDate = new Date(lastCal);

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
        }
        return dueDate;
    };
    const getDisplayStatus = () => {
        if (!equipment) return "available";
        // If equipment is currently checked out, override status
        if (isEquipmentCurrentlyCheckedOut(equipment.id)) {
            return "unavailable";
        }
        return equipment.status;
    };

    const isEquipmentCurrentlyCheckedOut = (equipmentId) => {
        const now = new Date();
        return activeCheckouts.some((checkout) => {
            if (checkout.equipment_id !== equipmentId) return false;
            if (checkout.status === "cancelled") return false;

            const start = new Date(checkout.start_time);
            const end = new Date(checkout.end_time);
            return now >= start && now <= end;
        });
    };

    return (
        <Grid container spacing={2} mt={0}>
            {equipment?.can_book !== false && (
                <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                        Status
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            gap: 1,
                            alignItems: "center",
                            mt: 0.5,
                        }}
                    >
                        <Chip
                            label={getDisplayStatus()}
                            color={getStatusColor(getDisplayStatus())}
                            size="small"
                        />
                        {isCalibrationDueSoon(calculateDueDate()) && (
                            <Chip
                                icon={<Warning />}
                                label="Calibration Due Soon"
                                color="warning"
                                size="small"
                            />
                        )}
                    </Box>
                </Grid>
            )}

            <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                    Serial Number
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {equipment.serial_number || "N/A"}
                </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                    Location
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {equipment.location || "N/A"}
                </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                    Contact Person
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {equipment.contact_person || "N/A"}
                </Typography>
            </Grid>
            {equipment?.UpdatedBy &&
                (user?.equipment_admin ||
                    user?.admin ||
                    user?.tax_admin ||
                    user?.equipment_office_admin) && (
                    <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                            Last Updated By
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 0.5 }}>
                            {`${equipment.UpdatedBy.first_name} ${equipment.UpdatedBy.last_name}` ||
                                "N/A"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {`${format(new Date(equipment.updatedAt), "PPpp")}` ||
                                "N/A"}
                        </Typography>
                    </Grid>
                )}
        </Grid>
    );
};

export default EquipmentInfoCard;
