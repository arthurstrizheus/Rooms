import React, { useState } from "react";
import {Grid, Tooltip} from "@mui/material";


const MinuteBox = React.memo(({ theme, onClick, min, hour, room, am }) => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);

    // Handle mouse movement
    const handleMouseMove = (e) => {
    setMousePosition({
        x: e.clientX,
        y: e.clientY,
    });
    };

    // Handle mouse enter
    const handleMouseEnter = () => {
    setIsTooltipOpen(true);
    };

    // Handle mouse leave
    const handleMouseLeave = () => {
    setIsTooltipOpen(false);
    };

    return (
        <Tooltip
            title="Create booking here"
            arrow
            placement="top"
            open={isTooltipOpen}
            PopperProps={{
                anchorEl: {
                    getBoundingClientRect: () => ({
                    top: mousePosition.y,
                    left: mousePosition.x,
                    right: mousePosition.x,
                    bottom: mousePosition.y,
                    width: 0,
                    height: 0,
                    }),
                },
                sx: {
                    pointerEvents: "none", // Avoid tooltip interaction affecting cursor
                    // Adjusting placement to avoid overlap with cursor
                    transform: "translateY(-50%) translateX(10px)",
                },
            }}
            componentsProps={{
            tooltip: {
                sx: {
                bgcolor: theme.palette.primary.dark,
                color: theme.palette.primary.text.light.light,
                fontSize: ".8rem",
                padding: "10px",
                },
            },
            arrow: {
                sx: {
                color: theme.palette.primary.dark,
                },
            },
            }}
            sx={{':hover':{cursor:'pointer'}}}
        >
            <Grid
                borderRight={`1px solid rgb(220, 220, 220)`}
                height={"75px"}
                width={"100%"}
                minWidth={"40px"}
                sx={{
                    ":hover": {
                    background: "#fdffcf",
                    borderBottom: `1px solid ${theme.palette.border.main}`,
                    cursor:'pointer'
                    },
                }}
                onClick={() => onClick(min, hour, room, am)}
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            />
        </Tooltip>
    );
});

export default MinuteBox;
