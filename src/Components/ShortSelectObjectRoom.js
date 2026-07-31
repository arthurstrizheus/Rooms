import { useState, useEffect } from "react";
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Box,
    Chip,
    Avatar,
    Stack,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PeopleIcon from "@mui/icons-material/People";
import DevicesIcon from "@mui/icons-material/Devices";
import ImageViewer from "./ImageViewer";
import { GetRoomImage } from "../Utilites/Functions/ApiFunctions/RoomFunctions";

const ShortSelectRoom = ({
    onChange,
    value,
    label,
    items,
    hoverBorderColor,
    borderColor,
    focusBorderColor,
    info,
    roomResources,
    resources,
    disabled,
}) => {
    const [open, setOpen] = useState(false);
    const [roomImages, setRoomImages] = useState({});
    const theme = useTheme();
    const downMD = useMediaQuery((theme) => theme.breakpoints.down("md"));

    // Load room images
    useEffect(() => {
        const loadRoomImages = async () => {
            const imageMap = {};
            for (const room of items || []) {
                if (room.image_url) {
                    try {
                        const image = await GetRoomImage(room.image_url);
                        imageMap[room.id] = image;
                    } catch (error) {
                        console.error(
                            `Error loading image for room ${room.id}:`,
                            error
                        );
                    }
                }
            }
            setRoomImages(imageMap);
        };

        if (items?.length > 0) {
            loadRoomImages();
        }
    }, [items]);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const getLocationInfo = (locationId) => {
        return info?.find((loc) => loc.officeid === locationId);
    };

    const formatCapacity = (capacity) => {
        if (capacity === 0) return "No limit";
        if (!Number.isFinite(capacity)) return null;
        if (capacity >= 1000) return "Large capacity";
        return `${capacity} people`;
    };

    const getRoomResources = (roomId) => {
        const roomResourceLinks =
            roomResources?.filter((rr) => rr.room_id === roomId) || [];
        return roomResourceLinks
            .map((link) => {
                const resource = resources?.find(
                    (r) => r.id === link.resource_id
                );
                return resource;
            })
            .filter(Boolean); // Remove any undefined resources
    };

    const formatColor = (color) => {
        if (!color) return theme.palette.grey[300];
        // If color doesn't start with #, add it
        if (color.match(/^[0-9A-Fa-f]{6}$/)) {
            return `#${color}`;
        }
        // If it's already a valid format, return as is
        if (
            color.match(/^#[0-9A-Fa-f]{3,6}$/) ||
            color.startsWith("rgb") ||
            color.startsWith("hsl") ||
            color.startsWith("color(")
        ) {
            return color;
        }
        // If invalid format, return default
        return theme.palette.grey[300];
    };

    return (
        <FormControl
            fullWidth
            variant="outlined"
            size="small"
            id={`short-select-form-${label}`}
        >
            <InputLabel id={`short-select-label-${label}`}>{label}</InputLabel>
            <Select
                disabled={disabled}
                size="small"
                labelId={`short-select-label-${label}`}
                id={`short-select-${label}`}
                value={value?.id || ""}
                onChange={(e) => {
                    const selectedItem = items?.find(
                        (itm) => itm.id === e.target.value
                    );
                    onChange(selectedItem);
                }}
                onOpen={handleOpen}
                onClose={handleClose}
                label={label}
                renderValue={(selected) => {
                    const selectedItem = items?.find(
                        (itm) => itm.id === selected
                    );
                    if (!selectedItem) return "";

                    const locationInfo = getLocationInfo(selectedItem.location);

                    return (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                            }}
                        >
                            {roomImages[selectedItem.id] && (
                                <Avatar
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 1,
                                    }}
                                    src={roomImages[selectedItem.id]}
                                    alt={selectedItem.value}
                                />
                            )}
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flex: 1,
                                    gap: 1,
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 500 }}
                                >
                                    {selectedItem.value}
                                </Typography>
                                {locationInfo && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        •{" "}
                                        {locationInfo.Alias ||
                                            locationInfo.City}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    );
                }}
                MenuProps={{
                    PaperProps: {
                        style: {
                            maxHeight: downMD ? 300 : 400,
                            width: downMD ? "auto" : "350px",
                        },
                    },
                }}
                sx={{
                    "& .MuiOutlinedInput-root": {
                        "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: borderColor || "rgba(0, 0, 0, 0.23)",
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor:
                                hoverBorderColor || "rgba(0, 0, 0, 0.87)",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: focusBorderColor
                                ? focusBorderColor
                                : theme.palette.primary.main,
                        },
                    },
                }}
            >
                {items?.map((room, index) => {
                    const locationInfo = getLocationInfo(room.location);

                    return (
                        <MenuItem
                            key={index}
                            value={room.id}
                            sx={{
                                width: "100%",
                                py: 1.5,
                                px: 2,
                                "&:hover": {
                                    backgroundColor: theme.palette.action.hover,
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    width: "100%",
                                    gap: 1.5,
                                }}
                            >
                                {/* Room Image */}
                                {roomImages[room.id] ? (
                                    <ImageViewer
                                        src={roomImages[room.id]}
                                        alt={room.value}
                                        clickable={false}
                                        style={{
                                            width: 48,
                                            height: 48,
                                            objectFit: "cover",
                                            borderRadius: "8px",
                                            border: `2px solid ${formatColor(
                                                room.color
                                            )}`,
                                            flexShrink: 0,
                                        }}
                                    />
                                ) : (
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            backgroundColor: "transparent",
                                            border: `2px solid ${formatColor(
                                                room.color
                                            )}`,
                                            borderRadius: "8px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: theme.palette.text
                                                    .primary,
                                                fontWeight: "bold",
                                                fontSize: "16px",
                                                lineHeight: 1,
                                                textAlign: "center",
                                            }}
                                        >
                                            {room.value
                                                .substring(0, 2)
                                                .toUpperCase()}
                                        </Typography>
                                    </Box>
                                )}

                                {/* Room Details */}
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        flex: 1,
                                        minWidth: 0,
                                    }}
                                >
                                    <Typography
                                        variant="subtitle2"
                                        sx={{
                                            fontWeight: 600,
                                            color: theme.palette.text.primary,
                                            mb: 0.5,
                                        }}
                                    >
                                        {room.value}
                                    </Typography>

                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        sx={{ mb: 1 }}
                                    >
                                        {/* Capacity Chip */}
                                        <Chip
                                            icon={<PeopleIcon />}
                                            label={formatCapacity(
                                                room.capacity
                                            )}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                height: 20,
                                                "& .MuiChip-label": {
                                                    fontSize: "0.7rem",
                                                },
                                                "& .MuiChip-icon": {
                                                    fontSize: "0.8rem",
                                                },
                                            }}
                                        />

                                        {/* Color indicator */}
                                        {room.color && (
                                            <Box
                                                sx={{
                                                    width: 16,
                                                    height: 16,
                                                    backgroundColor:
                                                        formatColor(room.color),
                                                    borderRadius: "50%",
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    alignSelf: "center",
                                                }}
                                            />
                                        )}
                                    </Stack>

                                    {/* Location Information */}
                                    {locationInfo && (
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 0.5,
                                                mb: 0.5,
                                            }}
                                        >
                                            <LocationOnIcon
                                                sx={{
                                                    fontSize: 14,
                                                    color: theme.palette.text
                                                        .secondary,
                                                }}
                                            />
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {locationInfo.Alias ||
                                                    locationInfo.City}
                                                {locationInfo.state &&
                                                    `, ${locationInfo.state}`}
                                            </Typography>
                                        </Box>
                                    )}

                                    {/* Resources Information */}
                                    {(() => {
                                        const roomResourceList =
                                            getRoomResources(room.id);
                                        return (
                                            roomResourceList.length > 0 && (
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 0.5,
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    <DevicesIcon
                                                        sx={{
                                                            fontSize: 14,
                                                            color: theme.palette
                                                                .text.secondary,
                                                        }}
                                                    />
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            gap: 0.5,
                                                            flexWrap: "wrap",
                                                        }}
                                                    >
                                                        {roomResourceList
                                                            .slice(0, 3)
                                                            .map(
                                                                (
                                                                    resource,
                                                                    idx
                                                                ) => (
                                                                    <Chip
                                                                        key={
                                                                            resource.id
                                                                        }
                                                                        label={
                                                                            resource.name
                                                                        }
                                                                        size="small"
                                                                        variant="outlined"
                                                                        sx={{
                                                                            height: 16,
                                                                            fontSize:
                                                                                "0.6rem",
                                                                            "& .MuiChip-label":
                                                                                {
                                                                                    px: 0.5,
                                                                                    fontSize:
                                                                                        "0.6rem",
                                                                                },
                                                                        }}
                                                                    />
                                                                )
                                                            )}
                                                        {roomResourceList.length >
                                                            3 && (
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                                sx={{
                                                                    fontSize:
                                                                        "0.6rem",
                                                                    alignSelf:
                                                                        "center",
                                                                }}
                                                            >
                                                                +
                                                                {roomResourceList.length -
                                                                    3}{" "}
                                                                more
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            )
                                        );
                                    })()}
                                </Box>
                            </Box>
                        </MenuItem>
                    );
                })}
            </Select>
        </FormControl>
    );
};

export default ShortSelectRoom;
