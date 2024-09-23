import { useEffect, useState } from "react";
import { useTheme } from "@emotion/react";
import {Grid, Stack, Typography, Button, InputAdornment, IconButton, Tooltip, Dialog, FormControl, InputLabel, Select, Box, Divider, Input, TextField, MenuItem, OutlinedInput, FormHelperText, FormControlLabel, Switch, Chip } from "@mui/material";
import { Visibility, VisibilityOff } from '@mui/icons-material';
import {PostUser, UpdateUser} from '../../../../Utilites/Functions/ApiFunctions/UserFunctions'
import { DeleteGroupUserById, PostGroupUser} from '../../../../Utilites/Functions/ApiFunctions/GroupUsersFunctions'
import { useAuth } from "../../../../Utilites/AuthContext";
import { showError, showSuccess } from "../../../../Utilites/Functions/ApiFunctions";

const emailPattern = /^[^\s@]+(\.[^\s@]+)?@[^\s@]+\.[^\s@]+$/;

const AddNewUser = ({ open, setOpen, groups, userLocation, userGroups, selectedUser, locations, setUpdate }) => {
    const theme = useTheme();
    const {user} = useAuth();
    const ariaLabel = { 'aria-label': 'description' };
    const [admin, setAdmin] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [location, setLocation] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [viewPassword, setViewPassword] = useState(false);
    const [fullControl, setFullControl] = useState([]);
    const [readAccess, setReadAccess] = useState([]);
    const [oldFullControl, setOldFullControl] = useState([]);
    const [oldReadAccess, setOldReadAccess] = useState([]);

    const onClose = () => {
        setOpen(false);
        setLocation('');
        setEmail('');
        setFirstName('');
        setPassword('');
        setLastName('');
        setAdmin(false);
        setFullControl([]);
        setReadAccess([]);
        setOldFullControl([]);
        setOldReadAccess([]);
    };

    const onSubmit = () => {
        if(firstName !== '' && lastName !== '' && (location?.officeid || location?.officeid === 0) && email !== ''){
            if(!selectedUser?.id){
                PostUser({first_name:firstName, last_name: lastName, location: location.officeid, created_user_id: user?.id, email:email, password:password, admin:admin, active:true})
                .then(async (resp) => {
                    if(resp){
                        showSuccess('User Created');
                        let promises = fullControl.map(async fc => PostGroupUser({group_id: fc, user_id: resp.id, created_user_id: user?.id}));
                        await Promise.all(promises);
                        promises = readAccess.map(async or => PostGroupUser({group_id: or, user_id: resp.id, created_user_id: user?.id}));
                        await Promise.all(promises);
                    }
                })
                .then(() => setUpdate(prev => prev + 1));
            }else{
                UpdateUser(selectedUser?.id, {first_name:firstName, last_name: lastName, location: location.officeid, email:email, admin:admin})
                .then((resp) => {
                    if(resp){
                        // Add new groups
                        fullControl.map(fc => oldFullControl.find(ofc => ofc === fc) ? null : PostGroupUser({group_id: fc, user_id: selecteduser?.id, created_user_id: user?.id}));
                        readAccess.map(or => oldReadAccess.find(ora => ora === or) ? null : PostGroupUser({group_id: or, user_id: selecteduser?.id, created_user_id: user?.id}));
                        // Delete removed groups
                        oldFullControl.map(ofc => fullControl.find(fc => ofc === fc) ? null : DeleteGroupUserById({group_id: ofc, user_id: selecteduser?.id}));
                        oldReadAccess.map(ora => readAccess.find(or => ora === or) ? null : DeleteGroupUserById({group_id: ora, user_id: selecteduser?.id}));
                    }
                })
                .then(() => setUpdate(prev => prev + 1));
            }
            onClose();
        }else{
            showError("Fields cannot be empty")
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
        if(selectedUser){
            setLocation(userLocation);
            setFirstName(selecteduser?.first_name);
            setLastName(selecteduser?.last_name);
            setEmail(selecteduser?.email);
            setAdmin(selecteduser?.admin);
            const usersGroups = [];
            userGroups.filter(gp => gp.user_id == selecteduser?.id).map(ug => usersGroups.push(groups.find(gp => gp.id == ug.group_id)));
            usersGroups.map(ug => {
                if(ug.access == 'Full' && !fullControl.includes(ug.id)){
                    fullControl.push(ug.id);
                    oldFullControl.push(ug.id);
                }else if(!readAccess.includes(ug.id)){
                    readAccess.push(ug.id);
                    oldReadAccess.push(ug.id);
                }
            });
        }
    },[selectedUser, userLocation]);

    return (
        <Dialog open={!!open} onClose={onClose} maxWidth={false}>
            <Grid sx={{width:'fit-content', textAlign:'center', paddingBottom:'5px', height:'100%', display:'flex', flexDirection:'column'}}>
                <Typography
                    variant="h5"
                    textAlign={'center'}
                    width={'100%'}
                    fontFamily={'Courier New, sans-serif'}
                    marginBottom={1}
                    marginTop={1}
                >
                    {selectedUser ? 'Edit' : 'Add'} User
                </Typography>
                <Divider width={'100%'} />
                <Stack direction={'row'} sx={{ minHeight:'380px', padding: '20px', height:'100%' }} spacing={2}>
                    <Stack direction={'column'} sx={{flexGrow:1}}>
                        <Stack sx={{display:'felx', flexDirection:'row', gap:1}}>
                            <Input
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="First Name"
                                inputProps={ariaLabel}
                            />
                            <Input
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Last Name"
                                inputProps={ariaLabel}
                            />
                        </Stack>
                        
                        <Stack direction={'row'} sx={{width:'100%', maxHeight:'60px', marginTop:'10px'}} spacing={1}>
                            <TextField
                                value={email}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setEmail(value);
                                }}
                                error={!emailPattern.test(email)  && email !== '' ? true : false}
                                variant={'standard'}
                                label={"Email"}
                                helperText = {!emailPattern.test(email) && email !== '' ? "***.***@***.com OR ***@***.com" : ''}
                                sx={{
                                    width: '100%'
                                }}
                            />
                            <FormControl variant="standard" sx={{minWidth: 120, width:'50%'}}>
                                <InputLabel id="demo-simple-select-standard-label">Location</InputLabel>
                                <Select
                                    labelId="demo-simple-select-standard-label"
                                    id="demo-simple-select-standard"
                                    value={location?.officeid || ''}
                                    onChange={(e) => {
                                        const selectedItem = locations.find(itm => itm.officeid === e.target.value);
                                        setLocation(selectedItem); // Return the entire object
                                    }}
                                    label="Location"
                                >
                                    {locations.map((itm, index) => <MenuItem key={index} value={itm.officeid}>{itm.Alias}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Stack>
                        <Stack direction={'column'} sx={{flexGrow:1, width:'100%', marginTop:'10px', display:'flex'}}>
                            <FormControl sx={{marginTop:'10px', width: "100%"}}>
                                <InputLabel id="demo-multiple-chip-label">Full Control</InputLabel>
                                <Select
                                    labelId="demo-multiple-chip-label"
                                    id="demo-multiple-chip"
                                    multiple 
                                    value={fullControl}
                                    onChange={handleFullControlChange}
                                    input={<OutlinedInput id="select-multiple-chip-full" label="Full Control" />}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight:105, overflowY: 'auto', marginTop:'4px' }}>
                                            {selected.map((value) => (
                                                <Chip key={value} label={groups.find(gp => gp.id === value)?.group_name} sx={{maxHeight:25}}/>
                                            ))}
                                        </Box>
                                    )}
                                    sx={{
                                        minHeight: 80, // Maximum height for the Select component
                                        height:110
                                    }}
                                >
                                    {groups.filter(gp => gp.access != 'Read').map((name, index) => (
                                        <MenuItem
                                            key={index}
                                            value={name.id}
                                            sx={{fontWeight: fullControl.indexOf(name.id) === -1 ? theme.typography.fontWeightRegular : theme.typography.fontWeightMedium}}
                                        >
                                            {name.group_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormHelperText>Full access groups user is in</FormHelperText>
                            </FormControl>
                            <FormControl sx={{marginTop:'10px', width: "100%" }}>
                                <InputLabel id="demo-multiple-chip-label">Read Access</InputLabel>
                                <Select
                                    labelId="demo-multiple-chip-label"
                                    id="demo-multiple-chip"
                                    multiple 
                                    value={readAccess}
                                    onChange={handleReadAccessChange}
                                    input={<OutlinedInput id="select-multiple-chip-read" label="Read Access" />}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight:105, overflowY: 'auto', marginTop:'4px' }}>
                                            {selected.map((value) => (
                                                <Chip key={value} label={groups.find(gp => gp.id === value)?.group_name} sx={{maxHeight:25}}/>
                                            ))}
                                        </Box>
                                    )}
                                    sx={{
                                        minHeight: 80, // Maximum height for the Select component
                                        height:110
                                    }}
                                >
                                    {groups.filter(gp => gp.access != 'Full').map((name, index) => (
                                        <MenuItem
                                            key={index}
                                            value={name.id}
                                            sx={{fontWeight: readAccess.indexOf(name.id) === -1 ? theme.typography.fontWeightRegular : theme.typography.fontWeightMedium}}
                                        >
                                            {name.group_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormHelperText>Read access groups user is in</FormHelperText>
                            </FormControl>
                            {!selectedUser?.id &&
                            (
                                <Input
                                    sx={{ marginTop: 2 }}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    type={viewPassword ? "text" : "password"}
                                    inputProps={ariaLabel}
                                    endAdornment={
                                        <InputAdornment position="end">
                                            <Tooltip title={viewPassword ? "Hide password" : "Unhide password"}>
                                                <IconButton
                                                    onClick={() => setViewPassword(!viewPassword)}
                                                    edge="end"
                                                >
                                                    {viewPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </Tooltip>
                                        </InputAdornment>
                                    }
                                />
                            )
                            }
                        </Stack>
                    </Stack>
                </Stack>
                <Grid container direction={'row'} sx={{display:'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Grid item paddingLeft={'10px'}>
                        <FormControlLabel control={
                                <Switch checked={admin} onChange={(e) => setAdmin(e.target.checked)}
                                    sx={{
                                        '& .MuiSwitch-switchBase': {
                                            '&.Mui-checked': {
                                                color: '#fff',
                                                '& + .MuiSwitch-track': {
                                                    backgroundColor: theme.palette.mode === 'dark' ? '#2ECA45' : '#65C466',
                                                    opacity: 1,
                                                    border: 0,
                                                },
                                                '&.Mui-disabled + .MuiSwitch-track': {
                                                    opacity: 0.5,
                                                }
                                            }
                                        }
                                    }}
                                />
                            } 
                            label="Admin" sx={{'& .MuiFormControlLabel-label': {color: admin ? 'black' : 'grey'}}}
                        />
                    </Grid>
                    <Grid item paddingRight={'10px'}>
                        <Button variant="outlined" sx={{ backgroundColor: 'rgba(0,170,0,.2)', ':hover': { backgroundColor: 'rgba(0,200,0,.4)' } }} onClick={onSubmit}>
                            Submit
                        </Button>
                    </Grid>
                </Grid>
                
            </Grid>
        </Dialog>
    );
};

export default AddNewUser;
