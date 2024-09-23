import { useState, useEffect } from 'react';
import { useTheme } from '@emotion/react';
import { getHours } from '../../../../Utilites/Functions/CommonFunctions';
import { format } from 'date-fns';
import {Grid, Typography, Box, Tooltip} from "@mui/material";

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


const MeetingBox = ({ meeting, onUpdateMeeting, userGroups, rooms, meetingTypesRes, update }) => {
    const theme = useTheme();
    const [startPosition, setStartPosition] = useState({right: 0, width: 0 });
    const [padLeft, setPadLeft] = useState(true);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);
    const start = new Date(meeting.start_time);
    const end = new Date(meeting.end_time);
    // How many boxes from the right is that hour or min (15 boxes ie 40px)
    const hourIndex = {'7':11,'8':10,'9':9,'10':8,'11':7,'12':6,'1':5,'2':4,'3':3,'4':2,'5':1 ,'6': 1};
    const minIndex = {'0':4, '15':3, '30':2, '45':1};

    useEffect(() => {
        const start = new Date(meeting.start_time);
        const end = new Date(meeting.end_time);

        // 6:00 PM in minutes from the start of the day (6 PM = 1080 minutes)
        const sixPmInMinutes = 18 * 60; // 6:00 PM is 18 hours * 60 minutes = 1080 minutes

        // Convert start and end time into minutes from 6:00 PM
        const startTimeInMinutes = (start.getHours() * 60) + start.getMinutes(); // Total minutes from start of the day
        const endTimeInMinutes = (end.getHours() * 60) + end.getMinutes(); // Total minutes from start of the day

        // Calculate how far the meeting is from 6:00 PM (rightmost point)
        const minutesFromSixPm = sixPmInMinutes - startTimeInMinutes;

        // Calculate the meeting duration in minutes
        const meetingDurationInMinutes = endTimeInMinutes - startTimeInMinutes;

        // Calculate the right position in pixels (relative to 6:00 PM = 0 minutes)
        const right = (minutesFromSixPm / 15) * 40; // 40 pixels per 15 minutes

        // Calculate the width in pixels based on the meeting duration
        const width = (meetingDurationInMinutes / 15) * 40;

        // Padding logic (if needed)
        let padding = 0;
        if (
            ((start.getHours() === end.getHours() && start.getMinutes() + 15 === end.getMinutes()) ||
            (start.getHours() + 1 === end.getHours() && start.getMinutes() + 15 === 60 && end.getMinutes() === 0)) &&
            meeting?.type
        ) {
            setPadLeft(false);
        } else {
            setPadLeft(true);
            padding = 10; // Padding for display purposes if required
        }

        // Adjust the width for padding
        let adjustedWidth = width - padding;
        if(!meeting?.type){ // Why??? idk, i hate this
            adjustedWidth += 10;
        }

        // Set the calculated right and width
        setStartPosition({ right, width: adjustedWidth });
    }, [meeting, rooms, update]);

    const getColorByType = () => (meetingTypesRes.find(mt => mt.id == meeting.type).color);

    if (!meeting?.type) {
        return (
            <Box
                sx={{
                    transform: 'translateX(100%)',
                    position: 'absolute',
                    right: `${startPosition.right}px`,
                    height: `75px`,
                    width: `${startPosition.width}px`,
                    background: '#f5f5f5',
                    border: `1px solid ${theme.palette.grey[400]}`,
                    cursor: 'not-allowed',
                    textAlign:'center',
                    overflow:'hidden'
                }}
            >
                <Typography 
                    marginTop={'20px'} 
                    variant="body2" 
                    paddingLeft={'10px'} 
                    paddingTop={'5px'} 
                    fontSize={16} 
                    fontWeight={'light'}
                    fontFamily={'Candara'}
                >Blocked</Typography>
            </Box>
        );
    }

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
                title={
                    <>
                        <Grid textAlign={'center'}>
                            <Typography fontSize={15} fontFamily={"Candara"}>{meeting.name}</Typography>
                            <Typography fontSize={13} variant="caption" >{getHours(meeting.start_time)}:{String(start.getMinutes()).padStart(2, '0')}{getAmPm(start)}m - {getHours(meeting.end_time)}:{String(end.getMinutes()).padStart(2, '0')}{getAmPm(end)}m</Typography>
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
                <Box
                    sx={{
                        transform: 'translateX(100%)',
                        position: 'absolute',
                        right: `${startPosition.right}px`,
                        height: `70px`,
                        width: `${startPosition.width}px`,
                        background: getColorByType(),
                        border: `1px solid ${theme.palette.border.light}`,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        flexDirection: 'column', // Change to column to stack Typography elements
                        alignItems:'flex-start', // Align text according to padding
                        paddingLeft: padLeft ? '10px' : '',
                        paddingTop: '5px',
                    }}
                    flexDirection={'column'}
                    onClick={() => onUpdateMeeting(meeting)}
                    onMouseMove={handleMouseMove}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <Typography
                        variant="caption"
                        color={'black'}
                        fontSize={padLeft ? 16 : 12}
                        fontWeight={'bold'}
                        sx={{
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            width: '100%', // Ensure it takes up the full width of the container
                        }}
                    >
                        {meeting.name}
                    </Typography>
                    <Typography
                        variant="caption"
                        fontSize={padLeft ? 12 : 10}
                        sx={{
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            width: '100%', // Ensure it takes up the full width of the container
                        }}
                    >
                        By {meeting.organizer}
                    </Typography>
                </Box>
            </Tooltip>
        
    );
};

export default MeetingBox;
