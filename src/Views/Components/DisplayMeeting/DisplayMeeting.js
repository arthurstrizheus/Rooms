import { useTheme } from "@emotion/react";
import { getAmPm } from "../../../Utilites/Functions/CommonFunctions";
import { Grid, Stack, Typography, Button, Dialog, Divider, Tooltip } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useAuth } from "../../../Utilites/AuthContext";
import { CancelAllMeetingsInRecurrence, CancelFollowingMeetingsInRecurrence, UpdateMeetingStatus } from "../../../Utilites/Functions/ApiFunctions/MeetingFunctions";
import { IsMeetingParentRecurrence } from "../../../Utilites/Functions/ApiFunctions/MeetingRecurrencesFunctions";
import { useState } from "react";
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import RemoveRoadIcon from '@mui/icons-material/RemoveRoad';
import EditNoteIcon from '@mui/icons-material/EditNote';
import EditRoadIcon from '@mui/icons-material/EditRoad';

const DisplayMeeting = ({open, setOpen, meeting, setEditOpen, types, rooms, locations, handleExit, setUpdate, setUpdateMode}) => {
    const theme = useTheme();
    const {user} = useAuth();
    const [showWarning, setShowWarning] = useState(false);
    const [showParentWarning, setShowParentWarning] = useState(false);

    if(!meeting){return(<Dialog open={open} onClose={handleExit} ></Dialog>);}
    const start = new Date(meeting?.start_time);
    const end = new Date(meeting?.end_time);
    const color = types?.find(tp => tp?.id == meeting?.type)?.color;
    const type = types?.find(tp => tp?.id == meeting?.type)?.value;
    const room = rooms?.find(rm => rm?.id == meeting?.room)?.value;
    const location = locations?.find(lc => lc?.officeid == meeting?.location)?.Alias;
    

    const handleEdit = () => {
        if(meeting.recurrence_id){
            setShowParentWarning(true);
        }else{
            setUpdateMode(null)
            setEditOpen(true);
            setOpen(false);
        }
    };

    const handleDelete = () => {
        if(meeting.recurrence_id){
            setShowWarning(true);
        }else{
            UpdateMeetingStatus(meeting.id, {status: 'Canceled', userId:user?.id, meeting: meeting.id === -1 ? meeting : null}).then(() => {
                setUpdate(prev => prev + 1);
                handleExit();
                setOpen(false);
            });
            setShowWarning(false);
        }
    }

    const handleCancelAll = () => {
        CancelAllMeetingsInRecurrence({recurrence_id: meeting.recurrence_id, userId: user?.id}).then(() => {
            setUpdate(prev => prev + 1);
            handleExit();
            setOpen(false);
        });
        setShowWarning(false);
    }
    const handleCancelAllNext = () => {
        CancelFollowingMeetingsInRecurrence({recurrence_id: meeting.recurrence_id, userId: user?.id, date:meeting.start_time}).then(() => {
            setUpdate(prev => prev + 1);
            handleExit();
            setOpen(false);
        });
        setShowWarning(false);
    }

    const handleCancelOnlyParent = () => {
        UpdateMeetingStatus(meeting.id, {status: 'Canceled', userId:user?.id, meeting: meeting.id === -1 ? meeting : null}).then(() => {
            setUpdate(prev => prev + 1);
            handleExit();
            setOpen(false);
        });
        setShowWarning(false);
    }

    const handleEditOnlyParent = () => {
        setUpdateMode('current');
        setShowParentWarning(false);
        setEditOpen(true);
        setOpen(false);
    }
    const handleEditFollowingParent = () => {
        setUpdateMode('next');
        setShowParentWarning(false);
        setEditOpen(true);
        setOpen(false);
    }
    const handleEditALL = () => {
        setUpdateMode('all');
        setShowParentWarning(false);
        setEditOpen(true);
        setOpen(false);
    }


    return(
        <Dialog open={open} onClose={handleExit} >
            {/* Delete/Cancel Parent Warning Dialog*/}
            <Dialog open={showWarning} onClose={() => setShowWarning(false)} maxWidth={'md'}>
                <Grid container height={'100%'} sx={{minWidth:'315px', minHeight:'320px', width:'410px', overflow:'hidden'}}>
                    <CloseIcon
                        sx={{
                            position:'absolute',
                            top:1,
                            right:1,
                            borderRadius:'50%',
                            width:'25px',
                            height:'25px', 
                            color:'black', 
                            background:'#f5f5f5', 
                            ':hover':{background:'#e8e8e8', cursor:'pointer', transform:'scale(1.1)'},
                        }}
                        onClick={() => setShowWarning(false)}
                    />
                    <Grid item sx={{width:'100%', height:'100%', borderBottom:`5px solid ${color}`, padding:'15px 20px 10px 20px', background:'#f2eeed'}} >
                        <Stack direction={'column'} spacing={'-5px'} sx={{ paddingLeft:'5px'}}>
                            <Typography variant="h5">{meeting.name}</Typography>
                            <Typography variant="caption" fontSize={14} paddingLeft={'3px'}>{new Date(meeting.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</Typography>
                        </Stack>
                        <Divider sx={{paddingTop:'5px'}}/>
                        <Stack direction={'column'} sx={{paddingTop:'5px', paddingLeft:'5px'}} spacing={'-8px'}>
                            <Typography variant="h6" fontSize={18} letterSpacing={1} color={theme.palette.secondary.main}>{start.getHours()}:{String(start.getMinutes()).padStart(2, '0')}{getAmPm(start)} - {end.getHours() > 12 ? end.getHours() - 12 : end.getHours()}:{String(end.getMinutes()).padStart(2, '0')}{getAmPm(end)}</Typography>
                            <Typography variant="body1" color={theme.palette.primary.text.dark} fontSize={14} paddingLeft={'3px'}>SEA {location} / {room}</Typography>
                        </Stack>
                    </Grid>
                    <Grid item sx={{display: 'flex', flexDirection:'column', width:'100%', height:'100%',  padding:'15px 20px 10px 20px', justifyContent:'center'}}>
                        <Typography paddingTop={'10px'}>This meeting is recurring {meeting.repeats}.</Typography>
                        <Typography paddingTop={'10px'}>What would you like to do?</Typography>
                    </Grid>
                    <Grid padding={'5px'}>

                    </Grid>
                    <Stack position={'relative'} bottom={meeting.description ? 0 : -5} direction={'row'} width={'100%'} sx={{marginBottom:'-5px', paddingRight:'5px', paddingTop:'5px', paddingLeft:'5px', height:'35px', borderTop:'1px solid #dedede'}} spacing={1}>
                        <Tooltip title={'Cancel all recurring meetings'}
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: '.8rem', // Larger text
                                    },
                                }
                            }}
                        >
                            <Button
                                variant={'outlined'} 
                                style={{ fontSize: '12px' }}
                                sx={{
                                    width:'100%', 
                                    color:'black',
                                    padding:'5px'
                                }} 
                                onClick={handleCancelAll}
                                startIcon={<DeleteSweepIcon sx={{color:theme.palette.secondary.light}}/>}
                            >
                                Cancel All
                            </Button>
                        </Tooltip>
                        <Tooltip title={'Cancel all following meetings'}
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: '.8rem', // Larger text
                                    },
                                }
                            }}
                        >
                            <Button 
                                variant={'outlined'} 
                                style={{ fontSize: '12px' }}
                                sx={{
                                    width:'100%', 
                                    color:'black', 
                                }}
                                onClick={handleCancelAllNext}
                                startIcon={<RemoveRoadIcon sx={{color:theme.palette.secondary.light}}/>}
                            >
                                Cancel Next
                            </Button>
                        </Tooltip>
                        <Tooltip title={'Cancel this meeting'}
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: '.8rem', // Larger text
                                    },
                                }
                            }}
                        >
                            <Button 
                                variant={'outlined'} 
                                style={{ fontSize: '12px' }}
                                sx={{
                                    width:'100%', 
                                    color:'black', 
                                    padding:'5px'
                                }}
                                onClick={handleCancelOnlyParent}
                                startIcon={<DoNotDisturbIcon sx={{color:theme.palette.secondary.light}}/>}
                            >
                                Cancel Current
                            </Button>
                        </Tooltip>
                    </Stack>
                </Grid>
            </Dialog>
            {/* Edit Parent Warning Dialog*/}
            <Dialog open={showParentWarning} onClose={() => setShowParentWarning(false)}>
                <Grid container height={'100%'} sx={{minWidth:'320px', minHeight:'320px', width:'400px', overflow:'hidden'}}>
                    <CloseIcon
                        sx={{
                            position:'absolute',
                            top:1,
                            right:1,
                            borderRadius:'50%',
                            width:'25px',
                            height:'25px', 
                            color:'black', 
                            background:'#f5f5f5', 
                            ':hover':{background:'#e8e8e8', cursor:'pointer', transform:'scale(1.1)'},
                        }}
                        onClick={() => setShowParentWarning(false)}
                    />
                    <Grid item sx={{width:'100%', height:'100%', borderBottom:`5px solid ${color}`, padding:'15px 20px 10px 20px', background:'#f2eeed'}} >
                        <Stack direction={'column'} spacing={'-5px'} sx={{ paddingLeft:'5px'}}>
                            <Typography variant="h5">{meeting.name}</Typography>
                            <Typography variant="caption" fontSize={14} paddingLeft={'3px'}>{new Date(meeting.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</Typography>
                        </Stack>
                        <Divider sx={{paddingTop:'5px'}}/>
                        <Stack direction={'column'} sx={{paddingTop:'5px', paddingLeft:'5px'}} spacing={'-8px'}>
                            <Typography variant="h6" fontSize={18} letterSpacing={1} color={theme.palette.secondary.main}>{start.getHours()}:{String(start.getMinutes()).padStart(2, '0')}{getAmPm(start)} - {end.getHours() > 12 ? end.getHours() - 12 : end.getHours()}:{String(end.getMinutes()).padStart(2, '0')}{getAmPm(end)}</Typography>
                            <Typography variant="body1" color={theme.palette.primary.text.dark} fontSize={14} paddingLeft={'3px'}>SEA {location} / {room}</Typography>
                        </Stack>
                    </Grid>
                    <Grid item sx={{display: 'flex', flexDirection:'column', width:'100%', height:'100%',  padding:'15px 20px 10px 20px', justifyContent:'center'}}>
                        <Typography paddingTop={'10px'}>This meeting is recurring {meeting.repeats}.</Typography>
                        <Typography paddingTop={'10px'}>What would you like to do?</Typography>
                    </Grid>
                    <Grid padding={'5px'}>

                    </Grid>
                    <Stack position={'relative'} bottom={meeting.description ? 0 : -5} direction={'row'} width={'100%'} sx={{marginBottom:'-5px', paddingRight:'5px', paddingTop:'5px', paddingLeft:'5px', height:'35px', borderTop:'1px solid #dedede'}} spacing={1}>
                        <Tooltip title={'Update all future meetings'}
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: '.8rem', // Larger text
                                    },
                                }
                            }}
                        >
                            <Button
                                variant={'outlined'} 
                                style={{ fontSize: '12px' }}
                                sx={{
                                    width:'100%', 
                                    color:'black', 
                                }}
                                onClick={handleEditALL}
                                startIcon={<EditNoteIcon sx={{color:'error'}}/>}
                            >
                                Edit All
                            </Button>
                        </Tooltip>
                        <Tooltip title={'Update all the next meetings after this point'}
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: '.8rem', // Larger text
                                    },
                                }
                            }}
                        >
                            <Button 
                                variant={'outlined'} 
                                style={{ fontSize: '12px' }}
                                sx={{
                                    width:'100%', 
                                    color:'black',
                                }}
                                onClick={handleEditFollowingParent}
                                startIcon={<EditRoadIcon sx={{color:theme.palette.secondary.light}}/>}
                            >
                                Edit Next
                            </Button>
                        </Tooltip>
                        <Tooltip title={'Update this meeting'}
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        fontSize: '.8rem', // Larger text
                                    },
                                }
                            }}
                        >
                            <Button 
                                variant={'outlined'} 
                                style={{ fontSize: '12px' }}
                                sx={{
                                    width:'100%', 
                                    color:'black', 
                                }}
                                onClick={handleEditOnlyParent}
                                startIcon={<EditIcon sx={{color:theme.palette.secondary.light}}/>}
                            >
                                Edit Current
                            </Button>
                        </Tooltip>
                    </Stack>
                </Grid>
            
            </Dialog>
            {/* Normal Dialog*/}
            <Grid container height={'100%'} sx={{minWidth:'300px', minHeight:'300px', width:'400px', overflow:'hidden'}}>
                <CloseIcon
                    sx={{
                        position:'absolute',
                        top:1,
                        right:1,
                        borderRadius:'50%',
                        width:'25px',
                        height:'25px', 
                        color:'black', 
                        background:'#f5f5f5', 
                        ':hover':{background:'#e8e8e8', cursor:'pointer', transform:'scale(1.1)'},
                    }}
                    onClick={handleExit}
                />
                <Grid item sx={{width:'100%', height:'100%', borderBottom:`5px solid ${color}`, padding:'15px 20px 10px 20px', background:theme.palette.background.fill.light.lightHover}} >
                    <Stack direction={'column'} spacing={'-5px'} sx={{ paddingLeft:'5px'}}>
                        <Typography variant="h5">{meeting.name}</Typography>
                        <Typography variant="caption" fontSize={14} paddingLeft={'3px'}>{new Date(meeting.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</Typography>
                    </Stack>
                    <Divider sx={{paddingTop:'5px'}}/>
                    <Stack direction={'column'} sx={{paddingTop:'5px', paddingLeft:'5px'}} spacing={'-8px'}>
                        <Typography variant="h6" fontSize={18} letterSpacing={1} color={theme.palette.secondary.main}>{start.getHours()}:{String(start.getMinutes()).padStart(2, '0')}{getAmPm(start)} - {end.getHours() > 12 ? end.getHours() - 12 : end.getHours()}:{String(end.getMinutes()).padStart(2, '0')}{getAmPm(end)}</Typography>
                        <Typography variant="body1" color={theme.palette.primary.text.dark} fontSize={14} paddingLeft={'3px'}>SEA {location} / {room}</Typography>
                    </Stack>
                </Grid>
                <Grid item sx={{width:'100%', height:'100%',  padding:'15px 20px 10px 20px'}}>
                    <Stack direction={'row'} sx={{ paddingLeft:'5px'}} spacing={3}>
                        <Stack direction={'column'} spacing={1} >
                            <Typography variant="body1" color={theme.palette.primary.text.dark}>Booker:</Typography>
                            <Typography variant="body1" color={theme.palette.primary.text.dark}>Type:</Typography>
                            {meeting.repeats &&
                            <Typography variant="body1" color={theme.palette.primary.text.dark}>Repeats:</Typography>
                            }
                        </Stack>
                        <Stack direction={'column'} spacing={1}>
                            <Typography variant="body1">{meeting.organizer}</Typography>
                            <Typography variant="body1">{type}</Typography>
                            {meeting.repeats &&
                            <Typography variant="body1">{meeting.repeats}</Typography>
                            }
                        </Stack>
                    </Stack>
                    {meeting.description &&
                        <Divider sx={{paddingTop:'5px'}}/>
                    }
                    {meeting?.description != '' && meeting?.description != null && meeting?.description != undefined &&
                        <Stack direction={'column'} sx={{ paddingLeft:'5px'}}>
                            <Typography variant="body1" color={theme.palette.primary.text.dark} sx={{marginBottom:'-15px'}}>Description:</Typography>
                            <Typography paddingTop={'10px'}>{meeting.description}</Typography>
                        </Stack>
                    }
                </Grid>
                <Grid padding={'5px'}>

                </Grid>
                <Stack position={'relative'} bottom={meeting.description ? 0 : -5} direction={'row'} width={'100%'} sx={{padding:'5px', height:'35px', borderTop:'1px solid #dedede'}} spacing={1}>
                    
                    <Button 
                        variant={'outlined'} 
                        sx={{
                            width:'100%', 
                            color:'black',
                        }}
                        onClick={handleEdit}
                        startIcon={<EditIcon />}
                    >
                        Edit
                    </Button>
                    <Button 
                        variant={'outlined'} 
                        sx={{
                            width:'100%', 
                            color:'black',
                        }}
                        onClick={handleDelete}
                        startIcon={<DeleteOutlineIcon />}
                    >
                        Cancel
                    </Button>
                </Stack>
            </Grid> 
        </Dialog>
    );
};

export default DisplayMeeting;