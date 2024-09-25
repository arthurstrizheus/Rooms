import { useTheme } from "@emotion/react";
import {Grid, Stack, Typography} from "@mui/material";


const HoursBar = ({hours}) => {
    const theme = useTheme();
    return hours?.map(hour => (
        <Grid key={hour.hour} className="Hour" item sx={{ width: '160px', height: '100%', minWidth: '160px' }}>
            <Stack direction={'column'} sx={{ borderLeft: `2px solid ${theme.palette.border.main}`, height: '100%' }} justifyContent={'space-between'}>
                <Stack direction={'row'}>
                    <Typography variant="h7" paddingTop={'10px'} color={theme.palette.secondary.light} fontFamily={'Courier New, sans-serif'} fontSize={40}>{hour.hour}</Typography>
                    <Typography variant="caption" paddingTop={'10px'} fontWeight={'light'} color={theme.palette.secondary.light} fontFamily={'Courier New, sans-serif'} fontSize={17}>{hour.am ? 'am' : 'pm'}</Typography>
                </Stack>
                <Stack direction={'row'} justifyContent={'space-between'}>
                    <Grid key={0} borderRight={`1px solid rgb(220, 220, 220)`} fontFamily={'museo-sans'} height={'100%'} paddingRight={'3px'} width={'100%'} minWidth={'40px'}>
                        <Typography paddingLeft={'5px'} color={'rgb(77, 77, 77)'} marginTop={'-8px'}>00</Typography>
                    </Grid >
                    <Grid key={15} borderRight={`1px solid rgb(173, 173, 173)`} fontFamily={'museo-sans'} height={'100%'} paddingRight={'3px'} width={'100%'} minWidth={'40px'}>
                        <Typography paddingLeft={'5px'} color={'rgb(77, 77, 77)'} marginTop={'-8px'}>15</Typography>
                    </Grid>
                    <Grid key={30} borderRight={`1px solid rgb(220, 220, 220)`} fontFamily={'museo-sans'} height={'100%'} paddingRight={'3px'} width={'100%'} minWidth={'40px'}>
                        <Typography paddingLeft={'5px'} color={'rgb(77, 77, 77)'} marginTop={'-8px'}>30</Typography>
                    </Grid>
                    <Grid key={45} fontFamily={'museo-sans'} height={'100%'} paddingRight={'3px'} width={'100%'}>
                        <Typography paddingLeft={'5px'} color={'rgb(77, 77, 77)'} marginTop={'-8px'}>45</Typography>
                    </Grid>
                </Stack>
            </Stack>
        </Grid>
    ));
};
export default HoursBar;