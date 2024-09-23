import React, { useEffect, useState } from "react";
import { addDays } from 'date-fns';
import {Grid, Stack, Box, IconButton} from "@mui/material";
import AddIcon from '@mui/icons-material/AddOutlined';
import MeetingComponent from './MeetingComponent';

const DayBox = React.memo(({ theme, onClick, room, selectedDate, meetings, dayIndex, meetingTypes, startEnd, updateCount }) => {
    const [boxMeetings1, setBoxMeetings1] = useState([]);
    const [boxMeetings2, setBoxMeetings2] = useState([]);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const items = meetings.filter(
            (mt) => mt.room === room.id &&
                new Date(mt.start_time).getDate() === addDays(startEnd.start, dayIndex).getDate() && 
                new Date(mt.start_time).getMonth() === addDays(startEnd.start, dayIndex).getMonth() &&
                new Date(mt.start_time).getFullYear() === addDays(startEnd.start, dayIndex).getFullYear()
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
            minHeight={new Date().getDate() === addDays(startEnd.start, dayIndex).getDate() ? "75px" : '76px'}
            height={'75px'}
            width={"100%"}
            sx={{
                minWidth: '160px',
                borderLeft: `2px solid ${theme.palette.border.main}`,
                background: new Date().getDate() === addDays(startEnd.start, dayIndex).getDate() && 
                            new Date().getMonth() === addDays(startEnd.start, dayIndex).getMonth() && 
                            new Date().getFullYear() === addDays(startEnd.start, dayIndex).getFullYear() ? "#fbfcdc" : '',
                borderBottom: new Date().getDate() === addDays(startEnd.start, dayIndex).getDate() ? `1px solid ${theme.palette.border.main}` : '',
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
                            room={room}
                            day={addDays(startEnd.start, dayIndex).getDate()}
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
                                room={room}
                                day={addDays(startEnd.start, dayIndex).getDate()}
                            />
                        )}
                    </Stack>
                )}
            </Box>
            {isHovered && (
                <IconButton
                    onClick={() => onClick({ room: room, date: addDays(startEnd.start, dayIndex) }, false)}
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
