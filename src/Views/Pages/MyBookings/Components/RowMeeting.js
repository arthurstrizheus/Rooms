import {Grid, Stack, Typography } from "@mui/material";

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
    return(
        <Grid sx={{ height:'fit-content', padding:'10px', background:'linear-gradient(135deg, rgba(255, 232, 232,0.5) 0%, rgba(255, 183, 166,0.5) 100%)'}} >
            <Stack direction={'row'} sx={{ padding:'10px', display:'flex'}} justifyContent={'space-around'}>
                <Grid sx={{background:'white', borderRadius:'10px', minWidth:'550px', overflow:'hidden', paddingBottom:'10px'}}>
                    <Typography variant="h6" paddingLeft={'10px'} backgroundColor={type.color}>{meeting.name}</Typography>
                    <Stack width={'100%'} direction={'column'} sx={{marginTop:'10px', paddingLeft:'20px'}} spacing={2}>
                        {rowItem('Description', meeting.description)}
                        {rowItem('Organizer', meeting.organizer)}
                        {rowItem('Location', location.Alias)}
                        {rowItem('Room', room.value)}
                        {rowItem('Type', type.value)}
                        {rowItem('Status', meeting.status)}
                    </Stack>
                </Grid>
                <Grid sx={{background:'white', borderRadius:'10px', minWidth:'550px', overflow:'hidden', paddingBottom:'10px'}}>
                    <Typography variant="h6" paddingLeft={'10px'} backgroundColor={type.color}>Details</Typography>
                    <Stack width={'100%'} direction={'column'} sx={{marginTop:'10px', paddingLeft:'20px'}} spacing={2}>
                        {rowItem('Start Time', new Date(meeting.start_time).toLocaleDateString('en-US', {hour:'numeric', minute:'numeric', weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }))}
                        {rowItem('End Time', new Date(meeting.end_time).toLocaleDateString('en-US', {hour:'numeric', minute:'numeric', weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }))}
                        {rowItem('Duration', row.duration)}
                        {rowItem('Created', new Date(meeting.createdAt).toLocaleDateString('en-US', {hour:'numeric', minute:'numeric', weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }))}
                        {rowItem('Repeats', meeting.repeats ? meeting.repeats : 'No')}
                    </Stack>
                </Grid>
            </Stack>
        </Grid>
    );
};

export default RowMeeting;