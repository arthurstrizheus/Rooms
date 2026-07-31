import { useState } from "react";
import { Dialog } from "@mui/material";
import {
    showError,
    showSuccess,
} from "../../../../Utilites/Functions/ApiFunctions";
import { useAuth } from "../../../../Utilites/AuthContext";
import { PostResource } from "../../../../Utilites/Functions/ApiFunctions/ResourceFunctions";
import {
    CcButton,
    CcInput,
    DialogBody,
    DialogFooter,
    DialogHeader,
    DialogSurface,
    Field,
    scopeDialogProps,
    Spacer,
} from "../../../Components/Concourse/ConcourseDialogKit";

const AddNewResource = ({ open, setOpen, location, setUpdate }) => {
    const [name, setName] = useState("");
    const { user } = useAuth();

    const onClose = () => {
        setName("");
        setOpen(false);
    };

    const onSubmit = () => {
        if (name != "") {
            PostResource({
                name: name,
                location: location.officeid,
                created_user_id: user?.id,
            })
                .then((resp) => (resp ? showSuccess("Saved") : ""))
                .then(() => setUpdate((prev) => prev + 1));
            setName("");
            setOpen(false);
        } else {
            showError("Name field cannot be empty");
        }
    };

    return (
        <Dialog open={!!open} onClose={onClose} {...scopeDialogProps(480)}>
            {/* No per-record accent on this page, so the header wash is pinned
                to the brand red (guide §7.5). */}
            <DialogSurface accent="var(--cc-red)">
                <DialogHeader title="Create Resource" onClose={onClose} />
                <DialogBody>
                    <Field label="Resource Name" htmlFor="new-resource-name">
                        <CcInput
                            id="new-resource-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Resource Name"
                            autoComplete="off"
                        />
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

export default AddNewResource;
