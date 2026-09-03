import React from "react";
import {
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    TextField,
    Box,
    Typography,
    Alert,
    Link,
    Stack,
    Card,
    Tooltip,
    Divider,
    InputAdornment,
} from "@mui/material";
import { Add, Edit, Delete, Save, Cancel } from "@mui/icons-material";

import ResponsiveDialog from "../../Components/UI/ResponsiveDialog";
import EmptyState from "../../Components/UI/EmptyState";
import { RowSkeleton } from "../../Components/UI/Skeletons";
import ConfirmDialog from "../../../Components/ConfirmDialog";
import useConfirmDialog from "../../../hooks/useConfirmDialog";
import useResponsive from "../../../hooks/useResponsive";

// ============================================================================
// Editable reference-data table, in a dialog
// ----------------------------------------------------------------------------
// The four tax-limit dialogs (bonus rates, Section 179 limits, federal vehicle
// limits, passenger auto limits) were four copies of the same ~400-line
// component differing only in their columns and endpoints. This is that
// component; each dialog now supplies a column spec and keeps its own fetch,
// validation and save logic.
//
// Column spec:
//   key         field name on the row
//   label       header text
//   type        "text" | "number" | "currency" | "percent" | "link"
//   width       px width for the input (optional)
//   placeholder
//   inputProps  forwarded to the input element
//   newOnly     editable when adding a row, read-only when editing one
//               (used for the tax year, which is the primary key)
//   toInput     value -> what the text field shows      (default: identity)
//   fromInput   raw text field value -> what to store   (default: identity)
//   display     value -> node shown when not editing    (default: derived from type)
// ============================================================================

const identity = (v) => v;

function defaultDisplay(column, value) {
    if (value === null || value === undefined || value === "") return "—";

    switch (column.type) {
        case "currency":
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
            }).format(value);
        case "percent":
            return `${(Number(value) * 100).toFixed(0)}%`;
        case "link":
            return (
                <Link
                    href={value}
                    target="_blank"
                    rel="noopener"
                    variant="body2"
                >
                    View
                </Link>
            );
        default:
            return value;
    }
}

function CellInput({ column, value, onChange, autoFocus }) {
    const toInput = column.toInput || identity;
    const fromInput = column.fromInput || identity;

    const adornment =
        column.type === "currency"
            ? { startAdornment: <InputAdornment position="start">$</InputAdornment> }
            : column.type === "percent"
              ? { endAdornment: <InputAdornment position="end">%</InputAdornment> }
              : {};

    return (
        <TextField
            type={
                column.type === "number" ||
                column.type === "currency" ||
                column.type === "percent"
                    ? "number"
                    : "text"
            }
            value={toInput(value) ?? ""}
            onChange={(e) => onChange(fromInput(e.target.value))}
            size="small"
            autoFocus={autoFocus}
            placeholder={column.placeholder}
            inputProps={column.inputProps}
            InputProps={adornment}
            sx={{
                width: column.width || "100%",
                minWidth: column.width || 120,
            }}
        />
    );
}

export default function TaxTableDialog({
    open,
    onClose,
    title,
    subtitle,
    icon,
    /** Node rendered above the table — usually an explanatory Alert. */
    description,
    columns,
    rows = [],
    rowKey = "taxYear",
    loading = false,
    error,
    onDismissError,

    /** Adding */
    isAdding,
    draft,
    onDraftChange,
    onStartAdd,
    onCancelAdd,
    onSaveNew,

    /** Editing */
    editingKey,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onRowChange,

    /** Deleting */
    onDelete,
    deleteMessage = (key) =>
        `Delete the entry for ${key}? This cannot be undone.`,

    emptyTitle = "Nothing defined yet",
    emptyDescription = 'Use "Add year" to create the first entry.',
    maxWidth = "md",
}) {
    const { isCompact } = useResponsive();
    const { showConfirm, confirmState, hideConfirm } = useConfirmDialog();

    const confirmDelete = (key) =>
        showConfirm(
            deleteMessage(key),
            () => onDelete(key),
            "danger",
            "Delete entry",
            "Delete",
        );

    const isEditing = (row) => editingKey === row[rowKey];

    // ---- Desktop table ----------------------------------------------------

    const desktopTable = (
        <TableContainer
            component={Card}
            sx={{ maxHeight: { md: "52vh" }, overflowX: "auto" }}
        >
            <Table stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        {columns.map((column) => (
                            <TableCell key={column.key}>
                                {column.label}
                            </TableCell>
                        ))}
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {isAdding && (
                        <TableRow sx={{ bgcolor: "primary.50" }}>
                            {columns.map((column, index) => (
                                <TableCell key={column.key}>
                                    <CellInput
                                        column={column}
                                        value={draft?.[column.key]}
                                        autoFocus={index === 0}
                                        onChange={(value) =>
                                            onDraftChange({
                                                ...draft,
                                                [column.key]: value,
                                            })
                                        }
                                    />
                                </TableCell>
                            ))}
                            <TableCell align="right">
                                <Stack
                                    direction="row"
                                    spacing={0.5}
                                    justifyContent="flex-end"
                                >
                                    <Tooltip title="Save">
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={onSaveNew}
                                        >
                                            <Save fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Cancel">
                                        <IconButton
                                            size="small"
                                            onClick={onCancelAdd}
                                        >
                                            <Cancel fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </TableCell>
                        </TableRow>
                    )}

                    {rows.map((row, index) => {
                        const editing = isEditing(row);
                        return (
                            <TableRow
                                key={row[rowKey]}
                                hover
                                sx={{
                                    bgcolor: editing
                                        ? "primary.50"
                                        : "transparent",
                                    animation: "seaFadeIn 240ms ease both",
                                    animationDelay: `${Math.min(index, 15) * 16}ms`,
                                }}
                            >
                                {columns.map((column) => (
                                    <TableCell key={column.key}>
                                        {editing && !column.newOnly ? (
                                            <CellInput
                                                column={column}
                                                value={row[column.key]}
                                                onChange={(value) =>
                                                    onRowChange(
                                                        row[rowKey],
                                                        column.key,
                                                        value,
                                                    )
                                                }
                                            />
                                        ) : (
                                            (column.display ||
                                                ((v) =>
                                                    defaultDisplay(column, v)))(
                                                row[column.key],
                                                row,
                                            )
                                        )}
                                    </TableCell>
                                ))}

                                <TableCell align="right">
                                    <Stack
                                        direction="row"
                                        spacing={0.5}
                                        justifyContent="flex-end"
                                    >
                                        {editing ? (
                                            <>
                                                <Tooltip title="Save">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() =>
                                                            onSaveEdit(
                                                                row[rowKey],
                                                            )
                                                        }
                                                    >
                                                        <Save fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Cancel">
                                                    <IconButton
                                                        size="small"
                                                        onClick={onCancelEdit}
                                                    >
                                                        <Cancel fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        ) : (
                                            <>
                                                <Tooltip title="Edit">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                            onStartEdit(
                                                                row[rowKey],
                                                                row,
                                                            )
                                                        }
                                                    >
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <IconButton
                                                        size="small"
                                                        sx={{
                                                            color: "error.main",
                                                        }}
                                                        onClick={() =>
                                                            confirmDelete(
                                                                row[rowKey],
                                                            )
                                                        }
                                                    >
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        )}
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );

    // ---- Mobile cards -----------------------------------------------------
    // Inline table editing is unusable on a phone, so each row becomes a card
    // with stacked fields.

    const mobileCard = (row) => {
        const editing = isEditing(row);
        return (
            <Card
                key={row[rowKey]}
                sx={{
                    p: 2,
                    mb: 1.5,
                    borderColor: editing ? "primary.main" : "divider",
                }}
            >
                <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                        {row[rowKey]}
                    </Typography>
                    <Stack direction="row" spacing={0.5}>
                        {editing ? (
                            <>
                                <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => onSaveEdit(row[rowKey])}
                                    aria-label="Save"
                                >
                                    <Save fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={onCancelEdit}
                                    aria-label="Cancel"
                                >
                                    <Cancel fontSize="small" />
                                </IconButton>
                            </>
                        ) : (
                            <>
                                <IconButton
                                    size="small"
                                    onClick={() =>
                                        onStartEdit(row[rowKey], row)
                                    }
                                    aria-label="Edit"
                                >
                                    <Edit fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    sx={{ color: "error.main" }}
                                    onClick={() => confirmDelete(row[rowKey])}
                                    aria-label="Delete"
                                >
                                    <Delete fontSize="small" />
                                </IconButton>
                            </>
                        )}
                    </Stack>
                </Stack>

                <Divider sx={{ mb: 1.5 }} />

                <Stack spacing={editing ? 2 : 1.25}>
                    {columns
                        .filter((column) => column.key !== rowKey)
                        .map((column) => (
                            <Box key={column.key}>
                                <Typography
                                    variant="overline"
                                    sx={{
                                        color: "text.secondary",
                                        fontSize: "0.6875rem",
                                        display: "block",
                                    }}
                                >
                                    {column.label}
                                </Typography>
                                {editing && !column.newOnly ? (
                                    <Box sx={{ mt: 0.5 }}>
                                        <CellInput
                                            column={{
                                                ...column,
                                                width: undefined,
                                            }}
                                            value={row[column.key]}
                                            onChange={(value) =>
                                                onRowChange(
                                                    row[rowKey],
                                                    column.key,
                                                    value,
                                                )
                                            }
                                        />
                                    </Box>
                                ) : (
                                    <Typography
                                        variant="body2"
                                        component="div"
                                        sx={{ fontWeight: 550 }}
                                    >
                                        {(column.display ||
                                            ((v) => defaultDisplay(column, v)))(
                                            row[column.key],
                                            row,
                                        )}
                                    </Typography>
                                )}
                            </Box>
                        ))}
                </Stack>
            </Card>
        );
    };

    const mobileDraftCard = isAdding && (
        <Card
            sx={{ p: 2, mb: 1.5, borderColor: "primary.main", bgcolor: "primary.50" }}
        >
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                New entry
            </Typography>
            <Stack spacing={2}>
                {columns.map((column, index) => (
                    <Box key={column.key}>
                        <Typography
                            variant="overline"
                            sx={{
                                color: "text.secondary",
                                fontSize: "0.6875rem",
                                display: "block",
                                mb: 0.5,
                            }}
                        >
                            {column.label}
                        </Typography>
                        <CellInput
                            column={{ ...column, width: undefined }}
                            value={draft?.[column.key]}
                            autoFocus={index === 0}
                            onChange={(value) =>
                                onDraftChange({
                                    ...draft,
                                    [column.key]: value,
                                })
                            }
                        />
                    </Box>
                ))}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button variant="outlined" fullWidth onClick={onCancelAdd}>
                    Cancel
                </Button>
                <Button variant="contained" fullWidth onClick={onSaveNew}>
                    Save
                </Button>
            </Stack>
        </Card>
    );

    return (
        <>
            <ResponsiveDialog
                open={open}
                onClose={onClose}
                title={title}
                subtitle={subtitle}
                icon={icon}
                maxWidth={maxWidth}
                headerAction={
                    <Button
                        size="small"
                        startIcon={<Add />}
                        onClick={onStartAdd}
                        variant="contained"
                        disabled={isAdding}
                        sx={{ mr: 1 }}
                    >
                        Add year
                    </Button>
                }
                actions={
                    <Button onClick={onClose} variant="outlined">
                        Close
                    </Button>
                }
            >
                {description && <Box sx={{ mb: 2 }}>{description}</Box>}

                {error && (
                    <Alert
                        severity="error"
                        sx={{ mb: 2 }}
                        onClose={onDismissError}
                    >
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <RowSkeleton count={4} height={44} />
                ) : isCompact ? (
                    <>
                        {mobileDraftCard}
                        {rows.map(mobileCard)}
                        {!isAdding && rows.length === 0 && (
                            <EmptyState
                                variant="compact"
                                title={emptyTitle}
                                description={emptyDescription}
                                action={{
                                    label: "Add year",
                                    icon: <Add />,
                                    onClick: onStartAdd,
                                }}
                            />
                        )}
                    </>
                ) : (
                    <>
                        {rows.length === 0 && !isAdding ? (
                            <EmptyState
                                variant="compact"
                                title={emptyTitle}
                                description={emptyDescription}
                                action={{
                                    label: "Add year",
                                    icon: <Add />,
                                    onClick: onStartAdd,
                                }}
                            />
                        ) : (
                            desktopTable
                        )}
                    </>
                )}
            </ResponsiveDialog>

            <ConfirmDialog
                open={confirmState.open}
                onConfirm={confirmState.onConfirm}
                onCancel={hideConfirm}
                message={confirmState.message}
                title={confirmState.title}
                severity={confirmState.severity}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
            />
        </>
    );
}
