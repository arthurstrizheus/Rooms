import { darkenHexColorWithAplha, hexToRgba } from "../../../../Utilites/Functions/ColorFunctions";
import { useTheme } from "@emotion/react";
import { useAuth } from "../../../../Utilites/AuthContext";
import {Grid, Stack, Typography, Button, Tooltip, Chip } from "@mui/material";
import EventBusyIcon from '@mui/icons-material/EventBusyOutlined';
import React from "react";

const rowItem = (name, value) => {
    return(
        <Grid container direction="row" wrap="wrap">
            <Grid item xs={4}>
                <Typography 
                    variant="body2" 
                    color="rgba(0,0,0,.5)" 
                    whiteSpace="nowrap"  // Prevents text from breaking onto the next line within its box
                    overflow="hidden"    // Ensures any overflow is hidden
                    textOverflow="ellipsis" // Adds ellipsis if the text is too long
                >
                    {name}
                </Typography>
            </Grid>
            <Grid item xs={8} display={'flex'}>
                <Typography 
                    variant="body2" 
                    textAlign="left" 
                    overflow="hidden" 
                    textOverflow="ellipsis"
                    whiteSpace="wrap" 
                >
                    {value}
                </Typography>
            </Grid>
        </Grid> 
    );
}

const ViewUser = ({location, row, rowUser, setOpen}) => {
    const theme = useTheme();
    const {user} = useAuth();
    return(
        <React.Fragment>
            {rowUser && location && row &&
            <Grid sx={{ height:'fit-content', padding:'10px', background:theme.palette.background.fill.light.main}} >
                <Stack direction={'row'} sx={{ padding:'10px', display:'flex'}} justifyContent={'space-around'}>
                    <Grid sx={{background:'white', borderRadius:'10px', minWidth:'550px', overflow:'hidden', display:'flex'}}>
                        <Typography variant="h6" paddingLeft={'10px'} sx={{ display:'flex', flexDirection:'column', justifyContent:'space-between', background:`linear-gradient(135deg, rgba(${hexToRgba('#e3e3e3', .5)}) 0%, rgba(${darkenHexColorWithAplha('#e3e3e3', 60, .5)}) 100%)`}}>
                            User Details
                            {user?.admin &&
                            <Button variant="outlined" onClick={() => setOpen(rowUser, location)} sx={{display:'flex', alignSelf:'start', marginBottom:'5px', textTransform: 'none', ':hover':{backgroundColor:'rgba(255, 187, 0, .1)'}}} startIcon={<EventBusyIcon sx={{color:'orange'}}/>}>
                                Edit
                            </Button>
                            }
                        </Typography>
                        <Stack width={'100%'} direction={'column'} sx={{marginTop:'10px', paddingLeft:'20px', paddingBottom:'5px'}} spacing={2}>
                            {rowItem('Name', row.name)}
                            {rowItem('Email', row.email)}
                            {rowItem('Admin', row.admin ? 'True' : 'False')}
                            {rowItem('Last Login', new Date(rowUser?.last_login).toLocaleDateString('en-US', {hour:'numeric', minute:'numeric', weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }))}
                            {rowItem('Groups', row.groups.length == 0 ? 'None' : 
                                row.groups?.map((gp, index) => (
                                    <Tooltip 
                                        key={index}
                                        arrow
                                        title={
                                            <Typography variant="body2">
                                                {`${gp.access} Access`}
                                            </Typography>
                                        } 
                                    >
                                        <Chip sx={{cursor:'pointer', marginLeft:'2px', marginTop:'2px'}} label={gp.group_name} />
                                    </Tooltip>
                                ))
                            )}
                        </Stack>
                    </Grid>
                    <Grid sx={{ display:'flex', background:'white', borderRadius:'10px', minWidth:'550px', overflow:'hidden'}}>
                        <Typography variant="h6" paddingLeft={'10px'} sx={{background:`linear-gradient(135deg, rgba(${darkenHexColorWithAplha('#e3e3e3', 60, .5)}) 0%, rgba(${hexToRgba('#e3e3e3', .5)}) 100%)`}}>User Location</Typography>
                        <Stack width={'100%'} direction={'column'} sx={{marginTop:'10px', paddingLeft:'20px', paddingBottom:'5px'}} spacing={2}>
                            {rowItem('Alias', location.Alias)}  
                            {rowItem('Number', location.Number)}
                            {rowItem('City', location.City)}
                            {rowItem('State', location.state)}
                            {rowItem('Zip', location.Zip)}
                            {rowItem('Address', location.SAddress)}
                            {rowItem('Airport', location.Airport)}
                        </Stack>
                    </Grid>
                </Stack>
            </Grid>
            }
        </React.Fragment>
    );
};

export default ViewUser;