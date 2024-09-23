import { darkenHexColorWithAplha, hexToRgba } from "../../../../Utilites/Functions/ColorFunctions";
import { useTheme } from "@emotion/react";
import { useEffect, useState } from "react";
import {Grid, Stack, Typography, Box, Tooltip, Chip, Button} from "@mui/material";
import { useAuth } from "../../../../Utilites/AuthContext";
import EventBusyIcon from '@mui/icons-material/EventBusyOutlined';
import { GetRoomResources } from "../../../../Utilites/Functions/ApiFunctions/ResourceFunctions";


const rowItem = (name, value) => {
    return(
        <Grid container direction="row" wrap="wrap">
            <Grid item xs={4}>
                <Typography 
                    component="div"
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
                    component="div"
                    variant="body2" 
                    textAlign="left" 
                    overflow="hidden" 
                    textOverflow="ellipsis"
                >
                    {value}
                </Typography>
            </Grid>
        </Grid> 
    );
}

const RowRoom = ({location, row, rowRoom, groups, roomgroups, setOpen}) => {
    const [roomGroups, setRoomGroups] = useState([]);
    const [roomResources, setRoomResources] = useState([]);
    const {user} = useAuth();

    useEffect(() => {
        const rgroups = roomgroups.filter(rg => rg.room_id == row.id);
        let allRoomGroups = [];
        rgroups.map(rg => {
            allRoomGroups.push(groups.find(grp => grp.id == rg.group_id));
        })
        setRoomGroups(allRoomGroups);
    },[roomgroups]);

    useEffect(() => {
        const data = async () => {
            const rmrs = await GetRoomResources(rowRoom.id);
            setRoomResources(rmrs);
        };
        if(rowRoom?.id){
            data();
        }
    },[rowRoom, row]);

    const theme = useTheme();

    return(
        <Grid sx={{ height:'fit-content', padding:'10px', background:theme.palette.background.fill.light.main}} >
            <Stack direction={'row'} sx={{ padding:'10px', display:'flex'}} justifyContent={'space-around'}>
                <Grid sx={{background:'white', borderRadius:'10px', minWidth:'550px', overflow:'hidden', display:'flex'}}>
                    <Box sx={{display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'10px',paddingTop:'0px', background:`linear-gradient(135deg, rgba(${hexToRgba(row.color, .5)}) 0%, rgba(${darkenHexColorWithAplha(row.color, 60, .5)}) 100%)`}}>
                        <Typography component="div" variant="h6" paddingLeft={'10px'}>
                            Room
                        </Typography>
                        {user?.admin &&
                            <Button variant="outlined" onClick={() => setOpen(rowRoom, location)}  startIcon={<EventBusyIcon/>} sx={{':hover':{backgroundColor:'rgba(255, 187, 0, .1)'}}}>
                                Edit
                            </Button>
                        }
                    </Box>
                    <Stack width={'100%'} direction={'column'} sx={{marginTop:'10px', paddingLeft:'20px', paddingBottom:'5px'}} spacing={2}>
                        {rowItem('Name', row.room)}
                        {rowItem('Location', location.Alias)}
                        {rowItem('Capacity', row.capacity)}
                        {rowItem('Color', <Box sx={{width:'15px', height:'15px', border:'1px solid black', background:row.color}}/>)}
                        {rowItem('Access Groups', roomGroups.length == 0 ? 'None' : 
                            roomGroups.map((gp, index) => (
                                <Tooltip 
                                    key={index}
                                    arrow
                                    title={
                                        <Typography variant="body2">
                                            {`${gp.access} Access`}
                                        </Typography>
                                    } 
                                >
                                    <Chip sx={{cursor:'pointer'}} label={gp.group_name} />
                                </Tooltip>
                            ))
                        )}
                        {rowItem('Room Resources',roomResources.map(resource => resource.name).join(', '))}
                    </Stack>
                </Grid>
                <Grid sx={{background:'white', borderRadius:'10px', minWidth:'550px', overflow:'hidden', display:'flex'}}>
                    <Box sx={{display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'10px',paddingTop:'0px', background:`linear-gradient(135deg, rgba(${darkenHexColorWithAplha(row.color, 60, .5)}) 0%, rgba(${hexToRgba(row.color, .5)}) 100%)`}}>
                        <Typography component="div" variant="h6" paddingLeft={'10px'}>
                            Location
                        </Typography>
                    </Box>
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
    );
};

export default RowRoom;