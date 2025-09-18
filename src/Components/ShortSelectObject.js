import { useState } from "react";
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
} from "@mui/material";

const ShortSelect = ({
    onChange,
    value,
    label,
    items,
    hoverBorderColor,
    borderColor,
    focusBorderColor,
    secondary,
    showInfo,
    info,
    disabled,
}) => {
    const [open, setOpen] = useState(false);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const toTitle = (input) =>
        input
            .replace(/_/g, " ") // underscores → spaces
            .replace(/\b\w/g, (c) => c.toUpperCase()); // capitalise initials

    return (
        <FormControl
            fullWidth
            variant="outlined"
            size="small"
            id={`short-select-form-${label}`}
        >
            <InputLabel id={`short-select-label-${label}`}>{label}</InputLabel>
            <Select
                size="small"
                labelId={`short-select-label-${label}`}
                id={`short-select-${label}`}
                value={value?.id || ""}
                onChange={(e) => {
                    const selectedItem = items?.find(
                        (itm) => itm.id === e.target.value
                    );
                    onChange(selectedItem); // Return the entire object
                }}
                disabled={disabled}
                onOpen={handleOpen}
                onClose={handleClose}
                label={label}
                renderValue={(selected) => {
                    const selectedItem = items?.find(
                        (itm) => itm.id === selected
                    );
                    return selectedItem ? selectedItem.value : ""; // Show only the name
                }}
                MenuProps={{
                    PaperProps: {
                        style: {
                            maxHeight: 200, // Maximum height of the dropdown menu
                        },
                    },
                }}
                sx={{
                    "& .MuiOutlinedInput-root": {
                        "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: borderColor || "rgba(0, 0, 0, 0.23)", // Default border color
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor:
                                hoverBorderColor || "rgba(0, 0, 0, 0.87)", // Border color on hover
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: focusBorderColor
                                ? focusBorderColor
                                : "#3f51b5", // Border color when focused
                        },
                    },
                }}
            >
                {items?.map((itm, index) => (
                    <MenuItem key={index} value={itm.id} sx={{ width: "100%" }}>
                        <Typography
                            variant="body1"
                            sx={{
                                justifyContent: "space-between",
                                width: "100%",
                            }}
                        >
                            {itm.value ? itm.value : itm.name}
                        </Typography>
                        <Typography variant="caption">
                            {secondary
                                ? `${toTitle(secondary)}: ${itm[secondary]}`
                                : ""}
                        </Typography>
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};

export default ShortSelect;
