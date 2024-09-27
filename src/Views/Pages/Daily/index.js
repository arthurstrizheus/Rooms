import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@emotion/react';
import { useAuth } from '../../../Utilites/AuthContext';
import useSyncScrollVertical from '../../../Utilites/Hooks/useSyncScrollVertical';
import {Grid, Stack, Box, Typography} from "@mui/material";
import DragIndicatorOutlinedIcon from '@mui/icons-material/DragIndicatorOutlined';
import DayCalender from './Components/DayCalender';
import Footer from './Components/Footer';
import {GetLocations, GetRooms,} from '../../../Utilites/Functions/ApiFunctions';

const createMeetingRooms = (rooms, theme) => {
    return rooms?.map(room => (
        <Grid title={'room'} key={room.id} item sx={{ width: '100%', height: '75px', padding: '10px', background: theme.palette.background.fill.light.light, borderBottom: `1px solid ${theme.palette.border.main}`, borderLeft: `3px solid ${room.color}` }}>
            <Stack>
                <Typography variant="h7" fontFamily={'Candara'} fontWeight={'bold'} fontSize={17}>{room.value}</Typography>
                <Typography variant="caption" fontFamily={'monospace'}>Capacity: {room.capacity}</Typography>
            </Stack>
        </Grid>
    ));
};

const DaySchedulePage = ({ setLoading, selectedDate, setSelectedDate }) => {
    const [roomsObj, setRoomsObj] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [roomsWidth, setRoomsWidth] = useState(320);
    const [isDragging, setIsDragging] = useState(false);
    const [locations, setLocations] = useState([]);
    const [update, setUpdate] = useState(0);
    const [startX, setStartX] = useState(0);
    const theme = useTheme();
    const {user} = useAuth();
    const roomListRef = useRef(null);
    const calenderListRef = useRef(null);
    const calenderListRef2 = useRef([]);
    const hoursScrollRef = useRef(null);
    const scrollBarRef = useRef(null);

    useSyncScrollVertical(roomListRef, calenderListRef);
    useSyncScrollVertical(calenderListRef, roomListRef);
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.clientX);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const newWidth = roomsWidth + (e.clientX - startX);
        setRoomsWidth(newWidth > 200 ? newWidth > 500 ? 500 : newWidth : 200);
        setStartX(e.clientX);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if(user?.id){
            const data = async () => {
                setLoading(true);
                const lcs = await GetLocations();
                const rms = await GetRooms(user?.id);
                setLocations(lcs);
                setRooms(rms);
                setLoading(false);
            };
            data();
        }
    },[update, user]);

    useEffect(() => {
        setRoomsObj(createMeetingRooms(rooms, theme));
    }, [theme, rooms]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <Grid height={'100%'} width={'100%'} overflow={'hidden'}>
            <Stack direction={'column'} height="100%" >
                <Stack direction="row" height="calc(100vh - 155px)" width={'calc(100vw - 220px)'}>
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'row', position: 'relative' }}>
                        <Stack direction={'column'}>
                            <Grid item sx={{ width: '100%', height: '75px', padding: '10px', background: theme.palette.background.fill.light.lightHover, borderBottom: `1px solid ${theme.palette.border.secondary}` }}>
                                <Stack>
                                    <Typography variant="h7" color={theme.palette.secondary.light} fontFamily="Candara" fontWeight="bold" fontSize={19}>
                                        SEA {locations?.find(lc => lc.officeid === user?.location)?.Alias}
                                    </Typography>
                                    <Typography variant="body2">{rooms.length} Rooms</Typography>
                                </Stack>
                            </Grid>
                            <Box ref={roomListRef} sx={{ flexGrow: 1, width:`${roomsWidth}px`, background: theme.palette.background.fill.light.lightHover, height: 'calc(100vh - 185px)', overflowY: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                                {roomsObj?.map((room) => room)}
                            </Box>
                        </Stack>
                        <Box
                            sx={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: '15px',
                                height: '100%',
                                background: 'transparent',
                                transition: 'background 0.3s ease, border-left 0.2s ease',
                                ':hover': {
                                    background: theme.palette.background.fill.light.light,
                                    borderLeft: `1px solid ${theme.palette.border.main}`,
                                    cursor: 'e-resize',
                                    '& .icon': {
                                        opacity: 1,
                                    },
                                },
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            onMouseDown={handleMouseDown}
                        >
                            <DragIndicatorOutlinedIcon
                                className="icon"
                                sx={{
                                    opacity: 0,
                                    transition: 'opacity 0.3s ease',
                                }}
                            />
                        </Box>
                    </Box>
                    <DayCalender 
                        rooms={roomsObj}
                        roomsRes={rooms}
                        Cref={calenderListRef}
                        scrollBarRef={scrollBarRef}
                        roomListRef={roomListRef}
                        hoursScrollRef={hoursScrollRef}
                        Cref2={calenderListRef2}
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        locations={locations}
                        setUpdate={setUpdate}
                        update={update}
                    />
                </Stack>
                <Footer hoursScrollRef={hoursScrollRef} Cref={calenderListRef}  Cref2={calenderListRef2} scrollBarRef={scrollBarRef} roomsWidth={roomsWidth}/>
            </Stack>
        </Grid>
    );
};

export default DaySchedulePage;
