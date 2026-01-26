import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useEffect } from "react";
import Users from "./Components/Users";

const UserManagement = ({ setLoading }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    useEffect(() => {});

    return (
        <Box
            sx={{
                display: "flex",
                flexGrow: 1,
                flexDirection: "column",
                height: isMobile ? "auto" : "100%",
                overflow: isMobile ? "visible" : "hidden",
                padding: 2,
            }}
        >
            <Users setLoading={setLoading} />
        </Box>
    );
};

export default UserManagement;
