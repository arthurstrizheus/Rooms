
import { useTheme } from "@emotion/react";
import { Grid } from "@mui/material";

const Footer = ({}) => {
    const theme = useTheme();
    return (
        <Grid sx={{ width: '100%', position: 'fixed', bottom: 0, height: '45px', background: theme.palette.background.fill.light.lightHover }}>
            
        </Grid>
    );
};

export default Footer;
