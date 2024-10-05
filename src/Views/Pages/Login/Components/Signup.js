import { useEffect, useState } from "react";
import { useAuth } from "../../../../Utilites/AuthContext";
import { useNavigate } from "react-router-dom";
import { Avatar, Container, CssBaseline } from "@mui/material";
import {
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  Box,
  TextField,
  Button,
  Link,
  MenuItem,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import {
  GetLocations,
  showSuccess,
  showError,
} from "../../../../Utilites/Functions/ApiFunctions";
import { PostUser } from "../../../../Utilites/Functions/ApiFunctions/UserFunctions";
import { useTheme } from "@emotion/react";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Copyright(props) {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      align="center"
      {...props}
    >
      {"Copyright © "}
      <Link color="inherit" href="https://arthurstrizheus.com">
        Arthur Strizheus
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
}

export default function SignUp({ setLoading }) {
  const [email, setEmail] = useState(""); // Track email state
  const [emailError, setEmailError] = useState(false); // Track email validation error
  const [location, setLocation] = useState("");
  const [locations, setLocations] = useState([]);
  const { login, setUser } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const fetchLocations = async () => {
      const lcs = await GetLocations();
      setLocations(lcs);
      setLoading(false);
    };
    fetchLocations();
  }, [setLoading]);

  const handleEmailChange = (event) => {
    const value = event.target.value;
    setEmail(value);

    // Validate email as the user types
    if (!emailPattern.test(value) && value !== "") {
      setEmailError(true);
    } else {
      setEmailError(false);
    }
  };

  const handleSubmit = (event) => {
    setLoading(true);
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = data.get("password");
    const password2 = data.get("password2");
    const firstName = data.get("firstName");
    const lastName = data.get("lastName");

    // Final email validation before submission
    if (!emailPattern.test(email)) {
      showError("Invalid email format. Please enter a valid email.");
      setLoading(false);
      return;
    }

    // Password matching validation
    if (password !== password2) {
      showError(
        "Passwords do not match. Please ensure both passwords are identical."
      );
      setLoading(false);
      return;
    } else if (password.length < 6) {
      showError("Password cannot be less than 6 characters");
      setLoading(false);
      return;
    }

    // Check for missing fields
    if (!email || !password || !firstName || !lastName || !location) {
      showError("Please fill in all the required fields.");
      setLoading(false);
      return;
    }

    PostUser({
      first_name: firstName,
      last_name: lastName,
      location: location.officeid,
      created_user_id: null,
      email,
      password,
      admin: true,
      active: true,
    })
      .then(async (resp) => {
        if (resp) {
          setUser(resp);
          localStorage.setItem("user", JSON.stringify(resp));
          showSuccess("Account created successfully. Thanks Arthur!");
          login();
          navigate("/schedule/type/day");
        } else {
          showError("Failed to create account. Please try again.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign up
        </Typography>
        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoComplete="given-name"
                name="firstName"
                required
                fullWidth
                id="firstName"
                label="First Name"
                autoFocus
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                id="lastName"
                label="Last Name"
                name="lastName"
                autoComplete="family-name"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={email} // Track email input
                onChange={handleEmailChange} // Validate on change
                error={emailError} // Show error if email is invalid
                helperText={emailError ? "Invalid email format" : ""} // Display error message
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="password2"
                label="Re-enter Password"
                type="password"
                id="password2"
                autoComplete="new-password2"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl
                variant="standard"
                sx={{ minWidth: 160, width: "100%" }}
              >
                <InputLabel id="demo-simple-select-standard-label">
                  Location *
                </InputLabel>
                <Select
                  labelId="demo-simple-select-standard-label"
                  id="location"
                  required
                  value={location?.officeid || ""}
                  name="location"
                  label="Location"
                  onChange={(e) => {
                    const selectedItem = locations?.find(
                      (itm) => itm?.officeid === e.target.value
                    );
                    setLocation(selectedItem); // Return the entire object
                  }}
                >
                  {locations?.length > 0 &&
                    locations?.map((itm, index) => (
                      <MenuItem key={index} value={itm?.officeid}>
                        {itm?.Alias}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Button
            type="submit"
            fullWidth
            variant="outlined"
            sx={{
              mt: 3,
              mb: 2,
              ":hover": { background: theme.palette.primary.lightHover },
            }}
          >
            Sign Up
          </Button>
          <Grid container justifyContent="flex-end">
            <Grid item>
              <Link href="\login" variant="body2">
                Already have an account? Sign in
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
      <Copyright sx={{ mt: 5 }} />
    </Container>
  );
}
