import { useEffect, useState } from "react";
import { Dialog, MenuItem } from "@mui/material";
import { useAuth } from "../../../../Utilites/AuthContext";
import { PostGroup } from "../../../../Utilites/Functions/ApiFunctions/GroupFunctions";
import { showError } from "../../../../Utilites/Functions/ApiFunctions";
import {
  CcButton,
  CcInput,
  CcSelect,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSurface,
  Field,
  scopeDialogProps,
  Spacer,
} from "../../../Components/Concourse/ConcourseDialogKit";

/* ------------------------------------------------------------------ notes ---
 * Concourse adoption. Visual only: onClose, onSubmit, the validation guard and
 * its literal string, the POST payload shape and the Full/Read enum values are
 * all carried over unchanged. The location-block condition keeps its original
 * tests but is now parenthesised — see the comment at the block itself.
 * -------------------------------------------------------------------------- */

const AddNewGroup = ({ open, setOpen, location, locations, setUpdate }) => {
  const { user } = useAuth();
  const [access, setAccess] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(location);

  const onClose = () => {
    setOpen(false);
    setGroupName("");
    setAccess("");
    setUpdate((prev) => prev + 1);
  };

  const onSubmit = () => {
    if (
      groupName != "" &&
      access != "" &&
      (selectedLocation?.officeid || selectedLocation?.officeid === 0)
    ) {
      PostGroup({
        group_name: groupName,
        access: access,
        location: selectedLocation.officeid,
        created_user_id: user?.id,
      }).then(() => onClose());
    } else {
      showError("Fields cannot be empty");
    }
  };

  useEffect(() => {
    setSelectedLocation(location);
  }, [location]);

  return (
    // `--cc-c` on the page root never reaches a portal, so the surface carries
    // its own accent or DialogHeader's gradient washes bright green (guide §7.5).
    <Dialog open={!!open} onClose={onClose} {...scopeDialogProps(480)}>
      <DialogSurface accent="var(--cc-red)">
        <DialogHeader title="Add New Group" onClose={onClose} />
        <DialogBody>
          <Field label="Group Name" htmlFor="group-name">
            <CcInput
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group Name"
            />
          </Field>
          <Field label="Select Access" htmlFor="group-access">
            <CcSelect
              id="group-access"
              ariaLabel="Select Access"
              value={access}
              onChange={(e) => setAccess(e.target.value)}
            >
              <MenuItem key={1} value={"Full"}>
                Full
              </MenuItem>
              <MenuItem key={2} value={"Read"}>
                Read
              </MenuItem>
            </CcSelect>
          </Field>
          {/* Shown only when the caller supplied no location, so the group has
              somewhere to go. The three tests were originally unparenthesised;
              `&&` binds tighter than `||`, so the guard bound to the last test
              alone and the block was unreachable for every value of `location`.
              Parenthesised, not rewritten: the tests themselves are unchanged. */}
          {(location === 0 ||
            location == undefined ||
            location == null) && (
              <Field label="Select Location" htmlFor="group-location">
                <CcSelect
                  id="group-location"
                  ariaLabel="Select Location"
                  value={
                    selectedLocation?.officeid === 0
                      ? 0
                      : selectedLocation?.officeid
                      ? selectedLocation.officeid
                      : ""
                  }
                  onChange={(e) => {
                    const selectedItem = locations?.find(
                      (itm) => itm.officeid === e.target.value
                    );
                    setSelectedLocation(selectedItem); // Return the entire object
                  }}
                >
                  {locations?.map((itm, index) => (
                    <MenuItem key={index} value={itm.officeid}>
                      {itm.Alias}
                    </MenuItem>
                  ))}
                </CcSelect>
              </Field>
            )}
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

export default AddNewGroup;
