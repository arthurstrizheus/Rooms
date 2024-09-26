import { useState } from "react";
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enGB } from 'date-fns/locale'; // Import the locale that starts weeks on Monday
import { useTheme } from "@emotion/react";
import { Grid, Stack, Typography, Dialog, Divider, Input, FormControl, InputLabel, TextField, Select, Box, Button, MenuItem, Collapse } from "@mui/material";
import { LocalizationProvider, StaticDateTimePicker } from "@mui/x-date-pickers";
import { addMinutes } from "date-fns";
import { showError, showSuccess } from "../../../../Utilites/Functions/ApiFunctions";
import { PostBlockedDate } from "../../../../Utilites/Functions/ApiFunctions/BlockedDatesFunctions";
import { useAuth } from "../../../../Utilites/AuthContext";

const AddBlockedDate = ({ open, setOpen, rooms, setUpdate }) => {
    const theme = useTheme();
    const {user} = useAuth();
    const ariaLabel = { 'aria-label': 'description' };
    const [name, setName] = useState('');
    const [room, setRoom] = useState('');
    const [description, setDescription] = useState('');
    const [repeats, setRepeats] = useState('');
    const [showDesc, setShowDesc] = useState(false);
    const [selectedStartDateTime, setSelectedStartDateTime] = useState(null);
    const [selectedEndDateTime, setSelectedEndDateTime] = useState(null);
    const [showEndTime, setShowEndTime] = useState(false);

    const onClose = () => {
        setName('');
        setShowEndTime(false);
        setSelectedStartDateTime(null);
        setSelectedEndDateTime(null);
        setRepeats('');
        setRoom('');
        setDescription('');
        setShowDesc(false);
        setOpen(false);
    };
    const onSubmit = () => {
        if(name != '' && room?.id && selectedStartDateTime){
            PostBlockedDate({name:name, room_id: room.id, description:description, start_time:selectedStartDateTime.toISOString(), end_time:selectedEndDateTime.toISOString(), created_user_id: user?.id, repeats:repeats})
                .then((resp) => resp ? showSuccess("Saved") : showError("Failed to save")) 
                .then(() => setUpdate(prev => prev + 1));
            onClose();  
        }else{
            showError("Name field cannot be empty");
        }
    };

    const handleStartDateTimeChange = (newValue) => {
        setSelectedStartDateTime(newValue);
    };
    const handleEndDateTimeChange = (newValue) => {
        setSelectedEndDateTime(newValue);
    };
    const handleAcceptStart = () => {
        if(selectedStartDateTime){
            setShowEndTime(true);
        }
    }
    const handleCancelEnd = () => {
        setSelectedEndDateTime(null);
        setShowEndTime(false);
    }

    return (
        <Dialog open={!!open} onClose={onClose} maxWidth="sm" fullWidth>
            <Grid sx={{display:'flex', justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                <Stack direction={'column'} sx={{width:'fit-content', paddingTop:'5px', height:`${showDesc ? '710px' : '600px'}`, transition: 'height 0.5s ease-in-out' }}>
                    <Typography
                        variant="h5"
                        textAlign={'center'}
                        width={'100%'}
                        fontFamily={'Courier New, sans-serif'}
                        marginBottom={2}
                    >
                        Block A Time Slot
                    </Typography>
                    <Divider width={'100%'} />
                    <Stack direction={'row'} sx={{width:'100%', display:'flex', flexFlow:1, alignItems:'bottom', gap:1   }}>
                        <Input
                            sx={{minWidth: 160, width:'100%'}}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Block Name"
                            inputProps={ariaLabel}
                        />
                        <FormControl variant="standard" sx={{minWidth: 160, width:'100%'}}>
                            <InputLabel id="demo-simple-select-standard-label">Select Room</InputLabel>
                            <Select
                                sx={{width:'100%'}}
                                labelId="demo-simple-select-standard-label"
                                id="demo-simple-select-standard"
                                value={room?.id || ''}
                                onChange={(e) => {
                                    const selectedItem = rooms?.find(itm => itm.id === e.target.value);
                                    setRoom(selectedItem); // Return the entire object
                                }}
                            >
                                {rooms?.map((itm, index) => <MenuItem key={index} value={itm.id}>{itm.value}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Stack>
                    <Collapse in={showDesc} timeout={600}>
                        <Box sx={{display:'flex', flexDirection:'column'}}>
                            <FormControl variant="standard" sx={{minWidth: 160, width:'100%'}}>
                                <InputLabel id="repeats-simple-select-standard-label">Repeats</InputLabel>
                                <Select
                                    sx={{width:'100%'}}
                                    labelId="repeats-simple-select-standard-label"
                                    id="repeats-simple-select-standard"
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
                            <TextField
                                id="outlined-multiline-static"
                                label="Description"
                                value={description}
                                multiline
                                rows={2}
                                sx={{marginTop:'10px'}}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </Box>
                    </Collapse>
                    <Typography fontSize={14} color={theme.palette.secondary.light} 
                        sx={{':hover':{cursor:'pointer'}}}
                        onClick={() => setShowDesc(!showDesc)}
                    >
                        {showDesc ? 'Hide details -' : 'Add details +'}
                    </Typography>
                    {!showEndTime ?
                    (
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
                            <StaticDateTimePicker 
                                orientation="landscape"
                                minutesStep={15}
                                ampm={true}
                                value={selectedStartDateTime}
                                onAccept={() => handleAcceptStart}
                                onChange={handleStartDateTimeChange} // Handles change as the user selects a date/time
                                slotProps={{
                                    actionBar: {
                                        onAccept: handleAcceptStart,
                                        actions: ['accept'], // Use the cancel action to bind the back button
                                    },
                                }}
                            />
                        </LocalizationProvider>
                    ) :
                    (
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
                            <StaticDateTimePicker 
                                orientation="landscape"
                                minutesStep={15}
                                ampm={true}
                                value={selectedEndDateTime}
                                onChange={handleEndDateTimeChange} // Handles change as the user selects a date/time
                                slotProps={{
                                    actionBar: {
                                        onCancel: handleCancelEnd,
                                        actions: ['cancel'], // Use the cancel action to bind the back button
                                    },
                                }}
                                renderInput={(params) => <TextField {...params} />}
                            />
                        </LocalizationProvider>
                    )
                    }
                    
                    <Box sx={{display:'flex', marginTop: -5.4, flexGrow:1, marginBottom:4}}>
                        <Typography
                            color={theme.palette.secondary.main}
                            variant="h6"
                            textAlign={'center'}
                            fontFamily={'Courier New, sans-serif'}
                        >
                            {!showEndTime ? "Select Start Time" : "Select End Time"}
                        </Typography>
                    </Box>
                    
                    
                </Stack>
                <Button variant="outlined" sx={{marginBottom:'5px',backgroundColor: 'rgba(0,170,0,.2)', width:'20%', ':hover': { backgroundColor: 'rgba(0,200,0,.4)' } }} onClick={onSubmit}>
                    Submit
                </Button>
            </Grid>
        </Dialog>
    );
};

export default AddBlockedDate;
