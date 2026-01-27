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

const EquipmentInfoCard = ({
    equipment,
    getStatusColor,
    isCalibrationDueSoon,
}) => {
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
    const infoItems = [
        { label: "Status", value: equipment.status, isStatus: true },
        { label: "Description", value: equipment.description || "N/A" },
        { label: "Serial Number", value: equipment.serial_number || "N/A" },
        { label: "Location", value: equipment.location || "N/A" },
        { label: "Contact Person", value: equipment.contact_person || "N/A" },
        {
            label: "Created By",
            value: equipment.CreatedBy
                ? `${equipment.CreatedBy.first_name} ${equipment.CreatedBy.last_name}`
                : "N/A",
        },
        {
            label: "Updated By",
            value: equipment.UpdatedBy
                ? `${equipment.UpdatedBy.first_name} ${equipment.UpdatedBy.last_name}`
                : "N/A",
        },
        // {
        //     label: "Requires Approval",
        //     value: equipment.requires_approval ? "Yes" : "No",
        // },
    ];

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Equipment Information
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Grid container spacing={2}>
                    {infoItems.map((item, index) => (
                        <Grid item xs={12} sm={6} key={index}>
                            <Typography variant="body2" color="text.secondary">
                                {item.label}
                            </Typography>
                            {item.isStatus ? (
                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 1,
                                        alignItems: "center",
                                        mt: 0.5,
                                    }}
                                >
                                    <Chip
                                        label={item.value}
                                        color={getStatusColor(item.value)}
                                        size="small"
                                    />
                                    {isCalibrationDueSoon(
                                        calculateDueDate(),
                                    ) && (
                                        <Chip
                                            icon={<Warning />}
                                            label="Calibration Due Soon"
                                            color="warning"
                                            size="small"
                                        />
                                    )}
                                </Box>
                            ) : (
                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                    {item.value}
                                </Typography>
                            )}
                        </Grid>
                    ))}
                </Grid>
            </CardContent>
        </Card>
    );
};

export default EquipmentInfoCard;
