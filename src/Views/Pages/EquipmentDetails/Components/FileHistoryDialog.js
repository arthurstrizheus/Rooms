import React, { useState } from "react";
import {
    Box,
    TextField,
    Typography,
    Chip,
    Stack,
    IconButton,
    InputAdornment,
    Tooltip,
} from "@mui/material";
import {
    Download,
    Delete,
    Search,
    HistoryOutlined,
    InsertDriveFileOutlined,
    Close,
} from "@mui/icons-material";
import { format } from "date-fns";
import ResponsiveDialog from "../../../Components/UI/ResponsiveDialog";
import EmptyState from "../../../Components/UI/EmptyState";
import { Stagger } from "../../../Components/UI/motion";

/**
 * All versions of a file category (manuals, calibration certs, other).
 *
 * Search matches the file name, the description, and either date in both
 * zero-padded and unpadded form, so "1/5/2026" and "01/05/2026" both work.
 */
const FileHistoryDialog = ({
    open,
    onClose,
    title,
    files,
    canEditDelete,
    handleDeleteFile,
}) => {
    const [searchQuery, setSearchQuery] = useState("");

    const unpad = (dateStr) => dateStr.replace(/\b0(\d)/g, "$1");

    const matchesDate = (value, query) => {
        if (!value) return false;
        const formatted = format(new Date(value), "MM/dd/yyyy");
        return formatted.includes(query) || unpad(formatted).includes(query);
    };

    const filteredFiles = files.filter((file) => {
        const query = searchQuery.toLowerCase();
        if (!query) return true;
        return (
            file.file_name?.toLowerCase().includes(query) ||
            file.description?.toLowerCase().includes(query) ||
            matchesDate(file.upload_date, query) ||
            matchesDate(file.calibration_date, query)
        );
    });

    return (
        <ResponsiveDialog
            open={open}
            onClose={onClose}
            title={`${title} history`}
            subtitle={`${files.length} file${files.length === 1 ? "" : "s"}`}
            icon={<HistoryOutlined />}
            maxWidth="md"
        >
            <TextField
                fullWidth
                placeholder="Search by name, description, or date…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <Search
                                sx={{ fontSize: 19, color: "text.disabled" }}
                            />
                        </InputAdornment>
                    ),
                    endAdornment: searchQuery ? (
                        <InputAdornment position="end">
                            <IconButton
                                size="small"
                                onClick={() => setSearchQuery("")}
                                aria-label="Clear search"
                            >
                                <Close sx={{ fontSize: 16 }} />
                            </IconButton>
                        </InputAdornment>
                    ) : null,
                }}
                sx={{ mb: 2 }}
            />

            {filteredFiles.length === 0 ? (
                <EmptyState
                    variant="compact"
                    icon={<InsertDriveFileOutlined />}
                    title="No files found"
                    description={
                        searchQuery
                            ? "Nothing matches that search."
                            : "Nothing has been uploaded in this category yet."
                    }
                />
            ) : (
                <Stagger step={30} max={10}>
                    {filteredFiles.map((file) => (
                        <Stack
                            key={file.id}
                            direction="row"
                            spacing={1.5}
                            alignItems="flex-start"
                            sx={{
                                p: 1.75,
                                mb: 1,
                                borderRadius: 2.5,
                                border: "1px solid",
                                borderColor: "divider",
                                transition:
                                    "background-color 160ms ease, border-color 160ms ease",
                                "&:hover": {
                                    bgcolor: "grey.50",
                                    borderColor: "grey.300",
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 34,
                                    height: 34,
                                    borderRadius: 2,
                                    flexShrink: 0,
                                    bgcolor: "primary.50",
                                    color: "primary.main",
                                }}
                            >
                                <InsertDriveFileOutlined
                                    sx={{ fontSize: 18 }}
                                />
                            </Box>

                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Typography
                                    variant="subtitle2"
                                    sx={{ wordBreak: "break-word" }}
                                >
                                    {file.file_name}
                                </Typography>
                                {file.description && (
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mt: 0.25 }}
                                    >
                                        {file.description}
                                    </Typography>
                                )}
                                <Stack
                                    direction="row"
                                    spacing={0.75}
                                    sx={{ mt: 1, flexWrap: "wrap", gap: 0.75 }}
                                >
                                    <Chip
                                        label={`Uploaded ${format(
                                            new Date(file.upload_date),
                                            "MM/dd/yyyy",
                                        )}`}
                                        size="small"
                                        variant="outlined"
                                    />
                                    {file.calibration_date && (
                                        <Chip
                                            label={`Calibrated ${format(
                                                new Date(file.calibration_date),
                                                "MM/dd/yyyy",
                                            )}`}
                                            size="small"
                                            sx={{
                                                bgcolor: "primary.50",
                                                color: "primary.dark",
                                                border: "1px solid",
                                                borderColor: "primary.100",
                                            }}
                                        />
                                    )}
                                </Stack>
                            </Box>

                            <Stack
                                direction="row"
                                spacing={0.5}
                                sx={{ flexShrink: 0 }}
                            >
                                <Tooltip title="Download">
                                    <IconButton
                                        size="small"
                                        href={`${process.env.REACT_APP_SERVER_URL}/uploads/${file.file_path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`Download ${file.file_name}`}
                                    >
                                        <Download sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                                {canEditDelete() && (
                                    <Tooltip title="Delete">
                                        <IconButton
                                            size="small"
                                            onClick={() =>
                                                handleDeleteFile(file.id)
                                            }
                                            aria-label={`Delete ${file.file_name}`}
                                            sx={{ color: "error.main" }}
                                        >
                                            <Delete sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Stack>
                        </Stack>
                    ))}
                </Stagger>
            )}
        </ResponsiveDialog>
    );
};

export default FileHistoryDialog;
