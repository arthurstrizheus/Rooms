import { Box } from "@mui/material";
import { useEffect } from "react";
import MyCheckouts from "./MyCheckouts";

const MyCheckoutsPage = ({ setLoading, loading }) => {
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
            <MyCheckouts setLoading={setLoading} loading={loading} />
        </Box>
    );
};

export default MyCheckoutsPage;
