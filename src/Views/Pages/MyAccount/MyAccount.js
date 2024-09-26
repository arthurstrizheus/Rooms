import { useEffect, useState } from "react";
import { useAuth } from "../../../Utilites/AuthContext";
import { useTheme } from "@emotion/react";
import { openSnackbar } from "../../../Utilites/SnackbarContext";
import {Grid, Stack, Typography, Button, Divider, FormControl, Select, InputLabel, MenuItem, TextField, Box, Tooltip, Chip, Tab, Tabs} from "@mui/material";
import PageSelector from '../../Components/PageSelector/PageSelector';
import { GetLocations, GetUserGroups } from "../../../Utilites/Functions/ApiFunctions";
import { AuthenticatePassword, UpdateUserDetails, UpdateUserPassword, AuthenticateUser } from "../../../Utilites/Functions/ApiFunctions/UserFunctions";

function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

const MyAccount = ({setLoading}) => {
    const theme = useTheme();
    const {user, setUser} = useAuth();
    const [email, setEmail] = useState('');
    const [password1, setPassword1] = useState('');
    const [password2, setPassword2] = useState('');
    const [location, setLocation] = useState('');
    const [locations, setLocations] = useState([]);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [passwordBorder, setPasswordBorder] = useState(false);
    const [accountBorder, setAccountBorder] = useState(false);
    const [userGroups, setUserGroups] = useState([]);
    const [update, setUpdate] = useState(0);

    const onSavePassword = () => {
        if(password1.length < 5){
            openSnackbar('Character greater less than 5', {
                severity: 'error',
                autoHideDuration: 4000,
                anchorOrigin: { vertical: 'top', horizontal: 'center' },
                alertProps: { variant: 'filled' },
                transition: 'grow', // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
            });
            setPassword1('');
            setPassword2('');
            setPasswordBorder(true);
        }else if(password1 !== password2){
            openSnackbar('Passwords do not match', {
                severity: 'error',
                autoHideDuration: 4000,
                anchorOrigin: { vertical: 'top', horizontal: 'center' },
                alertProps: { variant: 'filled' },
                transition: 'grow', // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
            });
            setPassword1('');
            setPassword2('');
            setPasswordBorder(true);
        }else{ 
            AuthenticateUser({email:user?.email, password: currentPassword})
            .then((resp1) => {
                if(resp1?.id){
                    AuthenticatePassword({email:user?.email, password: password1})
                    .then((resp) => {
                        if(resp?.id){
                            openSnackbar('Password is the same as current', {
                                severity: 'error',
                                autoHideDuration: 4000,
                                anchorOrigin: { vertical: 'top', horizontal: 'center' },
                                alertProps: { variant: 'filled' },
                                transition: 'grow', // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
                            });
                            setPassword1('');
                            setPassword2('');
                            setPasswordBorder(true);
                        }else{
                            UpdateUserPassword(user?.id, {password: password1});
                            setPasswordBorder(false);  
                        }
                    });
                }
            });
        }
    };
    const onSaveDetails = () => {
        if(firstName == '' || lastName == ''){
            openSnackbar('First or last name cannot be blank', {
                severity: 'error',
                autoHideDuration: 4000,
                anchorOrigin: { vertical: 'top', horizontal: 'center' },
                alertProps: { variant: 'filled' },
                transition: 'grow', // Just pass the string 'grow', 'slide', 'fade', 'zoom', etc.
            });
            setAccountBorder(true);
        }else{
            setLoading(true);
            UpdateUserDetails(user?.id, {first_name:firstName, last_name:lastName, location:location.officeid})
            .then(() => setUser({...user, firstName: firstName, lastName: lastName, location: location.officeid}))
            .then(() => setUpdate(prev => prev + 1));
            setAccountBorder(false);
            setPassword1('');
            setPassword2('');
            setPasswordBorder(true);
            setCurrentPassword('');
        }
    };

    useEffect(() => { 
        const data = async () => {
            const ugs = await GetUserGroups(user?.id);
            setUserGroups(ugs);
        };
        if(user?.id){
            setLoading(true);
            GetLocations().then((lcs) => setLocations(lcs))
            .then(() => setLoading(false));
            setFirstName(user?.first_name);
            setLastName(user?.last_name);
            setEmail(user?.email);
            data();
        } 
    },[update, user]);
    
    useEffect(() => {  
        setLocation(locations?.find(lc => lc.officeid === user?.location));
    },[locations]);

    return(
        <Grid sx={{width:'100%', height:'100%'}}>
            <Stack direction={'column'} sx={{width:'100%', height:'100%'}}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={0} aria-label="basic tabs example">
                        <Tab label='Details' {...a11yProps(0)} />
                    </Tabs>
                </Box>
                <Stack sx={{display:'flex', width: '100%', height: '100%', justifyContent: 'space-between', paddingTop:'50px', paddingBottom:'50px', backgroundColor: theme.palette.background.fill.light.lightHover}} direction={'row'}>
                    <Grid sx={{width:'100%', height:'100%', display:'flex', justifyContent:'center'}}>
                        <Grid sx={{width:'fit-content', height:'fit-content', padding:'20px', borderRadius:'20px', background: theme.palette.secondary.lightHover, border:!accountBorder ? '4px, solid rgba(0,0,0, .01 )' : '4px, solid rgba(255,0,0, .2)'}}>
                            <Typography width={'100%'} textAlign={'center'} color={theme.palette.primary.main}>Account Details</Typography>
                            <Stack direction={'row'} spacing={2} sx={{width:'100%', height:'100%', justifyContent:'center', marginTop:'15px', minHeight:'220px'}}>
                                <Stack spacing={2}>
                                    <Typography sx={{ alignItems: 'center', display: 'flex', height: '38px' }}>First name</Typography>
                                    <Typography sx={{ alignItems: 'center', display: 'flex', height: '38px' }}>Last name</Typography>
                                    <Typography sx={{ alignItems: 'center', display: 'flex', height: '38px' }}>Email</Typography>
                                    <Typography sx={{ alignItems: 'center', display: 'flex', height: '38px' }}>Location</Typography>
                                    <Typography sx={{ alignItems: 'center', display: 'flex', height: '38px' }}>Groups</Typography>
                                </Stack>
                                <Stack spacing={2}>
                                    <TextField label={'First Name'} value={firstName} sx={{width:'400px', backgroundColor:'white'}} onChange={(e) => setFirstName(e.target.value)} size="small"/>
                                    <TextField label={'Last Name'} value={lastName} sx={{width:'400px', backgroundColor:'white'}} onChange={(e) => setLastName(e.target.value)} size="small"/>
                                    <TextField label={'Email'} value={email} sx={{width:'400px', backgroundColor:'white'}} disabled={true} size="small"/>
                                    <FormControl variant="outlined" width={'400px'} size="small">
                                        <InputLabel id="demo-simple-select-standard-label">Location</InputLabel>
                                        <Select
                                            sx={{width:'100%', backgroundColor:'white'}}
                                            labelId="demo-simple-select-standard-label"
                                            id="demo-simple-select-standard"
                                            label="Location"
                                            value={location?.officeid || ''}
                                            onChange={(e) => {
                                                const selectedItem = locations?.find(itm => itm.officeid === e.target.value);
                                                setLocation(selectedItem); // Return the entire object
                                            }}
                                        >
                                            {locations?.map((itm, index) => <MenuItem key={index} value={itm.officeid}>{itm.Alias}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                    <Box sx={{display:'flex', flexDirection:'row', gap:1, width:'400px',}}>
                                        {userGroups?.map((gp, index) => (
                                            <Tooltip 
                                                key={index}
                                                arrow
                                                title={
                                                    <Typography variant="body2">
                                                        {`${gp?.access} Access`}
                                                    </Typography>
                                                } 
                                            >
                                                <Chip sx={{cursor:'pointer'}} label={gp?.group_name} />
                                            </Tooltip>
                                        ))}
                                    </Box>
                                </Stack>
                                <Button sx={{width:'fit-content', height:'fit-content', background: '#f7dcdc', ':hover':{background:'#fccaca'}, textTransform: 'none'}} onClick={onSaveDetails}>
                                    Save Changes
                                </Button>
                            </Stack>
                        </Grid>
                    </Grid>

                    <Divider orientation="vertical" sx={{height:'50%'}}/>

                    <Grid sx={{width:'100%', height:'100%', display:'flex', justifyContent:'center'}}>
                        <Grid sx={{width:'fit-content', height:'fit-content', padding:'20px', borderRadius:'20px', background: theme.palette.secondary.lightHover, border: !passwordBorder ? '4px, solid rgba(0,0,0, .01 )' : '4px, solid rgba(255,0,0, .2 )'}}>
                            <Typography width={'100%'} textAlign={'center'} color={theme.palette.primary.main}>Athentication</Typography>
                            <Stack direction={'row'} spacing={2} sx={{width:'100%', height:'100%', justifyContent:'center', marginTop:'15px', minHeight:'220px'}}>
                                <Stack spacing={2}>
                                    <Typography sx={{ alignItems: 'center', display: 'flex', height: '38px' }}>Current</Typography>
                                    <Typography sx={{ alignItems: 'center', display: 'flex', height: '38px' }}>New</Typography>
                                    <Typography sx={{ alignItems: 'center', display: 'flex', height: '38px' }}>Confirm</Typography>
                                </Stack>
                                <Stack spacing={2}>
                                    <TextField label={'Current Password'} value={currentPassword} sx={{width:'400px', backgroundColor:'white'}} type={'password'} onChange={(e) => setCurrentPassword(e.target.value)} size="small"/>
                                    <TextField label={'New Password'} value={password1} sx={{width:'400px', backgroundColor:'white'}}  type={'password'} onChange={(e) => setPassword1(e.target.value)} size="small"/>
                                    <TextField label={'Confirm New Password'} value={password2} sx={{width:'400px', backgroundColor:'white'}}  type={'password'} onChange={(e) => setPassword2(e.target.value)} size="small"/>
                                </Stack>
                                <Button sx={{width:'fit-content', height:'fit-content', background: '#f7dcdc', ':hover':{background:'#fccaca'}, textTransform: 'none'}} onClick={onSavePassword}>
                                    Save Changes
                                </Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </Stack>
            </Stack>
        </Grid>
    );
};

export default MyAccount;