import { useTheme } from "@emotion/react";
import { Grid, Stack, Typography } from "@mui/material";


const PageSelector = ({headers, selectedHeader, onClick, hoverFill}) => {
    const theme = useTheme();
    return(
    <Grid sx={{ height: '48px', width: '100%', background: theme.palette.background.fill.light.light}}>
        <Stack direction={'row'} sx={{ height: '100%', alignItems: 'center' }}>
            {headers?.map((itm, index) => 
                <Typography 
                    key={itm}
                    sx={{

                        color: theme.palette.secondary.light,
                        display: 'flex',
                        alignItems: 'center',
                        padding:'25px',
                        cursor: 'pointer',
                        fontWeight:'550',
                        background: selectedHeader == index ? hoverFill : '',
                        ':hover':{background:hoverFill}
                    }}
                    onClick={() => onClick(itm)}
                >
                    {itm}
                </Typography>
            )}
        </Stack>
    </Grid>
    );
};

export default PageSelector;