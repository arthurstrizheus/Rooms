import React from "react";
import {
    Box,
    Stack,
    TextField,
    InputAdornment,
    IconButton,
    Chip,
    Badge,
    Button,
    Drawer,
    Typography,
    Divider,
    Collapse,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import TuneIcon from "@mui/icons-material/Tune";
import useResponsive from "../../../hooks/useResponsive";

/**
 * Search + filter row.
 *
 * On desktop the filter controls sit inline next to the search field. Below
 * `md` they move into a bottom sheet behind a single "Filters" button with a
 * count badge — a row of five selects is unusable on a phone. Active filters
 * stay visible as removable chips in both layouts so state is never hidden.
 */
export default function FilterBar({
    search,
    onSearchChange,
    searchPlaceholder = "Search…",
    /** Filter controls (selects, toggles). Rendered inline or in the sheet. */
    children,
    /** [{ key, label, onClear }] — shown as dismissible chips. */
    activeFilters = [],
    onClearAll,
    /** Node pinned to the right on desktop (sort control, view switch). */
    trailing,
    sticky = false,
    sx = {},
}) {
    const { isCompact } = useResponsive();
    const [sheetOpen, setSheetOpen] = React.useState(false);
    const filterCount = activeFilters.length;

    const searchField = (
        <TextField
            value={search ?? ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            fullWidth
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <SearchIcon
                            sx={{ fontSize: 19, color: "text.disabled" }}
                        />
                    </InputAdornment>
                ),
                endAdornment: search ? (
                    <InputAdornment position="end">
                        <IconButton
                            size="small"
                            aria-label="Clear search"
                            onClick={() => onSearchChange?.("")}
                            edge="end"
                        >
                            <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </InputAdornment>
                ) : null,
            }}
            sx={{
                maxWidth: { xs: "100%", md: 360 },
                "& .MuiOutlinedInput-root": { borderRadius: 2.5 },
            }}
        />
    );

    return (
        <Box
            sx={{
                position: sticky ? "sticky" : "static",
                top: 0,
                zIndex: 4,
                ...sx,
            }}
        >
            <Stack
                direction="row"
                spacing={1.25}
                alignItems="center"
                sx={{ flexWrap: "nowrap" }}
            >
                {searchField}

                {isCompact ? (
                    <Badge
                        badgeContent={filterCount}
                        color="primary"
                        overlap="circular"
                    >
                        <IconButton
                            onClick={() => setSheetOpen(true)}
                            aria-label="Filters"
                            sx={{
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 2.5,
                                bgcolor: "background.paper",
                                width: 40,
                                height: 40,
                            }}
                        >
                            <TuneIcon fontSize="small" />
                        </IconButton>
                    </Badge>
                ) : (
                    <Stack
                        direction="row"
                        spacing={1.25}
                        alignItems="center"
                        sx={{ flexWrap: "wrap", gap: 1.25 }}
                    >
                        {children}
                    </Stack>
                )}

                <Box sx={{ flexGrow: 1 }} />
                {trailing}
            </Stack>

            {/* Active filter chips */}
            <Collapse in={filterCount > 0} timeout={220}>
                <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{
                        mt: 1.5,
                        flexWrap: "wrap",
                        gap: 0.75,
                        "& > *": {
                            animation:
                                "seaScaleIn 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
                        },
                    }}
                >
                    {activeFilters.map((f) => (
                        <Chip
                            key={f.key}
                            label={f.label}
                            size="small"
                            onDelete={f.onClear}
                            sx={{
                                bgcolor: "primary.50",
                                color: "primary.dark",
                                border: "1px solid",
                                borderColor: "primary.100",
                                "& .MuiChip-deleteIcon": {
                                    color: "primary.main",
                                },
                            }}
                        />
                    ))}
                    {filterCount > 1 && onClearAll && (
                        <Chip
                            label="Clear all"
                            size="small"
                            variant="outlined"
                            onClick={onClearAll}
                        />
                    )}
                </Stack>
            </Collapse>

            {/* Mobile filter sheet */}
            <Drawer
                anchor="bottom"
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                PaperProps={{
                    sx: {
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        maxHeight: "85vh",
                        pb: "env(safe-area-inset-bottom)",
                    },
                }}
            >
                {/* Grab handle */}
                <Box
                    sx={{
                        width: 40,
                        height: 4,
                        borderRadius: 2,
                        bgcolor: "grey.300",
                        mx: "auto",
                        mt: 1.5,
                        mb: 0.5,
                    }}
                />
                <Stack
                    direction="row"
                    alignItems="center"
                    sx={{ px: 2.5, py: 1.5 }}
                >
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Filters
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => setSheetOpen(false)}
                        aria-label="Close filters"
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>
                <Divider />
                <Stack
                    spacing={2}
                    sx={{ p: 2.5, overflowY: "auto", "& > *": { width: "100%" } }}
                >
                    {children}
                </Stack>
                <Divider />
                <Stack direction="row" spacing={1.25} sx={{ p: 2.5 }}>
                    {onClearAll && (
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => {
                                onClearAll();
                                setSheetOpen(false);
                            }}
                        >
                            Clear all
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={() => setSheetOpen(false)}
                    >
                        Show results
                    </Button>
                </Stack>
            </Drawer>
        </Box>
    );
}
