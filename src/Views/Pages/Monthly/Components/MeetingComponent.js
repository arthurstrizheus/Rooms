import {getContrastHexColor} from '../../../../Utilites/Functions/ColorFunctions'
import { format } from 'date-fns';
import { useTheme } from "@emotion/react";
import { useState } from "react";
import { getHours } from '../../../../Utilites/Functions/CommonFunctions';
import {Grid, Stack, Typography, Box, Tooltip } from "@mui/material";


/**
 * Get 'a' for AM and 'p' for PM based on the provided date
 * @param {Date | number} date - The date object or timestamp
 * @returns {string} - 'a' for AM and 'p' for PM
 */
const getAmPm = (date) => {
    // Use date-fns format function to get the AM/PM part of the time
    const amPm = format(date, 'a');
    // Return 'a' for AM and 'p' for PM
    return amPm.toLowerCase().charAt(0);
};


const MeetingComponent = ({types, meeting, onClick, day}) => {
    const theme = useTheme();
    const backgroundColor = types?.find(tp => tp.id === meeting?.type)?.color;
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);
    const start = new Date(meeting.start_time);
    const end = new Date(meeting.end_time);
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

    return(
        <Box sx={{ width: '100%' }}>
            <Tooltip
                title={
                    <>
                        <Grid textAlign={'center'}>
                            <Typography fontSize={15} fontFamily={"Candara"}>{meeting.name}</Typography>
                            <Typography fontSize={13} variant="caption" >{start.getHours()}:{String(start.getMinutes()).padStart(2, '0')}{getAmPm(start)}m - {end.getHours() > 12 ? end.getHours() - 12 : end.getHours()}:{String(end.getMinutes()).padStart(2, '0')}{getAmPm(end)}m</Typography>
                        </Grid>
                    </>
                }
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
            <Stack 
                direction={'row'} 
                sx={{ 
                        width: '100%', 
                        height: '18px', 
                        overflow: 'hidden', 
                        cursor:'pointer',
                        ':hover':{}
                    }} 
                spacing={'3px'} 
                onClick={() => onClick(meeting, true)}
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <Grid sx={{ background: backgroundColor, display: 'flex', alignItems: 'center'}}>
                    <Stack direction={'row'} >
                        <Typography color={getContrastHexColor(backgroundColor)} sx={{ fontSize: '14px', fontWeight: 'bold' }}>
                            {getHours(meeting.start_time)}
                        </Typography>
                        <Typography color={getContrastHexColor(backgroundColor)} sx={{ fontSize: '9px', fontWeight: 'bold', marginTop: '3px' }}>
                            {String(new Date(meeting?.start_time).getMinutes()).padStart(2, '0')}
                        </Typography>
                        <Typography color={getContrastHexColor(backgroundColor)} sx={{ fontSize: '11px', fontWeight: 'light', marginTop: '4px' }}>
                            {getAmPm(new Date(meeting?.start_time))}
                        </Typography>
                    </Stack>
                </Grid>
                <Typography
                    sx={{
                        fontSize: '14px',
                        marginTop: '4px',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        flexGrow: 1, // Allow this Typography to take up the remaining space
                        fontFamily: 'Candara'
                    }}
                >
                    {meeting.name}
                </Typography>
            </Stack>
        </Tooltip>
        </Box>
    );
};

export default MeetingComponent;