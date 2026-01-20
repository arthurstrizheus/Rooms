import { Box } from "@mui/material";
import { useEffect } from "react";
import Equipment from "./Equipment";

const EquipmentPage = ({ setLoading, loading }) => {
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
            <Equipment setLoading={setLoading} loading={loading} />
        </Box>
    );
};

export default EquipmentPage;
