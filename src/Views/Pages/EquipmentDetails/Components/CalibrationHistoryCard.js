import React from "react";
import {
    Card,
    CardContent,
    Typography,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from "@mui/material";
import { format } from "date-fns";

const CalibrationHistoryCard = ({ calibrationHistory }) => {
    if (calibrationHistory.length === 0) return null;

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Calibration History
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Result</TableCell>
                                <TableCell>Next Due</TableCell>
                                <TableCell>Performed By</TableCell>
                                <TableCell>Notes</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {calibrationHistory.map((cal) => (
                                <TableRow key={cal.id}>
                                    <TableCell>
                                        {format(
                                            new Date(cal.calibration_date),
                                            "PP"
                                        )}
                                    </TableCell>
                                    <TableCell>{cal.result || "N/A"}</TableCell>
                                    <TableCell>
                                        {cal.next_due_date
                                            ? format(
                                                  new Date(cal.next_due_date),
                                                  "PP"
                                              )
                                            : "N/A"}
                                    </TableCell>
                                    <TableCell>
                                        {cal.performed_by_user_id || "N/A"}
                                    </TableCell>
                                    <TableCell>{cal.notes || ""}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
};

export default CalibrationHistoryCard;
