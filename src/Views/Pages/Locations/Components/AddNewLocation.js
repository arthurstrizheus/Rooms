import { useEffect, useState } from "react";
import {
  Stack,
  Typography,
  Button,
  Dialog,
  Divider,
  Input,
  Box,
} from "@mui/material";
import {
  showError,
  showSuccess,
} from "../../../../Utilites/Functions/ApiFunctions";
import {
  PostLocation,
  UpdateLocation,
} from "../../../../Utilites/Functions/ApiFunctions/LocationFunctions";

const AddNewLocation = ({ open, setOpen, setUpdate, updateItem }) => {
  const ariaLabel = { "aria-label": "description" };
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [number, setNumber] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [airport, setAirport] = useState("");

  const onClose = () => {
    setName("");
    setOpen(false);
  };

  const onCloseUpdate = () => {
    setUpdate((prev) => prev + 1);
    setName("");
    setOpen(false);
  };

  const onSubmit = () => {
    if (
      (name != "",
      city != "",
      number != "",
      address != "",
      state != "",
      zip != "",
      airport != "")
    ) {
      if (updateItem?.officeid) {
        UpdateLocation(updateItem?.officeid, {
          Alias: name,
          Airport: airport,
          Zip: zip,
          state: state,
          SAddress: address,
          Number: number,
          City: city,
        })
          .then((resp) =>
            resp
              ? showSuccess("Location Updated")
              : showError("Failed to update")
          )
          .then(() => onCloseUpdate());
      } else {
        PostLocation({
          Alias: name,
          Airport: airport,
          Zip: zip,
          state: state,
          SAddress: address,
          Number: number,
          City: city,
        })
          .then((resp) =>
            resp ? showSuccess("Saved") : showError("Failed to save")
          )
          .then(() => onCloseUpdate());
      }
    } else {
      showError("Name field cannot be empty");
    }
  };

  useEffect(() => {
    if (updateItem?.officeid) {
      setName(updateItem?.Alias);
      setCity(updateItem?.City);
      setAddress(updateItem?.SAddress);
      setState(updateItem?.state);
      setZip(updateItem?.Zip);
      setAirport(updateItem?.Airport);
    }
  }, [updateItem]);

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="xl">
      <Stack direction={"column"} sx={{ width: "700px", padding: "20px" }}>
        <Typography
          variant="h5"
          textAlign={"center"}
          width={"100%"}
          fontFamily={"Courier New, sans-serif"}
          marginBottom={2}
        >
          Create A Location
        </Typography>
        <Divider width={"100%"} />
        <Stack direction={"row"} spacing={6}>
          <Box
            sx={{
              display: "flex",
              flexGrow: 1,
              gap: 1,
              flexDirection: "column",
            }}
          >
            <Input
              sx={{ marginTop: "30px" }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Location Name"
              inputProps={ariaLabel}
            />
            <Input
              sx={{ marginTop: "30px" }}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              inputProps={ariaLabel}
            />
            <Input
              sx={{ marginTop: "30px" }}
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="Zipcode"
              inputProps={ariaLabel}
            />
            <Input
              sx={{ marginTop: "30px" }}
              value={airport}
              onChange={(e) => setAirport(e.target.value)}
              placeholder="Nearest Airport"
              inputProps={ariaLabel}
            />
          </Box>
          <Box
            sx={{
              display: "flex",
              flexGrow: 1,
              gap: 1,
              flexDirection: "column",
            }}
          >
            <Input
              sx={{ marginTop: "30px" }}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street Address"
              inputProps={ariaLabel}
            />
            <Input
              sx={{ marginTop: "30px" }}
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State"
              inputProps={ariaLabel}
            />
            <Input
              sx={{ marginTop: "30px" }}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Phone Number"
              inputProps={ariaLabel}
            />
          </Box>
        </Stack>
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

export default AddNewLocation;
