import React, { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Box,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Typography,
    Chip,
    InputAdornment,
} from "@mui/material";
import { Close, Download, Delete, Search } from "@mui/icons-material";
import { format } from "date-fns";

const FileHistoryDialog = ({
    open,
    onClose,
    title,
    files,
    canEditDelete,
    handleDeleteFile,
}) => {
    const [searchQuery, setSearchQuery] = useState("");

    const normalizeDate = (dateStr) => {
        // Remove leading zeros from month and day: "01/05/2026" -> "1/5/2026"
        return dateStr.replace(/\b0(\d)/g, "$1");
    };

    const filteredFiles = files.filter((file) => {
        const query = searchQuery.toLowerCase();

        // Check file name and description
        if (
            file.file_name?.toLowerCase().includes(query) ||
            file.description?.toLowerCase().includes(query)
        ) {
            return true;
        }

        // Check upload date (both with and without leading zeros)
        const uploadDate = format(new Date(file.upload_date), "MM/dd/yyyy");
        if (
            uploadDate.includes(query) ||
            normalizeDate(uploadDate).includes(query)
        ) {
            return true;
        }

        // Check calibration date (both with and without leading zeros)
        if (file.calibration_date) {
            const calDate = format(
                new Date(file.calibration_date),
                "MM/dd/yyyy"
            );
            if (
                calDate.includes(query) ||
                normalizeDate(calDate).includes(query)
            ) {
                return true;
            }
        }

        return false;
    });

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    maxHeight: "80vh",
                },
            }}
        >
            <DialogTitle>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <Typography variant="h6">{title} History</Typography>
                    <IconButton
                        onClick={onClose}
                        size="small"
                        sx={{
                            color: "grey.500",
                        }}
                    >
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by name, description, or date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ mb: 2 }}
                />
                {filteredFiles.length === 0 ? (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textAlign: "center", py: 4 }}
                    >
                        No files found
                    </Typography>
                ) : (
                    <List>
                        {filteredFiles.map((file) => (
                            <ListItem
                                key={file.id}
                                sx={{
                                    border: "1px solid",
                                    borderColor: "grey.200",
                                    borderRadius: 1,
                                    mb: 1,
                                    flexDirection: "column",
                                    alignItems: "flex-start",
                                    "&:hover": {
                                        bgcolor: "grey.50",
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        width: "100%",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                    }}
                                >
                                    <Box sx={{ flex: 1, mr: 2 }}>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ fontWeight: 600, mb: 0.5 }}
                                        >
                                            {file.file_name}
                                        </Typography>
                                        {file.description && (
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mb: 1 }}
                                            >
                                                {file.description}
                                            </Typography>
                                        )}
                                        <Box
                                            sx={{
                                                display: "flex",
                                                gap: 1,
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <Chip
                                                label={`Uploaded: ${format(
                                                    new Date(file.upload_date),
                                                    "MM/dd/yyyy"
                                                )}`}
                                                size="small"
                                                variant="outlined"
                                            />
                                            {file.calibration_date && (
                                                <Chip
                                                    label={`Calibration Date: ${format(
                                                        new Date(
                                                            file.calibration_date
                                                        ),
                                                        "MM/dd/yyyy"
                                                    )}`}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                    <ListItemSecondaryAction>
                                        <Box sx={{ display: "flex", gap: 0.5 }}>
                                            <IconButton
                                                size="small"
                                                href={`${process.env.REACT_APP_SERVER_URL}/uploads/${file.file_path}`}
                                                target="_blank"
                                                sx={{
                                                    bgcolor: "primary.main",
                                                    color: "white",
                                                    "&:hover": {
                                                        bgcolor: "primary.dark",
                                                    },
                                                }}
                                            >
                                                <Download
                                                    sx={{ fontSize: 18 }}
                                                />
                                            </IconButton>
                                            {canEditDelete() && (
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        handleDeleteFile(
                                                            file.id
                                                        )
                                                    }
                                                    sx={{
                                                        bgcolor: "error.main",
                                                        color: "white",
                                                        "&:hover": {
                                                            bgcolor:
                                                                "error.dark",
                                                        },
                                                    }}
                                                >
                                                    <Delete
                                                        sx={{ fontSize: 18 }}
                                                    />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </ListItemSecondaryAction>
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default FileHistoryDialog;
