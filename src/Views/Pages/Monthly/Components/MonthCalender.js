import { useTheme } from "@emotion/react";
import React, { useEffect, useMemo, useState } from "react";
import { startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, eachWeekOfInterval } from 'date-fns';
import {Grid, Stack, Dialog, Box} from "@mui/material";
import DisplayMeeting from '../../../Components/DisplayMeeting/DisplayMeeting';
import MeetingFourm from './MeetingForum';
import DaysBar from './DaysBar';
import DayBox from './DayBox';

const MonthCalender = ({ roomsRes, selectedDate, locations, meetings, meetingTypes, setUpdate, update }) => {
    const [openMeetingDialog, setOpenMeetingDialog] = useState(false);
    const [updateMeeting, setUpdateMeeting] = useState(false);
    const [displayMeeting, setDisplayMeeting] = useState(false);
    const [filteredMeetings, setFilteredMeetings] = useState([]);
    const [weekDays, setWeekDays] = useState([]);
    const [startEnd, setStartEnd] = useState({start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end:endOfWeek(selectedDate, { weekStartsOn: 1 })});
    const [meeting, setMeeting] = useState();
    const [selectedMeeting, setSelectedMeeting] = useState({room:'', selectedDate:'', meetings:'', dayIndex:'', days:''});
    const [weeksOfMonth, setWeeksOfMonth] = useState([]);
    const [updateMode, setUpdateMode] = useState(null)
    const theme = useTheme();

    useEffect(() => {
        // Generate an array of dates from start to end
        let start = startOfWeek(selectedDate, { weekStartsOn: 1 });
        let end = endOfWeek(selectedDate, { weekStartsOn: 1 });
        setStartEnd({start: start, end: end});
        // console.log('start', start);
        // console.log('end', end);
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
        setWeeksOfMonth(
            eachWeekOfInterval({
                start: startOfMonth(selectedDate),
                end: endOfMonth(selectedDate)
            }, { weekStartsOn: 1 })
        );
    }, [selectedDate, meetings]);

    const handleOpenMeetingDialog = (meeting, update) => {
        setUpdateMeeting(update);
        if(update){
            setMeeting(meeting);
            setDisplayMeeting(true);
        }else{
            setSelectedMeeting(meeting);
            setOpenMeetingDialog(true);
        }
    }

    const memoizedCreateDays = useMemo(
        () => (meetings, index, weekIndex, day) => {
            return(
                <DayBox 
                    key={index} 
                    theme={theme} 
                    selectedDate={selectedDate} 
                    meetings={meetings} 
                    onClick={handleOpenMeetingDialog}
                    day={day}
                    dayIndex={index}
                    meetingTypes={meetingTypes}
                    startEnd={startEnd}
                    updateCount={update}
                    weekIndex={weekIndex}
                />
            );
        },
        [theme, meetings, meetingTypes, selectedDate, update] // Dependencies: theme changes will trigger recalculation
    );

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
                        meetingTypesRes={meetingTypes}
                        setUpdate={setUpdateMeeting}
                        setOpen={setOpenMeetingDialog}
                        setUpdateCount={setUpdate}
                        date={selectedDate}
                        updateMode={updateMode}
                        onClose={handleCloseForm}
                    />
            </Dialog>
            <Grid width={'100%'} height={'calc(100vh - 166px)'} sx={{ overflowX: 'hidden' }}>
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'row', position: 'relative', overflowX: 'hidden' }}>
                    <Stack direction={'column'} width={'100%'} sx={{ overflowY: "hidden", msOverflowStyle: "none", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                        <Grid item sx={{ width: '100%', borderBottom: `1px solid ${theme.palette.border.secondary}`, background: theme.palette.background.fill.light.light }}>
                            <Box sx={{
                                display: 'flex', justifyContent: 'left', alignItems: 'left', position: 'sticky', top: 0, height: '71px',
                                flexGrow: 1, overflowX: "auto", msOverflowStyle: "none", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" }
                            }}>
                                <DaysBar days={weekDays}/>
                            </Box>
                        </Grid>
                        <Box sx={{
                            display: 'flex', flexGrow: 1, overflow: "auto", msOverflowStyle: "none", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                            <Stack width={'100%'} direction={'column'} position="relative">
                            {weeksOfMonth?.map((weekStart, weekIndex) => {
                                const daysInWeek = eachDayOfInterval({
                                    start: startOfWeek(weekStart, { weekStartsOn: 1 }),
                                    end: endOfWeek(weekStart, { weekStartsOn: 1 })
                                });

                                return (
                                    <Grid key={weekIndex} className={'RoomCal'} item sx={{ width: '100%', height: '100%', borderBottom: `1px solid ${theme.palette.border.main}` }}>
                                        <Box width={'100%'}>
                                            <Stack direction={'row'} width={'100%'} height={`calc(calc(100vh - 243px) / ${weeksOfMonth.length})`}>
                                                {daysInWeek?.map((day, dayIndex) => (
                                                    memoizedCreateDays(filteredMeetings, dayIndex, weekIndex, day)
                                                ))}
                                            </Stack>
                                        </Box>
                                    </Grid>
                                );
                            })}
                        </Stack>
                        </Box>
                    </Stack>
                </Box>
            </Grid>
        </React.Fragment>
    );
};

export default MonthCalender;
