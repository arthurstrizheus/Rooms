import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../Utilites/AuthContext";
import {
  Grid,
  Typography,
  Box,
  Checkbox,
  Button,
  Container,
  CssBaseline,
  Avatar,
  TextField,
  FormControlLabel,
  Link,
  Input,
  OutlinedInput,
  InputLabel,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import {
  AuthenticateUser,
  AuthenticateUserAD,
  UserExistsInAD,
} from "../../../Utilites/Functions/ApiFunctions/UserFunctions";
import { useTheme } from "@emotion/react";
import {
  GetLocations,
  showError,
} from "../../../Utilites/Functions/ApiFunctions";

function Copyright(props) {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      align="center"
      {...props}
    >
      {"Copyright © "}
      <Link color="inherit" href="https://sealimited.com/">
        S.E.A. Limited
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
}

export default function Login({ setLoading }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const { setUser, login } = useAuth();
  const [rememberMe, setRememberMe] = useState(false); // State to track "Remember me"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState("");
  const [showLocations, setShowLocations] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetchLocations = async () => {
      const lcs = await GetLocations();
      setLocations(lcs);
      setLoading(false);
    };
    fetchLocations();
  }, [setLoading]);

  // On component mount, check if user info exists in localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedRememberMe = localStorage.getItem("rememberMe") == "true";

    if (storedUser) {
      setUser(JSON.parse(storedUser));
      navigate(localStorage.getItem("lastlocation"));
      login();
    }
    if (storedRememberMe) {
      const email = localStorage.getItem("email");
      setRememberMe(true);
      setEmail(email || "");
    }
  }, []);

  const handleSubmit = (event) => {
    setLoading(true);
    event.preventDefault();
    if (showLocations && !location?.officeid) {
      showError("You must select your location");
    } else {
      AuthenticateUserAD({
        email: email,
        password: password,
        location: location?.officeid,
      }).then((resp) => {
        if (resp) {
          console.log("resp", resp);
          if (resp?.id) {
            setUser(resp);
            login();
            setShowLocations(false);
            localStorage.setItem("user", JSON.stringify(resp));

            if (rememberMe) {
              localStorage.setItem("email", `${email}`);
              localStorage.setItem("rememberMe", "true");
            } else {
              // Clear user from localStorage if "Remember me" is not checked
              localStorage.removeItem("email");
              localStorage.setItem("rememberMe", "false");
            }
            setLoading(false);
            navigate("/schedule/type/day");
          }
        }
      });
    }
    // AuthenticateUser({ email: email, password: password }).then(resp => {
    //     if (resp?.id) {
    //         setUser(resp);
    //         login();

    //         localStorage.setItem('user', JSON.stringify(resp));

    //         if (rememberMe) {
    //             localStorage.setItem('email', `${email}`);
    //             localStorage.setItem('rememberMe', 'true');
    //         } else {
    //             // Clear user from localStorage if "Remember me" is not checked
    //             localStorage.removeItem('email');
    //             localStorage.setItem('rememberMe', 'false');
    //         }
    //         setLoading(false);
    //         navigate('/schedule/type/day');
    //     }
    // });
  };

  const handleRememberMeChange = (event) => {
    setRememberMe(event.target.checked);
    if (!event.target.checked) {
      localStorage.removeItem("email");
      localStorage.removeItem("rememberMe");
    }
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
          <LockIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <FormControl variant="outlined" fullWidth required>
            <InputLabel htmlFor="email">S-E-A Username</InputLabel>
            <OutlinedInput
              id="email"
              name="Email"
              label="S-E-A Username"
              placeholder="S-E-A Username"
              type="username"
              value={email}
              onBlur={() =>
                UserExistsInAD({ username: email }).then((resp) =>
                  setShowLocations(!resp)
                )
              }
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </FormControl>
          <FormControl
            variant="outlined"
            fullWidth
            required
            sx={{ marginTop: "20px" }}
          >
            <InputLabel htmlFor="password">Password</InputLabel>
            <OutlinedInput
              id="password"
              name="Password"
              label="Password"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormControl>
          {showLocations ? (
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
          ) : (
            <></>
          )}

          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={handleRememberMeChange}
                color="primary"
              />
            }
            label="Remember me"
          />
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
            Sign In
          </Button>
          {showPass ? (
            <Grid container>
              <Grid item xs>
                <Link href="#" variant="body2">
                  Forgot password?
                </Link>
              </Grid>

              <Grid item>
                <Link href="/signup" variant="body2">
                  {"Don't have an account? Sign Up"}
                </Link>
              </Grid>
            </Grid>
          ) : (
            <></>
          )}
        </Box>
      </Box>
      <Copyright sx={{ mt: 8, mb: 4 }} />
    </Container>
  );
}
