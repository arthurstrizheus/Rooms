import { useEffect, useState } from "react";
import {
    Stack,
    Typography,
    Button,
    Dialog,
    FormControl,
    InputLabel,
    Select,
    Divider,
    MenuItem,
    Tooltip,
} from "@mui/material";
import { PostRoomResource } from "../../../../Utilites/Functions/ApiFunctions/ResourceFunctions";
import {
    showError,
    showSuccess,
} from "../../../../Utilites/Functions/ApiFunctions";
import { useAuth } from "../../../../Utilites/AuthContext";

const AddNewRoomResource = ({
    open,
    setOpen,
    rooms,
    roomResources,
    resources,
    equipments,
    setUpdate,
}) => {
    const { user } = useAuth();
    const [room, setRoom] = useState("");
    const [resource, setResource] = useState("");
    const [equipment, setEquipment] = useState("");
    const [filteredResources, setFilteredResources] = useState(resources);
    const [filteredEquipment, setFilteredEquipment] = useState(equipments);

    const onClose = () => {
        setRoom("");
        setResource("");
        setEquipment("");
        setOpen(false);
    };

    const onSubmit = () => {
        if (room?.id && (resource?.id || equipment?.id)) {
            PostRoomResource({
                room_id: room.id,
                resource_id: resource.id || equipment.id,
                created_user_id: user?.id,
                equipment: equipment?.id ? true : false,
            })
                .then((resp) => (resp ? showSuccess("Saved") : ""))
                .then(() => setUpdate((prev) => prev + 1));
            onClose();
        } else {
            showError("Fields cannot be empty");
        }
    };
    useEffect(() => {
        if (room?.id) {
            setFilteredResources(
                resources.filter(
                    (r) =>
                        r.id !=
                            roomResources?.find((rr) => rr.room_id == room.id)
                                ?.resources_id && !r.equipment
                )
            );
            setFilteredEquipment(
                equipments.filter(
                    (r) =>
                        r.id !=
                        roomResources?.find((rr) => rr.room_id == room.id)
                            ?.equipment_id
                )
            );
        } else {
            setFilteredResources(resources);
            setFilteredEquipment(equipments);
        }
    }, [room]);

    return (
        <Dialog open={!!open} onClose={onClose} maxWidth="xs">
            <Stack
                direction={"column"}
                sx={{ width: "300px", padding: "20px" }}
            >
                <Typography
                    variant="h5"
                    textAlign={"center"}
                    width={"100%"}
                    fontFamily={"Courier New, sans-serif"}
                    marginBottom={2}
                >
                    Add Resource To Room
                </Typography>
                <Divider width={"100%"} />
                <FormControl
                    variant="standard"
                    sx={{ minWidth: 160, width: "100%" }}
                >
                    <InputLabel id="demo-simple-select-standard-label">
                        {room?.id ? "Selected Room" : "Select Room"}
                    </InputLabel>
                    <Select
                        sx={{ width: "100%" }}
                        labelId="demo-simple-select-standard-label"
                        id="demo-simple-select-standard"
                        value={room?.id || ""}
                        onChange={(e) => {
                            const selectedItem = rooms?.find(
                                (itm) => itm.id === e.target.value
                            );
                            setRoom(selectedItem); // Return the entire object
                        }}
                    >
                        {rooms?.map((itm, index) => (
                            <MenuItem key={index} value={itm.id}>
                                {itm.value}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Tooltip
                    title={
                        equipment?.id
                            ? "Can only select equipment or resource"
                            : !room?.id
                            ? "Please Select Room First"
                            : ""
                    }
                >
                    <FormControl
                        variant="standard"
                        sx={{ minWidth: 160, width: "100%" }}
                    >
                        <InputLabel id="demo-simple-select-standard-label">
                            {!equipment?.id
                                ? resource?.id
                                    ? "Selected Resource"
                                    : "Select Resource"
                                : ""}
                        </InputLabel>
                        <Select
                            sx={{ width: "100%" }}
                            labelId="demo-simple-select-standard-label"
                            id="demo-simple-select-standard"
                            value={resource?.id || ""}
                            disabled={equipment?.id || !room?.id ? true : false}
                            onChange={(e) => {
                                if (e.target.value !== "") {
                                    const selectedItem =
                                        filteredResources?.find(
                                            (itm) => itm.id === e.target.value
                                        );
                                    setResource(selectedItem); // Return the entire object
                                } else {
                                    setResource("");
                                }
                                setEquipment("");
                            }}
                        >
                            {filteredResources?.map((itm, index) => (
                                <MenuItem key={index} value={itm.id}>
                                    {itm.name}
                                </MenuItem>
                            ))}
                            <MenuItem key={"none"} value={""}>
                                None
                            </MenuItem>
                        </Select>
                    </FormControl>
                </Tooltip>
                <Tooltip
                    title={
                        resource?.id
                            ? "Can only select equipment or resource"
                            : !room?.id
                            ? "Please Select Room First"
                            : ""
                    }
                >
                    <FormControl
                        variant="standard"
                        sx={{ minWidth: 160, width: "100%" }}
                    >
                        <InputLabel id="demo-simple-select-standard-label">
                            {!resource?.id
                                ? equipment?.id
                                    ? "Selected Equipment"
                                    : "Select Equipment"
                                : ""}
                        </InputLabel>
                        <Select
                            sx={{ width: "100%" }}
                            labelId="demo-simple-select-standard-label"
                            id="demo-simple-select-standard"
                            value={equipment?.id || ""}
                            disabled={resource?.id || !room?.id ? true : false}
                            onChange={(e) => {
                                if (e.target.value !== "") {
                                    const selectedItem =
                                        filteredEquipment?.find(
                                            (itm) => itm.id === e.target.value
                                        );
                                    setEquipment(selectedItem); // Return the entire object
                                } else {
                                    setEquipment("");
                                }
                                setResource("");
                            }}
                        >
                            {filteredEquipment?.map((itm, index) => (
                                <MenuItem key={index} value={itm.id}>
                                    {itm.name}
                                </MenuItem>
                            ))}
                            <MenuItem key={"none"} value={""}>
                                None
                            </MenuItem>
                        </Select>
                    </FormControl>
                </Tooltip>
                <Button
                    variant="outlined"
                    sx={{
                        marginTop: "20px",
                        backgroundColor: "rgba(0,170,0,.2)",
                        ":hover": { backgroundColor: "rgba(0,200,0,.4)" },
                    }}
                    onClick={onSubmit}
                >
                    Submit
                </Button>
            </Stack>
        </Dialog>
    );
};

export default AddNewRoomResource;
