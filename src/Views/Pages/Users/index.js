import { Box } from "@mui/material";
import { useEffect } from "react";
import Users from "./Components/Users";

const UserManagement = ({ setLoading }) => {
    useEffect(() => {});

    return (
        <Box
            sx={{
                display: "flex",
                flexGrow: 1,
                flexDirection: "column",
                height: "100%",
                overflow: "hidden",
                padding: 2,
            }}
        >
            <Users setLoading={setLoading} />
        </Box>
    );
};

export default UserManagement;
