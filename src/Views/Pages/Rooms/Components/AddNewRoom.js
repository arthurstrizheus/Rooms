import { useEffect, useState } from "react";
import { useTheme } from "@emotion/react";
import {Grid, Stack, Typography, Button, Dialog, FormControl, InputLabel, Select, Box, Divider, Input, MenuItem, TextField, OutlinedInput, FormHelperText, Chip} from "@mui/material";
import { SketchPicker } from 'react-color'
import { showError } from "../../../../Utilites/Functions/ApiFunctions";
import {PostRoom, UpdateRoom} from "../../../../Utilites/Functions/ApiFunctions/RoomFunctions"
import { DeleteRoomGroupByRoomId, PostRoomGroup} from '../../../../Utilites/Functions/ApiFunctions/RoomGroupFunctions'
import { useAuth } from "../../../../Utilites/AuthContext";

const AddNewRoom = ({ open, setOpen, roomGroups, roomLocation, selectedRoom, locations, groups, setUpdate}) => {
    const theme = useTheme();
    const {user} = useAuth();
    const ariaLabel = { 'aria-label': 'description' };
    const [color, setColor] = useState('22194D');
    const [roomName, setRoomName] = useState('');
    const [location, setLocation] = useState('');
    const [capacity, setCapacity] = useState('');
    const [fullControl, setFullControl] = useState([]);
    const [readAccess, setReadAccess] = useState([]);
    const [oldFullControl, setOldFullControl] = useState([]);
    const [oldReadAccess, setOldReadAccess] = useState([]);

    const onClose = () => {
        setOpen(false);
        setLocation('');
        setCapacity('');
        setRoomName('');
        setColor('');
        setFullControl([]);
        setReadAccess([]);
        setOldFullControl([]);
        setOldReadAccess([]);
        setUpdate(prev => prev + 1);
    };

    const handleChange = (newColor) => {
        setColor(newColor.hex);
    };

    const onSubmit = () => {
        if(roomName != '' && color != '' && location){
            if(!selectedRoom?.id){
                PostRoom({value: roomName, color: color, location: location.officeid, capacity: capacity, created_user_id: user?.id }).then(async (resp) => {
                    if(resp){
                        let promises = fullControl?.map(async fc => PostRoomGroup({group_id: fc, room_id: resp.id, created_user_id: user?.id}));
                        await Promise.all(promises);
                        promises = readAccess?.map(async ra => PostRoomGroup({group_id: ra, room_id: resp.id, created_user_id: user?.id}));
                        await Promise.all(promises);
                        onClose();
                    }
                });
            }else{
                UpdateRoom(selectedRoom?.id, {value: roomName, color: color, location: location.officeid, capacity: capacity, created_user_id: user?.id })
                .then(async (resp) => {
                    if(resp){
                        // Add new groups
                        let promises = fullControl?.map(fc => oldFullControl?.find(ofc => ofc === fc) ? null : PostRoomGroup({group_id: fc, room_id: selectedRoom.id, created_user_id: user?.id}));
                        await Promise.all(promises);
                        promises = readAccess?.map(or => oldReadAccess?.find(ora => ora === or) ? null : PostRoomGroup({group_id: or, room_id: selectedRoom.id, created_user_id: user?.id}));
                        await Promise.all(promises);
                        // Delete removed groups
                        promises = oldFullControl?.map(ofc => fullControl?.find(fc => ofc === fc) ? null : DeleteRoomGroupByRoomId({group_id: ofc, room_id: selectedRoom.id}));
                        await Promise.all(promises);
                        promises = oldReadAccess?.map(ora => readAccess?.find(or => ora === or) ? null : DeleteRoomGroupByRoomId({group_id: ora, room_id: selectedRoom.id}));
                        await Promise.all(promises);
                    
                    }
                    onClose();
                })
            }
        }else{
            showError("Feilds cannot be empty");
        }
    };

    const handleFullControlChange = (event) => {
        const {
            target: { value },
        } = event;
        setFullControl(
            // Ensure that value is always an array of IDs.
            typeof value === 'string' ? value.split(',') : value
        );
    };
    const handleReadAccessChange = (event) => {
        const {
            target: { value },
        } = event;
        setReadAccess(
            // Ensure that value is always an array of IDs.
            typeof value === 'string' ? value.split(',') : value
        );
    };

    useEffect(() => {
        if(selectedRoom){
            setLocation(roomLocation);
            setRoomName(selectedRoom.value);
            setColor(selectedRoom.color);
            setCapacity(selectedRoom.capacity);
            
            const roomsGroups = [];
            roomGroups.filter(gp => gp.room_id == selectedRoom.id)?.map(ug => roomsGroups.push(groups?.find(gp => gp.id == ug.group_id)));
            roomsGroups?.map(ug => {
                if(ug.access == 'Full' && !fullControl.includes(ug.id)){
                    fullControl.push(ug.id);
                    oldFullControl.push(ug.id);
                }else if(!readAccess.includes(ug.id)){
                    readAccess.push(ug.id);
                    oldReadAccess.push(ug.id);
                }
            });
        }
    },[selectedRoom, roomLocation]);

    return (
        <Dialog open={!!open} onClose={onClose} maxWidth={'lg'}>
            <Grid sx={{width:'fit-content', textAlign:'center', paddingBottom:'5px', height:'fit-content'}}>
                <Typography
                    variant="h5"
                    textAlign={'center'}
                    width={'100%'}
                    fontFamily={'Courier New, sans-serif'}
                    marginBottom={1}
                    marginTop={1}
                >
                    Add Room
                </Typography>
                <Divider width={'100%'} />
                <Stack direction={'row'} sx={{ minWidth: '600px', minHeight:'380px', padding: '20px' }} spacing={2}>
                    <Stack direction={'column'} >
                        <Input
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder="Room Name"
                            inputProps={ariaLabel}
                        />
                        <Stack direction={'row'} sx={{width:'100%', maxHeight:'60px', marginTop:'10px'}} spacing={1}>
                            <FormControl variant="standard" sx={{minWidth: 160, width:'100%'}}>
                                <InputLabel id="demo-simple-select-standard-label">Location</InputLabel>
                                <Select
                                    labelId="demo-simple-select-standard-label"
                                    id="demo-simple-select-standard"
                                    value={location?.officeid || ''}
                                    onChange={(e) => {
                                        const selectedItem = locations?.find(itm => itm.officeid === e.target.value);
                                        setLocation(selectedItem); // Return the entire object
                                    }}
                                    label="Location"
                                >
                                    {locations?.map((itm, index) => <MenuItem key={index} value={itm.officeid}>{itm.Alias}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField
                                value={capacity}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setCapacity(value);
                                }}
                                error={!/^\d*$/.test(capacity) ? true : false}
                                variant={'standard'}
                                label={"Capacity"}
                                helperText = {!/^\d*$/.test(capacity) ? "Numbers Only" : ''}
                                sx={{
                                    width: '100%'
                                }}
                            />
                        </Stack>
                        <Stack direction={'column'} sx={{width:'100%', maxHeight:'60px', marginTop:'10px'}}>
                            <FormControl sx={{marginTop:'10px', width: "100%" }}>
                                <InputLabel id="demo-multiple-chip-label-full">Full Control</InputLabel>
                                <Select
                                    labelId="demo-multiple-chip-label-full"
                                    id="demo-multiple-chip-full"
                                    multiple 
                                    value={fullControl}
                                    onChange={handleFullControlChange}
                                    input={<OutlinedInput id="select-multiple-chip-full" label="Full Control" />}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight:105, overflowY: 'auto', marginTop:'4px' }}>
                                            {selected?.map((value) => (
                                                <Chip key={value} label={groups?.find(gp => gp.id === value)?.group_name} sx={{maxHeight:25}}/>
                                            ))}
                                        </Box>
                                    )}
                                    sx={{
                                        minHeight: 80, // Maximum height for the Select component
                                        maxWidth:365,
                                        height:110
                                    }}
                                >
                                    {groups.filter(gp => gp.access != 'Read')?.map((name, index) => (
                                        <MenuItem
                                            key={index}
                                            value={name.id}
                                            sx={{fontWeight: fullControl.indexOf(name.id) === -1 ? theme.typography.fontWeightRegular : theme.typography.fontWeightMedium}}
                                        >
                                            {name.group_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormHelperText>Who can Book / Modify mettings for room</FormHelperText>
                            </FormControl>
                            <FormControl sx={{marginTop:'10px', width: "100%" }}>
                                <InputLabel id="demo-multiple-chip-label-read">Read Access</InputLabel>
                                <Select
                                    labelId="demo-multiple-chip-label-read"
                                    id="demo-multiple-chip-read"
                                    multiple 
                                    value={readAccess}
                                    onChange={handleReadAccessChange}
                                    input={<OutlinedInput id="select-multiple-chip-read" label="Read Access" />}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight:105, overflowY: 'auto', marginTop:'4px' }}>
                                            {selected?.map((value) => (
                                                <Chip key={value} label={groups?.find(gp => gp.id === value)?.group_name} sx={{maxHeight:25}}/>
                                            ))}
                                        </Box>
                                    )}
                                    sx={{
                                        minHeight: 80, // Maximum height for the Select component
                                        maxWidth:365,
                                        height:110
                                    }}
                                >
                                    {groups.filter(gp => gp.access != 'Full')?.map((name, index) => (
                                        <MenuItem
                                            key={index}
                                            value={name.id}
                                            sx={{fontWeight: readAccess.indexOf(name.id) === -1 ? theme.typography.fontWeightRegular : theme.typography.fontWeightMedium}}
                                        >
                                            {name.group_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormHelperText>Who can Read / View mettings and room</FormHelperText>
                            </FormControl>
                        </Stack>
                    </Stack>
                    <Grid sx={{ border: '1px solid black', borderRadius: '20px', marginTop: '20px', padding:'10px' }}>
                        <Stack direction={'row'} padding={'10px'} spacing={1}>
                            <Typography marginLeft={'10px'}>Select Room Color</Typography>
                            <Box width={'40px'} height={'20px'} backgroundColor={color} border={'1px solid black'} />
                        </Stack>
                        <Box sx={{ width: '100%'}} justifyContent={'center'}>
                            <SketchPicker
                                color={color}
                                onChange={(e) => handleChange(e)}
                            />
                        </Box>
                    </Grid>
                </Stack>
                <Button variant="outlined" sx={{ backgroundColor: 'rgba(0,170,0,.2)', ':hover': { backgroundColor: 'rgba(0,200,0,.4)' } }} onClick={onSubmit}>
                    Submit
                </Button>
            </Grid>
        </Dialog>
    );
};

export default AddNewRoom;
