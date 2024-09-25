
import { useTheme } from "@emotion/react";
import { useEffect, useState } from "react";
import { getAmPm, getHours, getMinutes, setTime } from "../../../../Utilites/Functions/CommonFunctions";
import { useAuth } from "../../../../Utilites/AuthContext";
import { openSnackbar } from "../../../../Utilites/SnackbarContext";
import {Grid, Stack, Typography, Button, FormControl, InputLabel, Select, MenuItem, Box, Chip, FormHelperText, OutlinedInput, TextField} from "@mui/material";
import { CheckPostMeeting, PostMeeting, UpdateAllMeetingsInRecurrence, UpdateAllNextMeetingsInRecurrence, UpdateMeeting, UpdateParentOnlyMeeting } from "../../../../Utilites/Functions/ApiFunctions/MeetingFunctions";
import ShortTextField from '../../../../Components/ShortTextField';
import ShortSelect from '../../../../Components/ShortSelect';
import ShortSelectObject from '../../../../Components/ShortSelectObject';
import TuneIcon from '@mui/icons-material/Tune';
import CheckIcon from '@mui/icons-material/Check';
import { GetUsers } from "../../../../Utilites/Functions/ApiFunctions";
import { DeleteSpecialPermission, GetSpecialPermissionsForMeeting, PostSpecialPermission } from "../../../../Utilites/Functions/ApiFunctions/SpecialPermissionFunctions";

const times = [
    '7:00am', '7:15am', '7:30am', '7:45am',
    '8:00am', '8:15am', '8:30am', '8:45am',
    '9:00am', '9:15am', '9:30am', '9:45am',
    '10:00am', '10:15am', '10:30am', '10:45am',
    '11:00am', '11:15am', '11:30am', '11:45am',
    '12:00pm', '12:15pm', '12:30pm', '12:45pm',
    '1:00pm', '1:15pm', '1:30pm', '1:45pm',
    '2:00pm', '2:15pm', '2:30pm', '2:45pm',
    '3:00pm', '3:15pm', '3:30pm', '3:45pm',
    '4:00pm', '4:15pm', '4:30pm', '4:45pm',
    '5:00pm'
];

const MeetingFourm = ({date, meeting, roomsRes, update, updateMeeting, meetingTypesRes, setUpdate, setOpen, setUpdateCount, updateMode}) => {
    const theme = useTheme();
    const {user} = useAuth();
    const [color, setColor] = useState(null);
    const [type, setType] = useState('');
    const [selectedRoom, setSelectedRoom] = useState('');
    const [description, setDescription] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [repeats, setRepeats] = useState('');
    const [users, setUsers] = useState([]);
    const [special, setSpecial] = useState([]);
    const [meetingName, setMeetingName] = useState(''); 
    const [showDesc, setShowDesc] = useState(false);

    useEffect(() => {
        const data = async () => {
            const usrs = await GetUsers();
            if(update){
                const selectedUserIds = await GetSpecialPermissionsForMeeting(updateMeeting.id);
                console.log(selectedUserIds)
                setSpecial(selectedUserIds);
            }
            setUsers(usrs);
        }
        data();
        if(!update){
            setStartTime('7:00am');
            setEndTime('7:15am');
            setType(meetingTypesRes?.find(tp => tp.value.toLowerCase() === "meeting"));
        }else{
            const meetingType = meetingTypesRes?.find(tp => tp.id == updateMeeting.type);
            const meetingRoom = roomsRes?.find(rm => rm.id == updateMeeting.room);
            setMeetingName(updateMeeting.name);
            setType(meetingType);
            setColor(meetingType?.color);
            setRepeats(updateMeeting.repeats);
            setSelectedRoom(meetingRoom);
            setStartTime(`${getHours(updateMeeting.start_time)}:${String(getMinutes(updateMeeting.start_time)).padStart(2, '0')}${getAmPm(updateMeeting.start_time)}`);
            setEndTime(`${getHours(updateMeeting.end_time)}:${String(getMinutes(updateMeeting.end_time)).padStart(2, '0')}${getAmPm(updateMeeting.end_time)}`);
            setDescription(updateMeeting.description);
            if(updateMeeting.description != '' && updateMeeting.description != null){
                setShowDesc(true);
            }
        }
    },[]);

    const onChangeMeetingType = (e) => {
        setColor((meetingTypesRes?.find(m => m.value == e.value)).color);
        setType(e);
    }

    const onChangeStartTime = (e) => {
        setStartTime(e);
    }

    const onChangeEndTime = (e) => {
        setEndTime(e);
    }

    const clearOnClose = () => {
        setStartTime('');
        setEndTime('');
        setSelectedRoom('');
        setType('');
        setMeetingName('');
        setType('');
        setColor('');
        setSelectedRoom('');
        setRepeats('');
        setDescription('');
        setUpdate(!update);
        setUpdateCount(prevValue => prevValue + 1);
        setOpen(false);
    }

    const clear = () => {
        setStartTime('');
        setEndTime('');
        setSelectedRoom('');
        setType('');
        setMeetingName('');
        setType('');
        setColor('');
        setSelectedRoom('');
        setRepeats('');
        setDescription('');
        setUpdateCount(prevValue => prevValue + 1);
        onClose();
        setOpen(false);
    }
    const isSelected = (id) => special.indexOf(id) !== -1;

    const onSubbmit = () => {
        if(update){
            const start = setTime(date, startTime);
            const end = setTime(date, endTime);
            if(start >= end){
                openSnackbar('End time cannot be less than or equal to the start time', {
                    severity: 'error',
                    autoHideDuration: 4000,
                    anchorOrigin: { vertical: 'top', horizontal: 'center' },
                    alertProps: { variant: 'filled' },
                    transition: 'grow', // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
                });
            }else if(!selectedRoom?.id){
                openSnackbar('No selected room', {
                    severity: 'error',
                    autoHideDuration: 4000,
                    anchorOrigin: { vertical: 'top', horizontal: 'center' },
                    alertProps: { variant: 'filled' },
                    transition: 'grow', // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
                });
            }else if(meetingName == ''){
                openSnackbar('No meeting name', {
                    severity: 'error',
                    autoHideDuration: 4000,
                    anchorOrigin: { vertical: 'top', horizontal: 'center' },
                    alertProps: { variant: 'filled' },
                    transition: 'grow', // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
                });
            }else{
                // console.log(`Original: Start: ${formatDate(updateMeeting.start_time)} End: ${formatDate(updateMeeting.end_time)}`);
                // Parse the start_time to a Date object
                let updatedStartTime = new Date(updateMeeting.start_time);
                let updatedEndTime = new Date(updateMeeting.end_time);

                // Update start time with the specified time
                updatedStartTime = setTime(updatedStartTime, startTime);
                updatedEndTime = setTime(updatedEndTime, endTime);

                // Update the meeting's start_time
                updateMeeting.start_time = updatedStartTime.toISOString();
                updateMeeting.end_time = updatedEndTime.toISOString();

                // Update all other values
                updateMeeting.room = selectedRoom.id;
                updateMeeting.type = type.id;
                updateMeeting.name = meetingName;
                updateMeeting.description = description ? description : '';
                updateMeeting.repeats = repeats ? repeats : '';

                
                switch(updateMode){
                    case 'next':
                        UpdateAllNextMeetingsInRecurrence(user?.id, updateMeeting).then((resp) => {
                            if(resp){
                                const promises = special?.map(async itm => isSelected(itm) ? 
                                    PostSpecialPermission({meeting_id: resp.id, user_id: itm, created_user_id: user?.id}) 
                                :
                                    DeleteSpecialPermission(itm)
                                );
                                Promise.all(promises).then( () => {
                                    clearOnClose();
                                });
                            }
                        }).catch(() => {
                            clearOnClose();
                        });
                        break;
                    case 'current':
                        console.log(updateMode);
                        CheckPostMeeting(user?.id,updateMeeting).then(resp => {
                            if(resp?.book){
                                UpdateParentOnlyMeeting(updateMeeting.id, updateMeeting).then((resp) => {
                                    if(resp){
                                        const promises = special?.map(async itm => isSelected(itm) ? 
                                            PostSpecialPermission({meeting_id: resp.id, user_id: itm, created_user_id: user?.id}) 
                                        :
                                            DeleteSpecialPermission(itm)
                                        );
                                        Promise.all(promises).then( () => {
                                            clearOnClose();
                                        });
                                    }
                                }).catch(() => {
                                    clearOnClose();
                                });
                            }

                        }).catch(() => {
                            clearOnClose();
                        });
                        break;
                    case 'all':
                        UpdateAllMeetingsInRecurrence(user?.id, updateMeeting).then((resp) => {
                            if(resp){
                                const promises = special?.map(async itm => isSelected(itm) ? 
                                    PostSpecialPermission({meeting_id: resp.id, user_id: itm, created_user_id: user?.id}) 
                                :
                                    DeleteSpecialPermission(itm)
                                );
                                Promise.all(promises).then( () => {
                                    clearOnClose();
                                });
                            }
                        }).catch(() => {
                            clearOnClose();
                        });
                        break;
                    default:
                        CheckPostMeeting(user?.id,updateMeeting).then(resp => {
                            if(resp?.book){
                                UpdateMeeting(user?.id, updateMeeting).then((resp) => {
                                    if(resp){
                                        const promises = special?.map(async itm => isSelected(itm) ? 
                                            PostSpecialPermission({meeting_id: resp.id, user_id: itm, created_user_id: user?.id}) 
                                        :
                                            DeleteSpecialPermission(itm)
                                        );
                                        Promise.all(promises).then( () => {
                                            clearOnClose();
                                        });
                                    }
                                }).catch(() => {
                                    clearOnClose();
                                });
                            }
                        }).catch(() => {
                            clearOnClose();
                        });
                        break;
                }
            }
        }else{
            const start = setTime(update ? date : meeting.date, startTime);
            const end = setTime(update ? date : meeting.date, endTime);
            if(start >= end){
                openSnackbar('End time cannot be less than or equal to the start time', {
                    severity: 'error',
                    autoHideDuration: 4000,
                    anchorOrigin: { vertical: 'top', horizontal: 'center' },
                    alertProps: { variant: 'filled' },
                    transition: 'grow', // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
                });
            }else if(!selectedRoom?.id){
                openSnackbar('No selected room', {
                    severity: 'error',
                    autoHideDuration: 4000,
                    anchorOrigin: { vertical: 'top', horizontal: 'center' },
                    alertProps: { variant: 'filled' },
                    transition: 'grow', // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
                });
            }else if(meetingName == ''){
                openSnackbar('No meeting name', {
                    severity: 'error',
                    autoHideDuration: 4000,
                    anchorOrigin: { vertical: 'top', horizontal: 'center' },
                    alertProps: { variant: 'filled' },
                    transition: 'grow', // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
                });
            }else{
                const newMeeting = {
                    name: meetingName,
                    username: user?.username,
                    organizer: `${user?.first_name} ${user?.last_name}`,
                    start_time: start.toISOString(),
                    end_time: end.toISOString(),
                    description: description,
                    room: selectedRoom.id,
                    location: selectedRoom.location,
                    type: type.id,
                    status: 'Approved',
                    retired: false,
                    created_user_id: user?.id,
                    repeats: repeats,
                }
                CheckPostMeeting(user?.id,newMeeting).then(resp => {
                    if(resp?.book){
                        PostMeeting(newMeeting).then((resp) => {
                            if(resp?.id){
                                const promises = special?.map(async itm => isSelected(itm) ? 
                                    PostSpecialPermission({meeting_id: resp.id, user_id: itm, created_user_id: user?.id}) 
                                :
                                    DeleteSpecialPermission(itm)
                                );
                                Promise.all(promises).then( () => {
                                    clear();
                                });
                            }
                        });
                    }
                });
            }
        }
    };

    const handleSpecialChange = (event) => {
        const {
            target: { value },
        } = event;
        setSpecial(
            // Ensure that value is always an array of IDs.
            typeof value === 'string' ? value.split(',') : value
        );
    };

    return(
        <Grid container sx={{width: showDesc ? '600px' : '350px', height: showDesc ? '467px' : '411px', transition: 'width 0.5s ease-in-out, height 0.5s ease-in-out', overflow:'hidden'}}>
            <Stack direction={'column'} sx={{width:'100%', height:'100%'}}>
                <Grid container direction={'column'} sx={{paddingTop:'20px', paddingLeft:'20px', paddingBottom:'20px', borderBottom:`4px solid ${color ? color : "#91E041"}`}}>
                    <Typography fontSize={28}>Book Room</Typography>
                    <Typography fontSize={16} color={theme.palette.secondary.light} marginTop={'-5px'} fontFamily={'comic sans ms'}>{update ? new Date(updateMeeting.start_time)?.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : meeting.date?.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Typography>
                </Grid>
                <Grid container>
                    <Stack direction={showDesc ? 'row' : 'column'} sx={{padding:'20px', width:'100%'}} spacing={2}>
                        <Box sx={{display:'flex', flexDirection:'column', gap:1, maxWidth: !showDesc ? '350px' : '600px', flexGrow:1}}>
                            <ShortTextField value={meetingName} label={"Meeting name"} variant={'outlined'} autoFocus={true} onChange={(e) => setMeetingName(e)}/>
                            <ShortSelectObject items={meetingTypesRes} label={'Meeting Type'} value={type} onChange={onChangeMeetingType}/>
                            <ShortSelectObject items={roomsRes} label={'Room'} value={selectedRoom} onChange={setSelectedRoom}/>
                            <Stack direction={'row'} sx={{width:'100%'}} spacing={1}>
                                <ShortSelect items={times} label={'Start Time'} value={startTime} onChange={onChangeStartTime}/>
                                <ShortSelect items={times} label={'End Time'} value={endTime} onChange={onChangeEndTime}/>
                            </Stack>
                            <Typography fontSize={14} color={theme.palette.secondary.light} 
                                sx={{':hover':{cursor:'pointer'}, width:'fit-content'}}
                                onClick={() => setShowDesc(!showDesc)}
                            >
                                Add details {showDesc ? '-' : '+'}
                            </Typography>
                        </Box>
                        {showDesc &&
                            <Box sx={{display: 'flex', flexGrow:1, flexDirection:'column', gap:1}}>
                                    <TextField
                                        id="outlined-multiline-static"
                                        label="Description"
                                        value={description}
                                        multiline
                                        rows={2}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                    <FormControl variant="outlined" sx={{minWidth: 160, width:'100%'}} size={'small'}>
                                        <InputLabel id="repeats-simple-select-standard-label">Repeats</InputLabel>
                                        <Select
                                            sx={{width:'100%'}}
                                            labelId="repeats-simple-select-standard-label"
                                            id="repeats-simple-select-standard"
                                            label='Repeats'
                                            value={repeats}
                                            onChange={(e) => setRepeats(e.target.value)}
                                        >
                                            <MenuItem key={0} value={''}>{'-- None --'}</MenuItem>
                                            <MenuItem key={1} value={'Daily'}>{'Daily'}</MenuItem>
                                            <MenuItem key={2} value={'Weekly'}>{'Weekly'}</MenuItem>
                                            <MenuItem key={3} value={'Monthly'}>{'Monthly'}</MenuItem>
                                            <MenuItem key={4} value={'Yearly'}>{'Yearly'}</MenuItem>
                                    </Select>
                                    </FormControl>
                                    <FormControl sx={{marginTop:'10px', width: "100%" }}>
                                            <InputLabel id="demo-multiple-chip-label-full">Special Permissions</InputLabel>
                                            <Select
                                                labelId="demo-multiple-chip-label-full"
                                                id="demo-multiple-chip-full"
                                                multiple 
                                                value={special}
                                                onChange={handleSpecialChange}
                                                input={<OutlinedInput id="select-multiple-chip-full" label="Special Permissions" />}
                                                renderValue={(selected) => (
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight:105, overflowY: 'auto', marginTop:'4px' }}>
                                                        {selected?.map((value) => 
                                                            {
                                                                const user = users?.find(gp => gp.id === value);
                                                                return <Chip key={value} label={`${user?.first_name} ${user?.last_name}`} sx={{maxHeight:25}}/>;
                                                            }
                                                        )}
                                                    </Box>
                                                )}
                                                sx={{
                                                    minHeight: 80, // Maximum height for the Select component
                                                    maxWidth:365,
                                                    height:110
                                                }}
                                            >
                                                {users.filter(gp => gp.access != 'Read' && gp.id !== user?.id)?.map((user, index) => (
                                                    <MenuItem
                                                        key={index}
                                                        value={user?.id}
                                                        sx={{fontWeight: special.indexOf(user?.id)?.admin ? theme.typography.fontWeightRegular : theme.typography.fontWeightMedium}}
                                                    >
                                                        {`${user?.first_name} ${user?.last_name}`}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            <FormHelperText sx={{ whiteSpace: 'nowrap' }}>Allow users to see meeting</FormHelperText>
                                        </FormControl>
                            </Box>
                        }
                    </Stack>
                    <Box sx={{display:'flex', flexDirection:'row', gap:1, flexGrow:1, padding:'4px', background:theme.palette.background.fill.light.dark}}>
                        <Button 
                            variant={'contained'} 
                            sx={{
                                width:'100%', 
                                color:'black', 
                                background:'#f7c6a1', 
                                ':hover':{background:'#edae7e'},
                                fontWeight:'bold'
                            }} 
                            startIcon={<TuneIcon/>}
                        >
                            Advanced
                        </Button>
                        <Button 
                            variant={'contained'} 
                            sx={{
                                width:'100%', 
                                color:'black', 
                                background:'#a1f0a3', 
                                ':hover':{background:'#58b85b'},
                                fontWeight:'bold'
                            }}
                            onClick={onSubbmit}
                            startIcon={<CheckIcon/>}
                        >
                            {update ? 'Update' : 'Book'}
                        </Button>
                    </Box>
                </Grid>
            </Stack>
        </Grid>
    );
}

export default MeetingFourm;