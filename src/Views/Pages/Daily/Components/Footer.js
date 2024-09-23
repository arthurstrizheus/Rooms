import { useTheme } from "@emotion/react";
import { Grid } from "@mui/material";
import HorizontalScrollBar from './HorizontalScrollBar';

const Footer = ({ hoursScrollRef, Cref2, scrollBarRef, Cref }) => {
    const theme = useTheme();
    
    return (
        <Grid 
            sx={{ 
                width: '100%', 
                position: 'fixed', 
                bottom: 0, 
                height: '45px', 
                background: theme.palette.background.fill.light.light, // Corrected the typo
                zIndex: 555,  // Match with HorizontalScrollBar zIndex
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'start',
            }}
        >
            <HorizontalScrollBar hoursScrollRef={hoursScrollRef} Cref2={Cref2} Cref={Cref} scrollBarRef={scrollBarRef} />
        </Grid>
    );
};

export default Footer;
