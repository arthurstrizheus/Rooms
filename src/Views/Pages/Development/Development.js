import { useEffect, useState } from "react";
import { useAuth } from "../../../Utilites/AuthContext";
import { useTheme } from "@emotion/react";
import { openSnackbar } from "../../../Utilites/SnackbarContext";
import {
  Grid,
  Stack,
  Typography,
  Button,
  Divider,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  TextField,
  Box,
  Tooltip,
  Chip,
  Tab,
  Tabs,
} from "@mui/material";
import {
  GetLocations,
  GetUserGroups,
  RunMatterManagerMonthlyGroupReport,
} from "../../../Utilites/Functions/ApiFunctions";

const Development = ({ setLoading }) => {
  const theme = useTheme();
  const { user, setUser } = useAuth();
  const [update, setUpdate] = useState(0);

  return (
    <Grid container sx={{ width: "100%", height: "100%", padding: 5 }}>
      <Grid item xs={2}>
        <Tooltip title="Run monthly matter manager group emails">
          <Button
            variant="outlined"
            onClick={() => RunMatterManagerMonthlyGroupReport()}
          >
            Run
          </Button>
        </Tooltip>
      </Grid>
    </Grid>
  );
};

export default Development;
