import { useTheme } from "@emotion/react";
import React, { useEffect, useState, useMemo } from 'react';
import useSyncScrollVertical from '../../../../Utilites/Hooks/useSyncScrollVertical';
import { startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import {Grid, Stack, Dialog, Box} from "@mui/material";
import DisplayMeeting from '../../../Components/DisplayMeeting/DisplayMeeting';
import MeetingFourm from './MeetingForum';
import DaysBar from './DaysBar';
import DayBox from './DayBox';

const WeekCalender = ({ Cref, hoursScrollRef, Cref2, roomsRes, selectedDate, locations, setUpdate, meetingTypes, meetings }) => {
    const [openMeetingDialog, setOpenMeetingDialog] = useState(false);
    const [updateMeeting, setUpdateMeeting] = useState(false);
    const [displayMeeting, setDisplayMeeting] = useState(false);
    const [filteredMeetings, setFilteredMeetings] = useState([]);
    const [weekDays, setWeekDays] = useState([]);
    const [startEnd, setStartEnd] = useState({start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end:endOfWeek(selectedDate, { weekStartsOn: 1 })});
    const [meeting, setMeeting] = useState();
    const [selectedMeeting, setSelectedMeeting] = useState({room:'', selectedDate:'', meetings:'', dayIndex:'', days:''});
    const days = ["Monday", "Tuesday", "Wendnesday", "Thursday", "Firday", "Saturday", "Sunday"];
    const [updateMode, setUpdateMode] = useState(null)
    const theme = useTheme();

    useEffect(() => {
        // Generate an array of dates from start to end
        let start = startOfWeek(selectedDate, { weekStartsOn: 1 });
        let end = endOfWeek(selectedDate, { weekStartsOn: 1 });
        setStartEnd({start: start, end: end});

        setWeekDays(eachDayOfInterval({ start , end}));
        const filteredMeetings = meetings.filter(mt => {
            const meetingDate = new Date(mt.start_time);
            if( (meetingDate.getDate() >= startEnd.start.getDate() || meetingDate.getDate() <= startEnd.end.getDate()) || 
                (meetingDate.getMonth() >= startEnd.start.getMonth() || meetingDate.getMonth() <= startEnd.end.getMonth()) ||
                (meetingDate.getFullYear() >= startEnd.start.getFullYear() || meetingDate.getFullYear() <= startEnd.end.getFullYear())
            ){
                return true;
            }else{
                return false;
            }
        });
        setFilteredMeetings(filteredMeetings);
    }, [selectedDate, meetings]);

    const handleOpenMeetingDialog = (meeting, update) => {
        setUpdateMeeting(update);
        if(update){
            setMeeting(meeting);
            setDisplayMeeting(true);
        }else{
            setSelectedMeeting(meeting);
            setOpenMeetingDialog(!openMeetingDialog);
        }
    }

    const memoizedCreateDays = useMemo(
        () => (room, filteredMeetings, index) => {
            return(
                <DayBox 
                    key={index} 
                    theme={theme} 
                    selectedDate={selectedDate} 
                    meetings={filteredMeetings} 
                    room={room} 
                    onClick={handleOpenMeetingDialog} 
                    dayIndex={index}
                    meetingTypes={meetingTypes}
                    startEnd={startEnd}
                    updateCount={setUpdate}
                />
            );
        },
        [theme, filteredMeetings, meetingTypes, selectedDate, setUpdate] // Dependencies: theme changes will trigger recalculation
    );

    useSyncScrollVertical(Cref, hoursScrollRef);
    useSyncScrollVertical(hoursScrollRef, Cref);

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

    return (
        <React.Fragment>
            <DisplayMeeting
                setUpdate={setUpdate}
                open={displayMeeting}
                setOpen={setDisplayMeeting}
                handleExit={handleDialogClose}
                meeting={meeting}
                setEditOpen={setOpenMeetingDialog}
                types={meetingTypes}
                rooms={roomsRes}
                locations={locations}
                setUpdateMode={setUpdateMode}
            />
            <Dialog
                open={openMeetingDialog}
                onClose={handleCloseForm}
                PaperProps={{
                    style: {
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    },
                }}
                >
                    <MeetingFourm 
                        meeting={selectedMeeting} 
                        roomsRes={roomsRes} 
                        update={updateMeeting} 
                        updateMeeting={meeting} 
                        meetings={filteredMeetings} 
                        setMeetings={setFilteredMeetings} 
                        meetingTypesRes={meetingTypes}
                        setUpdateMeeting={setUpdateMeeting}
                        setOpen={setOpenMeetingDialog}
                        setUpdateCount={setUpdate}
                        date={selectedDate}
                        updateMode={updateMode}
                    />
            </Dialog>
            <Grid width={'100%'} height={'calc(100vh - 166px)'} sx={{ overflowX: 'hidden' }}>
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'row', position: 'relative', overflowX: 'hidden' }}>
                    <Stack direction={'column'} width={'100%'} sx={{ overflowY: "hidden", msOverflowStyle: "none", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                        <Grid item sx={{ width: '100%', borderBottom: `1px solid ${theme.palette.border.secondary}`, background: theme.palette.background.fill.light.light }}>
                            <Box ref={hoursScrollRef} sx={{
                                display: 'flex', justifyContent: 'left', alignItems: 'left', position: 'sticky', top: 0, height: '71px',
                                flexGrow: 1, overflowX: "auto", msOverflowStyle: "none", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" }
                            }}>
                                <DaysBar days={weekDays}/>
                            </Box>
                        </Grid>
                        <Box ref={Cref} sx={{
                            display: 'flex', flexGrow: 1, overflow: "auto", msOverflowStyle: "none", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                            <Stack width={'100%'} direction={'column'} position="relative">
                                {roomsRes?.map((room, index) => (
                                    <Grid key={room.id} className={'RoomCal'} item sx={{ width: '100%', height: '75px', borderBottom: `1px solid ${theme.palette.border.main}` }}>
                                        <Box ref={el => Cref2.current[index] = el} width={'100%'} >
                                            <Stack direction={'row'}  width={'100%'} height={'100%'}>
                                                {days?.map((day, index) => (
                                                    memoizedCreateDays(room, filteredMeetings, index)
                                                ))}
                                            </Stack>
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

export default WeekCalender;
