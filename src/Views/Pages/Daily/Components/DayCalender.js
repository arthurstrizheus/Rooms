import { useTheme } from "@emotion/react";
import useSyncScrollVertical from '../../../../Utilites/Hooks/useSyncScrollVertical';
import React, { useEffect, useMemo, useState } from "react";
import MeetingBox from './MeetingBox';
import {Grid, Stack, Box} from "@mui/material";
import HoursBar from './HoursBar';
import DisplayMeeting from '../../../Components/DisplayMeeting/DisplayMeeting';
import MeetingFourm from "./MeetingForum";
import MinuteBox from './MinuteBox';
import { GetBlockedDatess, GetMeetingsByUserId, GetTypes } from "../../../../Utilites/Functions/ApiFunctions";
import { useAuth } from "../../../../Utilites/AuthContext";

const DayCalender = ({Cref, hoursScrollRef, Cref2, scrollBarRef, roomsRes, selectedDate, locations, setUpdate, update}) => {
    const {user} = useAuth();
    const [openMeetingDialog, setOpenMeetingDialog] = useState(false);
    const [displayMeeting, setDisplayMeeting] = useState(false);
    const [updateMeeting, setUpdateMeeting] = useState(false);
    const [meetings, setMeetings] = useState([]);
    const [blockedDates, setBlockedDates] = useState([]);
    const [meetingTypes, setMeetingTypes] = useState([]);
    const [filteredMeetings, setFilteredMeetings] = useState([]);
    const [updateMeetings, setUpdateMeetings] = useState(false);
    const [meeting, setMeeting] = useState();
    const [selectedMeeting, setSelectedMeeting] = useState({min:0, hour:0, room:0, am:true});
    const [updateMode, setUpdateMode] = useState(null)
    const hours = useMemo(() => [
        { hour: 7, am: true }, { hour: 8, am: true }, { hour: 9, am: true }, { hour: 10, am: true },
        { hour: 11, am: true }, { hour: 12, am: false }, { hour: 1, am: false },
        { hour: 2, am: false }, { hour: 3, am: false }, { hour: 4, am: false }, { hour: 5, am: false }
    ], []);
    const theme = useTheme();

    useEffect(() => {
        if(meetings?.length){
            const filteredMeetings = meetings.filter(mt => {
                const meetingDate = new Date(mt.start_time);
                return meetingDate.getDate() === selectedDate.getDate() && meetingDate.getFullYear() === selectedDate.getFullYear() && meetingDate.getMonth() == selectedDate.getMonth();
            });
            setFilteredMeetings(filteredMeetings);
        }else{
            setFilteredMeetings([]);
        }
        if(blockedDates?.length){
            const dates = blockedDates?.filter(mt => {
                const meetingDate = new Date(mt.start_time).toISOString().split('T')[0];
                const selectedDateString = selectedDate.toISOString().split('T')[0];
                return meetingDate === selectedDateString;
            });
            setFilteredMeetings(prev => [...prev, ...dates]);
        }
    }, [selectedDate, meetings, blockedDates, update]);

    const handleOpenMeetingDialog = (min, hour, room, am) => {
        setSelectedMeeting({min:min, hour:hour, room: room, am:am});
        setOpenMeetingDialog(!openMeetingDialog);
    }

    const memoizedCreateMinutes = useMemo(
        () => (hour, room, am) => {
            const minutes = [0, 15, 30, 45];
            return minutes?.map((min) => (
                <MinuteBox key={`${hour}-${min}`} theme={theme} min={min} hour={hour} room={room} am={am} onClick={handleOpenMeetingDialog} />
            ));
        },
        [theme] // Dependencies: theme changes will trigger recalculation
    );

    useSyncScrollVertical(Cref, hoursScrollRef);
    useSyncScrollVertical(hoursScrollRef, Cref);

    useEffect(() => {
        const syncHorizontalScroll = (event) => {
            if (event.shiftKey) {
                event.preventDefault();
            }
            // if (event.shiftKey) {
            //     event.preventDefault();
            //     const scrollAmount = event.deltaY * .2;
            //     hoursScrollRef.current.scrollLeft += scrollAmount;
            //     Cref.current.scrollLeft += scrollAmount;
            //     Cref2.current.forEach(ref => {
            //         if (ref) {
            //             ref.scrollLeft += scrollAmount;
            //         }
            //     });
            //     scrollBarRef.current.scrollLeft += scrollAmount;
            // }
        };

        const preventDefaultScroll = (event) => {
            if (event.shiftKey) {
                event.preventDefault();
            }
        };

        const elements = [Cref.current, hoursScrollRef.current, ...Cref2.current];

        elements.forEach((element) => {
            element.addEventListener('wheel', syncHorizontalScroll);
            element.addEventListener('scroll', preventDefaultScroll);
        });

        return () => {
            elements.forEach((element) => {
                element.removeEventListener('wheel', syncHorizontalScroll);
                element.removeEventListener('scroll', preventDefaultScroll);
            });
        };
    }, [Cref, hoursScrollRef, Cref2, scrollBarRef]);

    const handleUpdateMeeting = (meeting) => {
        // Update the meeting time in your state or database
        setMeeting(meeting);
        setUpdateMeeting(true);
        setDisplayMeeting(true);
    };

    const handleDialogClose = () => {
        setMeeting(null);
        setUpdateMeeting(false);
        setDisplayMeeting(false);
    }
    const handleCloseForm = () => {
        setMeeting(null);
        setUpdateMeeting(false);
        setOpenMeetingDialog(false);
    }

    // Example user groups
    const getMeeting = (room) => {
        
        let roomMeetings = filteredMeetings?.filter(meet => meet?.room == room || meet?.room_id == room);
        if(roomMeetings?.length == 0){
            return <Box wdith={'100%'}/>;
        }
        
        return(roomMeetings?.map(meeting => 
            <MeetingBox
                key={meeting.id}
                meeting={meeting}
                onUpdateMeeting={() => handleUpdateMeeting(meeting)}
                rooms={roomsRes}
                updateMeetings={updateMeetings}
                meetingTypesRes={meetingTypes}
                update={update}
            />
        ));
    }

    useEffect(() => {
        const data = async () => {
            if(user?.id){
                const meetings = await GetMeetingsByUserId(user?.id, {date: selectedDate, range:'Day'});
                const blocked = await GetBlockedDatess();
                const meetingTypes = await GetTypes();
    
                setBlockedDates(blocked);
                setMeetings(meetings);
                setMeetingTypes(meetingTypes);
            };
            }
        data();
    },[update, selectedDate]);

    return (
        <React.Fragment>
            <DisplayMeeting
                open={displayMeeting}
                setOpen={setDisplayMeeting}
                handleExit={handleDialogClose}
                meeting={meeting}
                setEditOpen={setOpenMeetingDialog}
                types={meetingTypes}
                rooms={roomsRes}
                locations={locations}
                setUpdate={setUpdate}
                setUpdateMode={setUpdateMode}
            />
            <MeetingFourm 
                open={openMeetingDialog}
                onClose={handleCloseForm}
                meeting={selectedMeeting} 
                roomsRes={roomsRes} 
                update={updateMeeting} 
                updateMeeting={meeting} 
                meetingTypesRes={meetingTypes}
                setUpdateMeetings={setUpdateMeetings}
                updateMeetings={updateMeetings}
                setOpen={setOpenMeetingDialog}
                date={selectedDate}
                setUpdate={setUpdate}
                updateMode={updateMode}
            />
            <Grid width={'100%'} height={'calc(100vh - 155px)'} sx={{ overflowX: 'hidden', position:'relative' }}>
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'row', position: 'relative', overflowX: 'hidden' }}>
                    <Stack direction={'column'} width={'100%'} sx={{ overflowY: "hidden", msOverflowStyle: "none", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                        <Grid item sx={{ width: '100%', borderBottom: `1px solid ${theme.palette.border.secondary}`, background: theme.palette.background.fill.light.light }}>
                            <Box ref={hoursScrollRef} sx={{
                                display: 'flex', justifyContent: 'left', alignItems: 'left', position: 'sticky', top: 0, height: '71px',
                                flexGrow: 1, overflowX: "auto", msOverflowStyle: "none", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" }
                            }}>
                                <HoursBar hours={hours}/>
                            </Box>
                        </Grid>
                        <Box ref={Cref} sx={{
                            display: 'flex', flexGrow: 1, overflowX: "auto", msOverflowStyle: "none", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                            <Stack height={'100%'} width={'100%'} direction={'column'} position="relative">
                                {roomsRes?.map((room, index) => (
                                    <Grid key={room.id} className={'RoomCal'} item sx={{ width: '100%', height: '75px', borderBottom: `1px solid ${theme.palette.border.main}` }}>
                                        <Box ref={el => Cref2.current[index] = el} sx={{ display: 'flex', flexGrow:1, maxWidth:'1760px', overflowX: "auto", msOverflowStyle: "none", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                                            <Stack direction={'row'} height={'100%'}>
                                                {hours?.map((hour, index) => (
                                                    <Grid key={index} className="Hour" item
                                                        sx={{ width: '160px', height: '100%', borderLeft: `2px solid ${theme.palette.border.main}`,
                                                            cursor: 'pointer'
                                                        }}>
                                                        <Stack direction={'row'} justifyContent={'space-between'} >
                                                            {memoizedCreateMinutes(hour.hour, room, hour.am)}
                                                        </Stack>
                                                    </Grid>
                                                ))}
                                            </Stack>
                                            <Box sx={{width:'100%', display: 'grid', gridAutoFlow: 'column', marginTop: '-2px', position:'relative'}}>
                                                {getMeeting(room.id)}
                                            </Box>
                                        </Box>
                                    </Grid>
                                ))}
                            </Stack>
                        </Box>
                    </Stack>
                </Box>
            </Grid>
        </React.Fragment>
    );
};

export default DayCalender;
