import React, { useEffect, useState } from "react";
import { addDays } from 'date-fns';
import {Grid, Stack, Typography, Box, IconButton} from "@mui/material";
import MeetingComponent from './MeetingComponent';
import AddIcon from '@mui/icons-material/Add';

const DayBox = React.memo(({ theme, onClick, selectedDate, meetings, dayIndex, weekIndex, meetingTypes, startEnd, updateCount, day }) => {
    const [boxMeetings1, setBoxMeetings1] = useState([]);
    const [boxMeetings2, setBoxMeetings2] = useState([]);
    const [isHovered, setIsHovered] = useState(false);
    

    useEffect(() => {
        // Filter meetings for the specific day
        const items = meetings.filter(
            (mt) => 
                new Date(mt.start_time).getDate() === new Date(day).getDate() &&
                new Date(mt.start_time).getMonth() === new Date(day).getMonth() &&
                new Date(mt.start_time).getFullYear() === new Date(day).getFullYear()
        );
    
        // Sort meetings chronologically by start_time
        const sortedItems = items.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    
        // Split the sorted meetings into two groups if necessary
        if (sortedItems.length > 4) {
            const middleIndex = Math.ceil(sortedItems.length / 2);
            setBoxMeetings1(sortedItems.slice(0, middleIndex));
            setBoxMeetings2(sortedItems.slice(middleIndex));
        } else {
            setBoxMeetings1(sortedItems);
            setBoxMeetings2([]);
        }
    }, [meetings, selectedDate, updateCount]);
    
    return (
        <Grid
            borderRight={`1px solid rgb(220, 220, 220)`}
            height={'100%'}
            width={"100%"}
            sx={{
                minWidth: '160px',
                borderLeft: `2px solid ${theme.palette.border.main}`,
                background: new Date().getDate() === new Date(day).getDate() && new Date().getMonth() === new Date(day).getMonth() && new Date().getFullYear() === new Date(day).getFullYear() ? "#fbfcdc" : new Date(day).getMonth() === selectedDate.getMonth() ? '' : 'rgba(0, 0, 0, .1)',
                position: 'relative', // Ensure relative positioning for the "+" button
                overflow: 'hidden', // Hide any overflow content
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Box sx={{ display: 'flex', overflow: 'hidden', height: '100%' }}>
                <Stack direction={'column'} spacing={'1px'} sx={{ flex: 1, width:'50%' }}>
                    {boxMeetings1.map((mt, index) =>
                        <MeetingComponent
                            key={index}
                            types={meetingTypes}
                            meeting={mt}
                            onClick={onClick}
                            day={new Date(day)}
                        />
                    )}
                </Stack>
                {boxMeetings2.length > 0 && (
                    <Stack direction={'column'} spacing={'1px'} sx={{ flex: 1, width:'50%' }}>
                        {boxMeetings2.map((mt, index) =>
                            <MeetingComponent
                                key={index}
                                types={meetingTypes}
                                meeting={mt}
                                onClick={onClick}
                                day={new Date(day)}
                            />
                        )}
                    </Stack>
                )}
                <Stack sx={{position:'relative', bottom:0}}>
                    <Typography>{new Date(day).getDate()}</Typography>
                </Stack>
            </Box>
            {isHovered && (
                <IconButton
                    onClick={() => onClick({ date: new Date(day) }, false)}
                    sx={{
                        position: 'absolute',
                        bottom: '-5px',
                        right: '-7px',
                        backgroundColor: 'red',
                        color: 'white',
                        '&:hover': {
                            backgroundColor: 'darkred'
                        },
                        transform: 'scale(.6)',
                        zIndex: 1, // Ensure the button is above other elements
                    }}
                >
                    <AddIcon transform={'scale(1.4)'} />
                </IconButton>
            )}
        </Grid>
    );
});

export default DayBox;
