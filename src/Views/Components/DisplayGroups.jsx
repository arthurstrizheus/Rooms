import { Chip, Tooltip, Typography } from "@mui/material";

const DisplayGroups = ({ groups }) => {
    // Group by group_name and collect access types
    const groupedByName =
        groups?.reduce((acc, group) => {
            const { group_name, access } = group;

            // Check if this is a group name that ends with "Read" or "Full" (case insensitive)
            let baseGroupName = group_name;
            let derivedAccess = access;

            if (group_name.toLowerCase().endsWith("read")) {
                baseGroupName = group_name.slice(0, -4).trim();
                derivedAccess = "Read";
            } else if (group_name.toLowerCase().endsWith("full")) {
                baseGroupName = group_name.slice(0, -4).trim();
                derivedAccess = "Full";
            }

            if (!acc[baseGroupName]) {
                acc[baseGroupName] = [];
            }
            acc[baseGroupName].push(derivedAccess);
            return acc;
        }, {}) || {};

    return (
        <>
            {Object.entries(groupedByName).map(
                ([groupName, accessTypes], index) => {
                    // Remove duplicates
                    const uniqueAccessTypes = [...new Set(accessTypes)];
                    const hasFullAccess = uniqueAccessTypes.includes("Full");
                    const hasReadAccess = uniqueAccessTypes.includes("Read");

                    let displayText = groupName;
                    let tooltipText = "";

                    if (hasFullAccess && hasReadAccess) {
                        displayText = `${groupName} (F/R)`;
                        tooltipText = "Full and Read Access";
                    } else if (hasFullAccess) {
                        tooltipText = "Full Access";
                    } else if (hasReadAccess) {
                        tooltipText = "Read Access";
                    } else {
                        tooltipText = `${uniqueAccessTypes[0]} Access`;
                    }

                    return (
                        <Tooltip
                            key={index}
                            arrow
                            title={
                                <Typography variant="body2">
                                    {tooltipText}
                                </Typography>
                            }
                        >
                            <Chip
                                sx={{
                                    cursor: "pointer",
                                    marginLeft: "2px",
                                    marginTop: "2px",
                                }}
                                label={displayText}
                            />
                        </Tooltip>
                    );
                }
            )}
        </>
    );
};

export default DisplayGroups;
