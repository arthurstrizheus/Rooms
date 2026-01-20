import React from "react";
import {
    Card,
    CardContent,
    Typography,
    Divider,
    Box,
    Button,
    IconButton,
} from "@mui/material";
import { Download, Delete, History } from "@mui/icons-material";
import { format } from "date-fns";

const FileListCard = ({
    title,
    files,
    canEditDelete,
    handleDeleteFile,
    onViewHistory,
}) => {
    if (files.length === 0) return null;

    const mostRecentFile = files[0];

    return (
        <Card>
            <CardContent>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                    }}
                >
                    <Typography variant="h6">{title}</Typography>
                    {files.length > 1 && (
                        <Button
                            size="small"
                            startIcon={<History />}
                            onClick={onViewHistory}
                            variant="outlined"
                        >
                            View All ({files.length})
                        </Button>
                    )}
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                    }}
                >
                    <Box sx={{ flex: 1 }}>
                        <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600, mb: 0.5 }}
                        >
                            {mostRecentFile.file_name}
                        </Typography>
                        {mostRecentFile.description && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    display: "block",
                                    mb: 1,
                                    fontStyle: "italic",
                                }}
                            >
                                {mostRecentFile.description}
                            </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                            {mostRecentFile.calibration_date
                                ? `Calibration Date: ${format(
                                      new Date(mostRecentFile.calibration_date),
                                      "MM/dd/yyyy"
                                  )}`
                                : `Uploaded: ${format(
                                      new Date(mostRecentFile.upload_date),
                                      "MM/dd/yyyy"
                                  )}`}
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.5, ml: 2 }}>
                        <IconButton
                            size="small"
                            href={`${process.env.REACT_APP_SERVER_URL}/uploads/${mostRecentFile.file_path}`}
                            target="_blank"
                            sx={{
                                bgcolor: "primary.main",
                                color: "white",
                                "&:hover": {
                                    bgcolor: "primary.dark",
                                },
                            }}
                        >
                            <Download sx={{ fontSize: 18 }} />
                        </IconButton>
                        {canEditDelete() && (
                            <IconButton
                                size="small"
                                onClick={() =>
                                    handleDeleteFile(mostRecentFile.id)
                                }
                                sx={{
                                    bgcolor: "error.main",
                                    color: "white",
                                    "&:hover": {
                                        bgcolor: "error.dark",
                                    },
                                }}
                            >
                                <Delete sx={{ fontSize: 18 }} />
                            </IconButton>
                        )}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default FileListCard;
