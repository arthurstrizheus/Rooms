import { useTheme } from "@emotion/react";
import { Grid, LinearProgress, Typography, Stack } from "@mui/material";
import DateSelector from './Components/DateSelector';

const Banner = ({bannerText, loading, selectedDate, setSelectedDate}) => {
    const theme = useTheme();
    return(
        <Stack direction={'column'} position={'relative'} width={'100%'} >
            <Stack sx={{
                    backgroundColor:theme.palette.background.fill.light.dark, 
                    minHeight:'93px', paddingTop:'30px', paddingLeft:'30px', paddingRight:'30px',
                }}
                direction={'row'}
                spacing={'space-between'}
            >
                <Grid item sx={{ width:'100%'}}>
                    <Typography 
                    sx={{
                        fontSize: '2.5rem', // Adjust to your desired size
                        fontFamily: 'Courier New, sans-serif', // Use the imported font
                        fontWeight: 'light',
                        letterSpacing: '0.05em', // Adjust letter spacing
                        color: 'inherit', // Ensures it inherits the color, or set a specific color
                    }}>{bannerText}</Typography>
                </Grid>
                <Grid item sx={{ width:'100%'}}>
                    {(bannerText == 'Month Schedule' || bannerText == 'Week Schedule' || bannerText == 'Day Schedule') &&
                        <DateSelector selectedDate={selectedDate} setSelectedDate={setSelectedDate}/>
                    }
                </Grid>
                <Grid item sx={{ width:'100%'}}>

                </Grid>
                
            </Stack>
            {loading && 
                <LinearProgress
                    sx={{
                        '& .MuiLinearProgress-bar': {
                            backgroundColor: theme.palette.secondary.light,
                        },
                        bottom:0,
                        width:'100%',
                        position:'absolute'
                    }}
                />
            }
        </Stack>
        
    );
};

export default Banner;