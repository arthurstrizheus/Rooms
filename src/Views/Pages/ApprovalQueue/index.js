import { Box } from "@mui/material";
import { useEffect } from "react";
import ApprovalQueue from "./ApprovalQueue";

const ApprovalQueuePage = ({ setLoading }) => {
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
            <ApprovalQueue setLoading={setLoading} />
        </Box>
    );
};

export default ApprovalQueuePage;
