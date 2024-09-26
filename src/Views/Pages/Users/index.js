import { Box, Tab, Tabs } from "@mui/material";
import { useEffect, useState } from "react";
import Groups from "../Groups/Groups";
import Users from "./Components/Users";

function CustomTabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <Box
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
            sx={{  width:'100%', height:'100%'}}
        >
            {value === index && <Box sx={{height:'100%', overflow:'hidden', display:'flex', flexGrow:1}}>{children}</Box>}
        </Box>
    );
}

function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}


const Resournces  = ({setLoading}) => {
    const [value, setValue] = useState(0);
    const handleChange = (event, newValue) => {
        setValue(newValue);
    };
    useEffect(() => {

    });

    return(
        <Box sx={{ display:'flex', flexGrow:1, flexDirection:'column', overflow:'hidden'}}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
                    <Tab label='Users' {...a11yProps(0)} />
                    <Tab label='Groups' {...a11yProps(1)} />
                </Tabs>
            </Box>
            <Box sx={{display:'flex', flexGrow:1}}>
                <CustomTabPanel value={value} index={0}>
                    <Users setLoading={setLoading}/>
                </CustomTabPanel>
                <CustomTabPanel value={value} index={1}>
                    <Groups setLoading={setLoading}/>
                </CustomTabPanel>
            </Box>
            
        </Box>
    )
}

export default Resournces;