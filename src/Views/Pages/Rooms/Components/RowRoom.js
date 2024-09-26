import { darkenHexColorWithAplha, hexToRgba } from "../../../../Utilites/Functions/ColorFunctions";
import { useTheme } from "@emotion/react";
import { useEffect, useState } from "react";
import {Grid, Stack, Typography, Box, Tooltip, Chip, Button} from "@mui/material";
import { useAuth } from "../../../../Utilites/AuthContext";
import EventBusyIcon from '@mui/icons-material/EventBusyOutlined';
import { GetRoomResources } from "../../../../Utilites/Functions/ApiFunctions/ResourceFunctions";


const rowItem = (name, value, color) => {
    return(
        <Grid container direction="row" wrap="wrap">
            <Grid item xs={4}>
                <Typography 
                    color={color} 
                    component="div"
                    variant="body2" 
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
        rgroups?.map(rg => {
            allRoomGroups.push(groups?.find(grp => grp.id == rg.group_id));
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
        <Grid sx={{ height:'fit-content', padding:'10px', background: theme.palette.background.fill.light.lightHover}} >
            <Stack direction={'row'} sx={{ padding:'10px', display:'flex'}} justifyContent={'space-around'}>
                <Grid sx={{background:'white', borderRadius:'10px', minWidth:'550px', overflow:'hidden', display:'flex'}}>
                    <Box sx={{display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'10px',paddingTop:'0px', background:`linear-gradient(135deg, rgba(${hexToRgba(row.color, .5)}) 0%, rgba(${darkenHexColorWithAplha(row.color, 60, .5)}) 100%)`}}>
                        <Typography component="div" variant="h6" paddingLeft={'10px'} >
                            Room
                        </Typography>
                        {user?.admin &&
                            <Button variant="outlined" onClick={() => setOpen(rowRoom, location)}  startIcon={<EventBusyIcon/>} sx={{':hover':{backgroundColor:'rgba(255, 187, 0, .1)'}}}>
                                Edit
                            </Button>
                        }
                    </Box>
                    <Stack width={'100%'} direction={'column'} sx={{marginTop:'10px', paddingLeft:'20px', paddingBottom:'5px'}} spacing={2}>
                        {rowItem('Name', row.room, theme.palette.primary.text.dark)}
                        {rowItem('Location', location.Alias, theme.palette.primary.text.dark)}
                        {rowItem('Capacity', row.capacity, theme.palette.primary.text.dark)}
                        {rowItem('Color', <Box sx={{width:'15px', height:'15px', border:'1px solid black', background:row.color}}/>, theme.palette.primary.text.dark)}
                        {rowItem('Access Groups', roomGroups.length == 0 ? 'None' : 
                            roomGroups?.map((gp, index) => (
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
                            , theme.palette.primary.text.dark)}
                        {rowItem('Room Resources',roomResources?.map(resource => resource.name).join(', '), theme.palette.primary.text.dark)}
                    </Stack>
                </Grid>
                <Grid sx={{background:'white', borderRadius:'10px', minWidth:'550px', overflow:'hidden', display:'flex'}}>
                    <Box sx={{display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'10px',paddingTop:'0px', background:`linear-gradient(135deg, rgba(${hexToRgba(row.color, .5)}) 0%, rgba(${darkenHexColorWithAplha(row.color, 60, .5)}) 100%)`}}>
                        <Typography component="div" variant="h6" paddingLeft={'10px'}>
                            Location
                        </Typography>
                    </Box>
                    <Stack width={'100%'} direction={'column'} sx={{marginTop:'10px', paddingLeft:'20px', paddingBottom:'5px'}} spacing={2}>
                        {rowItem('Alias', location.Alias, theme.palette.primary.text.dark)}
                        {rowItem('Number', location.Number, theme.palette.primary.text.dark)}
                        {rowItem('City', location.City, theme.palette.primary.text.dark)}
                        {rowItem('State', location.state, theme.palette.primary.text.dark)}
                        {rowItem('Zip', location.Zip, theme.palette.primary.text.dark)}
                        {rowItem('Address', location.SAddress, theme.palette.primary.text.dark)}
                        {rowItem('Airport', location.Airport, theme.palette.primary.text.dark)}
                    </Stack>
                </Grid>
            </Stack>
            
        </Grid>
    );
};

export default RowRoom;