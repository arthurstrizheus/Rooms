import { useEffect, useState } from "react";
import { Dialog, MenuItem } from "@mui/material";
import { PostRoomResource } from "../../../../Utilites/Functions/ApiFunctions/ResourceFunctions";
import {
    showError,
    showSuccess,
} from "../../../../Utilites/Functions/ApiFunctions";
import { useAuth } from "../../../../Utilites/AuthContext";
import {
    CcButton,
    CcSelect,
    DialogBody,
    DialogFooter,
    DialogHeader,
    DialogSurface,
    Field,
    scopeDialogProps,
    Spacer,
} from "../../../Components/Concourse/ConcourseDialogKit";

const AddNewRoomResource = ({
    open,
    setOpen,
    rooms,
    roomResources,
    resources,
    setUpdate,
}) => {
    const { user } = useAuth();
    const [room, setRoom] = useState("");
    const [resource, setResource] = useState("");
    const [filteredResources, setFilteredResources] = useState(resources);

    const onClose = () => {
        setRoom("");
        setResource("");
        setOpen(false);
    };

    const onSubmit = () => {
        if (room?.id && resource?.id) {
            PostRoomResource({
                room_id: room.id,
                resource_id: resource.id,
                created_user_id: user?.id,
            })
                .then((resp) => (resp ? showSuccess("Saved") : ""))
                .then(() => setUpdate((prev) => prev + 1));
        } else {
            showError("Fields cannot be empty");
        }
        onClose();
    };
    useEffect(() => {
        if (room?.id) {
            setFilteredResources(
                resources.filter(
                    (r) =>
                        r.id !=
                        roomResources?.find((rr) => rr.room_id == room.id)
                            ?.resources_id
                )
            );
        } else {
            setFilteredResources(resources);
        }
    }, [room]);

    return (
        <Dialog open={!!open} onClose={onClose} {...scopeDialogProps(480)}>
            {/* This page has no per-record accent, so the header wash is pinned
                to the brand red — otherwise `--cc-c` falls back to the
                meeting-type green (guide §7.5). */}
            <DialogSurface accent="var(--cc-red)">
                <DialogHeader title="Add Resource To Room" onClose={onClose} />
                <DialogBody>
                    <Field label="Select Room">
                        <CcSelect
                            ariaLabel="Select Room"
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
                        </CcSelect>
                    </Field>
                    <Field label="Select Resource">
                        <CcSelect
                            ariaLabel="Select Resource"
                            value={resource?.id || ""}
                            onChange={(e) => {
                                const selectedItem = filteredResources?.find(
                                    (itm) => itm.id === e.target.value
                                );
                                setResource(selectedItem); // Return the entire object
                            }}
                        >
                            {filteredResources?.map((itm, index) => (
                                <MenuItem key={index} value={itm.id}>
                                    {itm.name}
                                </MenuItem>
                            ))}
                        </CcSelect>
                    </Field>
                </DialogBody>
                <DialogFooter>
                    <Spacer />
                    <CcButton variant="primary" onClick={onSubmit}>
                        Submit
                    </CcButton>
                </DialogFooter>
            </DialogSurface>
        </Dialog>
    );
};

export default AddNewRoomResource;
