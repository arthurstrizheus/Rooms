import { useTheme } from '@emotion/react';
import { format } from 'date-fns';
import {Grid, Stack, Typography} from "@mui/material";


const DaysBar = ({ days }) => {
    const theme = useTheme();
    return (
        days.map((day) => (
            <Grid key={day} className="Hour" item sx={{ width: '100%', height: '100%', minWidth: '160px' }}>
                <Stack direction={'column'} sx={{ borderLeft: `2px solid ${theme.palette.border.main}`, height: '100%', paddingLeft: '10px' }}>
                    {/* Display the day of the month */}
                    <Typography variant="h7" paddingTop={'10px'} color={theme.palette.secondary.light} fontFamily={'Courier New, sans-serif'} fontSize={26}>
                        {format(day, 'dd')}
                    </Typography>
                    {/* Display the day of the week */}
                    <Typography variant="h7" paddingTop={'10px'} fontFamily={'Courier New, sans-serif'} fontSize={16}>
                        {format(day, 'EEEE')}
                    </Typography>
                </Stack>
            </Grid>
        ))
    );
};

export default DaysBar;
