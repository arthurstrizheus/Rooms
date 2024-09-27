import { useTheme } from "@emotion/react";
import {Grid, Stack, Typography } from "@mui/material";

const rowItem = (name, value, theme) => {
    return(
        <Grid container direction="row" wrap="wrap">
            <Grid item xs={4}>
                <Typography 
                    variant="body2" 
                    color={theme.palette.primary.text.dark} 
                    whiteSpace="nowrap"  // Prevents text from breaking onto the next line within its box
                    overflow="hidden"    // Ensures any overflow is hidden
                    textOverflow="ellipsis" // Adds ellipsis if the text is too long
                >
                    {name}
                </Typography>
            </Grid>
            <Grid item xs={8}>
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

const RowMeeting = ({meeting, location, room, type, row}) => {
    const theme = useTheme();
    return(
        <Grid sx={{ height:'fit-content', padding:'10px', background: theme.palette.background.fill.light.lightHover}} >
            <Stack direction={'row'} sx={{ padding:'10px', display:'flex'}} justifyContent={'space-around'}>
                <Grid sx={{background:'white', borderRadius:'10px', minWidth:'550px', overflow:'hidden', paddingBottom:'10px'}}>
                    <Typography variant="h6" paddingLeft={'10px'} backgroundColor={type?.color}>{meeting?.name}</Typography>
                    <Stack width={'100%'} direction={'column'} sx={{marginTop:'10px', paddingLeft:'20px'}} spacing={2}>
                        {rowItem('Description', meeting?.description, theme)}
                        {rowItem('Organizer', meeting?.organizer, theme)}
                        {rowItem('Location', location?.Alias, theme)}
                        {rowItem('Room', room?.value, theme)}
                        {rowItem('Type', type?.value, theme)}
                        {rowItem('Status', meeting?.status, theme)}
                    </Stack>
                </Grid>
                <Grid sx={{background:'white', borderRadius:'10px', minWidth:'550px', overflow:'hidden', paddingBottom:'10px'}}>
                    <Typography variant="h6" paddingLeft={'10px'} backgroundColor={type?.color}>Details</Typography>
                    <Stack width={'100%'} direction={'column'} sx={{marginTop:'10px', paddingLeft:'20px'}} spacing={2}>
                        {rowItem('Start Time', new Date(meeting?.start_time).toLocaleDateString('en-US', {hour:'numeric', minute:'numeric', weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }), theme)}
                        {rowItem('End Time', new Date(meeting?.end_time).toLocaleDateString('en-US', {hour:'numeric', minute:'numeric', weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }), theme)}
                        {rowItem('Duration', row?.duration, theme)}
                        {rowItem('Created', new Date(meeting?.createdAt).toLocaleDateString('en-US', {hour:'numeric', minute:'numeric', weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }), theme)}
                        {rowItem('Repeats', meeting?.repeats ? meeting?.repeats : 'No', theme)}
                    </Stack>
                </Grid>
            </Stack>
        </Grid>
    );
};

export default RowMeeting;