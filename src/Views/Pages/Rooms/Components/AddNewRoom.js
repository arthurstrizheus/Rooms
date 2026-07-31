import { useEffect, useState } from "react";
import { Box, Dialog, MenuItem, useTheme } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCameraOutlined";
import { SketchPicker } from "react-color";
import { showError } from "../../../../Utilites/Functions/ApiFunctions";
import {
    GetRoomImage,
    PostRoom,
    UpdateRoom,
} from "../../../../Utilites/Functions/ApiFunctions/RoomFunctions";
import {
    DeleteRoomGroupByRoomId,
    PostRoomGroup,
} from "../../../../Utilites/Functions/ApiFunctions/RoomGroupFunctions";
import { useAuth } from "../../../../Utilites/AuthContext";
import {
    cc,
    CcButton,
    CcInput,
    CcSelect,
    DialogBody,
    DialogFooter,
    DialogHeader,
    DialogSurface,
    Field,
    focusRing,
    scopeDialogProps,
    Spacer,
    Tag,
    TagRow,
    TwoUp,
} from "../../../Components/Concourse/ConcourseDialogKit";
import { hover } from "../../../Components/Banner/Components/atoms";
import { type as ccType } from "../../../../Utilites/concourse";

/* ==========================================================================
 * Local dressing.
 *
 * Two things the kit does not cover and that are flagged for the integrator:
 *   - a file-upload drop target (built from `controlBox`'s border/radius/fill
 *     with a dashed border, plus `ScopeOption`'s hover);
 *   - `react-color`'s SketchPicker, a third-party surface with its own inline
 *     styles. Only its container is neutralised, through its documented
 *     `styles` escape hatch. Its internals will not fully match Concourse.
 * ========================================================================*/

const blockLabelSx = {
    ...ccType.blockLabel,
    color: cc.mute,
    marginBottom: "7px",
};

const groupSx = {
    background: cc.srf2,
    borderRadius: "18px",
    padding: "14px",
    display: "grid",
    gap: "12px",
    justifyItems: "start",
    boxSizing: "border-box",
};

const dropTargetSx = {
    width: "100%",
    maxWidth: "200px",
    height: "120px",
    boxSizing: "border-box",
    border: `1.5px dashed ${cc.line}`,
    background: cc.srf2,
    borderRadius: "14px",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: "6px",
    cursor: "pointer",
    color: cc.mute,
    transition: "border-color 200ms, background 200ms, color 200ms",
    ...hover({
        borderColor: cc.red,
        background: cc.wash,
        color: cc.red,
    }),
    "&:focus-visible": focusRing,
};

const removeImageSx = {
    position: "absolute",
    top: "-8px",
    right: "-8px",
    width: "30px",
    height: "30px",
    borderRadius: "99px",
    border: 0,
    padding: 0,
    boxSizing: "border-box",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    background: cc.wash,
    color: cc.red,
    fontFamily: "inherit",
    fontSize: "13px",
    lineHeight: 1,
    boxShadow: cc.sh1,
    transition: "transform 300ms var(--cc-sp), background 200ms",
    ...hover({ background: cc.red, color: cc.onRed, transform: "rotate(90deg)" }),
    "&:focus-visible": focusRing,
};

/** Neutralise only the picker's own card — never its swatches. */
const sketchPickerStyles = {
    default: {
        picker: {
            background: "transparent",
            boxShadow: "none",
            borderRadius: "14px",
            width: "100%",
            boxSizing: "border-box",
            fontFamily: "var(--cc-sans)",
            padding: 0,
        },
    },
};

const AddNewRoom = ({
    open,
    setOpen,
    roomGroups,
    roomLocation,
    selectedRoom,
    locations,
    groups,
    setUpdate,
}) => {
    const theme = useTheme();
    const { user } = useAuth();
    const [color, setColor] = useState("22194D");
    const [roomName, setRoomName] = useState("");
    const [location, setLocation] = useState("");
    const [capacity, setCapacity] = useState("");
    const [fullControl, setFullControl] = useState([]);
    const [readAccess, setReadAccess] = useState([]);
    const [oldFullControl, setOldFullControl] = useState([]);
    const [oldReadAccess, setOldReadAccess] = useState([]);
    const [roomImage, setRoomImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const onClose = () => {
        setOpen(false);
        setLocation("");
        setCapacity("");
        setRoomName("");
        setColor("");
        setFullControl([]);
        setReadAccess([]);
        setOldFullControl([]);
        setOldReadAccess([]);
        setRoomImage(null);
        setImagePreview(null);
        setUpdate((prev) => prev + 1);
    };

    const handleChange = (newColor) => {
        setColor(newColor.hex);
    };

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith("image/")) {
                showError("Please select a valid image file");
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showError("Image size should be less than 5MB");
                return;
            }

            setRoomImage(file);

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setRoomImage(null);
        setImagePreview(null);
    };

    const onSubmit = () => {
        console.log("licked");
        if (roomName != "" && color != "" && location) {
            const roomData = {
                value: roomName,
                color: color,
                location: location.officeid,
                capacity: capacity,
                created_user_id: user?.id,
            };

            // Create FormData for file upload
            const formData = new FormData();
            Object.keys(roomData).forEach((key) => {
                formData.append(key, roomData[key]);
            });

            if (roomImage) {
                formData.append("room_image", roomImage); // Append the image file
            } else {
                formData.delete("room_image");
            }

            if (!selectedRoom?.id) {
                PostRoom(formData).then(async (resp) => {
                    if (resp) {
                        let promises = fullControl?.map(async (fc) =>
                            PostRoomGroup({
                                group_id: fc,
                                room_id: resp.id,
                                created_user_id: user?.id,
                            })
                        );
                        await Promise.all(promises);
                        promises = readAccess?.map(async (ra) =>
                            PostRoomGroup({
                                group_id: ra,
                                room_id: resp.id,
                                created_user_id: user?.id,
                            })
                        );
                        await Promise.all(promises);
                        onClose();
                    }
                });
            } else {
                UpdateRoom(selectedRoom?.id, formData).then(async (resp) => {
                    if (resp) {
                        // Add new groups
                        let promises = fullControl?.map((fc) =>
                            oldFullControl?.find((ofc) => ofc === fc)
                                ? null
                                : PostRoomGroup({
                                      group_id: fc,
                                      room_id: selectedRoom.id,
                                      created_user_id: user?.id,
                                  })
                        );
                        await Promise.all(promises);
                        promises = readAccess?.map((or) =>
                            oldReadAccess?.find((ora) => ora === or)
                                ? null
                                : PostRoomGroup({
                                      group_id: or,
                                      room_id: selectedRoom.id,
                                      created_user_id: user?.id,
                                  })
                        );
                        await Promise.all(promises);
                        // Delete removed groups
                        promises = oldFullControl?.map((ofc) =>
                            fullControl?.find((fc) => ofc === fc)
                                ? null
                                : DeleteRoomGroupByRoomId({
                                      group_id: ofc,
                                      room_id: selectedRoom.id,
                                  })
                        );
                        await Promise.all(promises);
                        promises = oldReadAccess?.map((ora) =>
                            readAccess?.find((or) => ora === or)
                                ? null
                                : DeleteRoomGroupByRoomId({
                                      group_id: ora,
                                      room_id: selectedRoom.id,
                                  })
                        );
                        await Promise.all(promises);
                    }
                    onClose();
                });
            }
        } else {
            showError("Fields cannot be empty");
        }
    };

    const handleFullControlChange = (event) => {
        const {
            target: { value },
        } = event;
        setFullControl(
            // Ensure that value is always an array of IDs.
            typeof value === "string" ? value.split(",") : value
        );
    };
    const handleReadAccessChange = (event) => {
        const {
            target: { value },
        } = event;
        setReadAccess(
            // Ensure that value is always an array of IDs.
            typeof value === "string" ? value.split(",") : value
        );
    };

    useEffect(() => {
        if (selectedRoom) {
            setLocation(roomLocation);
            setRoomName(selectedRoom.value);
            setColor(selectedRoom.color);
            setCapacity(selectedRoom.capacity);

            async function fetchRoomImage() {
                const image = await GetRoomImage(selectedRoom.image_url);
                setImagePreview(image);
            }

            // Set existing image preview if available
            if (selectedRoom.image_url) {
                fetchRoomImage();
            }

            const roomsGroups = [];
            roomGroups
                .filter((gp) => gp.room_id == selectedRoom.id)
                ?.map((ug) =>
                    roomsGroups.push(groups?.find((gp) => gp.id == ug.group_id))
                );
            roomsGroups?.map((ug) => {
                if (ug.access == "Full" && !fullControl.includes(ug.id)) {
                    fullControl.push(ug.id);
                    oldFullControl.push(ug.id);
                } else if (!readAccess.includes(ug.id)) {
                    readAccess.push(ug.id);
                    oldReadAccess.push(ug.id);
                }
            });
        }
    }, [selectedRoom, roomLocation]);

    const capacityInvalid = !/^\d*$/.test(capacity);

    const groupChips = (selected) => (
        <TagRow sx={{ marginTop: 0, maxHeight: "60px", overflowY: "auto" }}>
            {selected?.map((value) => (
                <Tag key={value} on>
                    {groups?.find((gp) => gp.id === value)?.group_name}
                </Tag>
            ))}
        </TagRow>
    );

    return (
        <Dialog open={!!open} onClose={onClose} {...scopeDialogProps(700)}>
            <DialogSurface accent="var(--cc-red)">
                <DialogHeader title="Add Room" onClose={onClose} />
                <DialogBody>
                    <Field label="Room Name" required htmlFor="add-room-name">
                        <CcInput
                            id="add-room-name"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder="Room Name"
                        />
                    </Field>

                    <TwoUp>
                        <Field label="Location" required>
                            <CcSelect
                                ariaLabel="Location"
                                value={location?.officeid || ""}
                                onChange={(e) => {
                                    const selectedItem = locations?.find(
                                        (itm) => itm.officeid === e.target.value
                                    );
                                    setLocation(selectedItem); // Return the entire object
                                }}
                            >
                                {locations?.map((itm, index) => (
                                    <MenuItem key={index} value={itm.officeid}>
                                        {itm.Alias}
                                    </MenuItem>
                                ))}
                            </CcSelect>
                        </Field>
                        <Field
                            label="Capacity"
                            htmlFor="add-room-capacity"
                            error={capacityInvalid ? "Numbers Only" : undefined}
                        >
                            <CcInput
                                id="add-room-capacity"
                                mono
                                inputMode="numeric"
                                invalid={capacityInvalid}
                                value={capacity ?? ""}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setCapacity(value);
                                }}
                            />
                        </Field>
                    </TwoUp>

                    <Box>
                        <Box sx={blockLabelSx}>Room Image</Box>
                        <Box sx={groupSx}>
                            {imagePreview ? (
                                <Box
                                    sx={{
                                        position: "relative",
                                        display: "inline-block",
                                    }}
                                >
                                    <img
                                        src={imagePreview}
                                        alt="Room preview"
                                        style={{
                                            display: "block",
                                            width: "100%",
                                            maxWidth: "200px",
                                            height: "120px",
                                            objectFit: "cover",
                                            borderRadius: "14px",
                                            border: "1px solid var(--cc-line)",
                                            boxSizing: "border-box",
                                        }}
                                    />
                                    <Box
                                        component="button"
                                        type="button"
                                        aria-label="Remove image"
                                        onClick={removeImage}
                                        sx={removeImageSx}
                                    >
                                        ✕
                                    </Box>
                                </Box>
                            ) : (
                                <Box
                                    component="label"
                                    role="button"
                                    tabIndex={0}
                                    // A <label> is focusable here but Enter /
                                    // Space do not activate it the way they
                                    // activated the MUI ButtonBase this
                                    // replaced, so forward them to the input
                                    // the label already wraps.
                                    onKeyDown={(event) => {
                                        if (
                                            event.key !== "Enter" &&
                                            event.key !== " "
                                        ) {
                                            return;
                                        }
                                        event.preventDefault();
                                        event.currentTarget
                                            .querySelector("input")
                                            ?.click();
                                    }}
                                    sx={dropTargetSx}
                                >
                                    <PhotoCameraIcon
                                        sx={{ fontSize: "19px", opacity: 0.82 }}
                                    />
                                    <Box
                                        component="span"
                                        sx={{ ...ccType.button }}
                                    >
                                        Upload Image
                                    </Box>
                                    <input
                                        hidden
                                        accept="image/*"
                                        type="file"
                                        onChange={handleImageUpload}
                                    />
                                </Box>
                            )}
                        </Box>
                    </Box>

                    <Box>
                        <Box sx={blockLabelSx}>Select Room Color</Box>
                        <Box sx={{ ...groupSx, justifyItems: "stretch" }}>
                            <Box
                                sx={{
                                    width: "40px",
                                    height: "20px",
                                    borderRadius: "7px",
                                    border: `1px solid ${cc.line}`,
                                    boxSizing: "border-box",
                                    background: color,
                                }}
                            />
                            <SketchPicker
                                color={color}
                                onChange={(e) => handleChange(e)}
                                styles={sketchPickerStyles}
                            />
                        </Box>
                    </Box>

                    <Field
                        label="Full Control"
                        hint="Who can Book / Modify mettings for room"
                    >
                        <CcSelect
                            ariaLabel="Full Control"
                            multiple
                            value={fullControl}
                            onChange={handleFullControlChange}
                            renderValue={groupChips}
                        >
                            {groups
                                .filter((gp) => gp.access != "Read")
                                ?.map((name, index) => (
                                    <MenuItem
                                        key={index}
                                        value={name.id}
                                        sx={{
                                            fontWeight:
                                                fullControl.indexOf(
                                                    name.id
                                                ) === -1
                                                    ? theme.typography
                                                          .fontWeightRegular
                                                    : theme.typography
                                                          .fontWeightMedium,
                                        }}
                                    >
                                        {name.group_name}
                                    </MenuItem>
                                ))}
                        </CcSelect>
                    </Field>

                    <Field
                        label="Read Access"
                        hint="Who can Read / View meetings and room"
                    >
                        <CcSelect
                            ariaLabel="Read Access"
                            multiple
                            value={readAccess}
                            onChange={handleReadAccessChange}
                            renderValue={groupChips}
                        >
                            {groups
                                .filter((gp) => gp.access !== "Full")
                                ?.map((name, index) => (
                                    <MenuItem
                                        key={index}
                                        value={name.id}
                                        sx={{
                                            fontWeight:
                                                readAccess.indexOf(name.id) ===
                                                -1
                                                    ? theme.typography
                                                          .fontWeightRegular
                                                    : theme.typography
                                                          .fontWeightMedium,
                                        }}
                                    >
                                        {name.group_name}
                                    </MenuItem>
                                ))}
                        </CcSelect>
                    </Field>
                </DialogBody>
                <DialogFooter>
                    <Spacer />
                    <CcButton onClick={onClose}>Cancel</CcButton>
                    <CcButton variant="primary" onClick={onSubmit}>
                        Submit
                    </CcButton>
                </DialogFooter>
            </DialogSurface>
        </Dialog>
    );
};

export default AddNewRoom;
