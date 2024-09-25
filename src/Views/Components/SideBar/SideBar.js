import { useTheme } from "@emotion/react";
import './SideBar.css'
import { useState } from "react";
import logo from '../../../Assets/Images/sea-logo.png'
import { useAuth } from "../../../Utilites/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { Collapse, Grid, Stack, Tooltip, Typography } from "@mui/material";
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import DateRangeIcon from '@mui/icons-material/DateRangeOutlined';
import TodayIcon from '@mui/icons-material/TodayOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthOutlined';
import ViewStreamIcon from '@mui/icons-material/ViewStreamOutlined';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import AccountBoxOutlinedIcon from '@mui/icons-material/AccountBoxOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUpOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import CorporateFareIcon from '@mui/icons-material/CorporateFareOutlined';
import FormatColorFillOutlinedIcon from '@mui/icons-material/FormatColorFillOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import AllInboxOutlinedIcon from '@mui/icons-material/AllInboxOutlined';
import EditCalendarOutlinedIcon from '@mui/icons-material/EditCalendarOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';

const SideBar = ({setBannerText, setContent}) => {
    const location = useLocation();
    const theme = useTheme();
    const [nav, setNav] = useState({page:location.pathname.split('/').splice(-1)});
    const { user, setUser, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState({ rooms: true, account: false, manage: false });
    const bannderText = {month:"Month Schedule", week: "Week Schedule", day: "Day Schedule", book: "My bookings", search: "Search for a room",
        approve: "Approval queue", report: "Reports", account: "My account", locations: "Manage: Locations", rooms: "Manage: Rooms", types: "Manage: meeting types",
        users: "Manage: users", resources: "Manage: resources", 
    }

    const toggleCollapse = (section) => {
        setOpen((prevState) => ({ ...prevState, [section]: !prevState[section] }));
    };

    const handleManuClick = (menu) => {
        if(Object.keys(bannderText).includes(menu.toLowerCase())){
            setBannerText(bannderText[menu.toLowerCase()]);
        }else{
            setBannerText(menu);
        }
        switch (menu.toLowerCase()) {
            case 'day':
                nav.page = 'day';
                navigate('/schedule/type/day');
                break;
            case 'week':
                nav.page = 'week';
                navigate('/schedule/type/week');
                break;
            case 'month':
                nav.page = 'month';
                navigate('/schedule/type/month');
                break;
            case 'book':
                nav.page = 'book';
                navigate('/book');
                break;
            case 'search':
                nav.page = 'search';
                navigate('/search');
                break;
            case 'approve':
                nav.page = 'approve';
                navigate('/approve');
                break;
            case 'report':
                nav.page = 'report';
                navigate('/report');
                break;
            case 'account':
                nav.page = 'account';
                navigate('/account');
                break;
            case 'settings':
                nav.page = 'settings';
                navigate('/settings');
                break;
            case 'branding':
                nav.page = 'brand';
                navigate('/branding');
                break;
            case 'report':
                nav.page = 'report';
                navigate('/reports');
                break;
            case 'locations':
                nav.page = 'locations';
                navigate('/manage/locations');
                break;
            case 'rooms':
                nav.page = 'rooms';
                navigate('/manage/rooms');
                break;
            case 'types':
                nav.page = 'types';
                navigate('/manage/types');
                break;
            case 'users':
                nav.page = 'users';
                navigate('/manage/users');
                break;
            case 'resources':
                nav.page = 'resources';
                navigate('/manage/rooms/resources');
                break;
            case 'blocked dates':
                nav.page = 'blocked';
                navigate('/manage/blockeddates');
                break;
            default:
                setContent(<></>);
                break;
            }
    }
    
    const handleLogout = () => {
        localStorage.removeItem('user');
        const rememberMe = localStorage.getItem('rememberMe') == 'true';
        if(!rememberMe){
            localStorage.removeItem('email');
        }
        logout();
        setUser({});
    }

    return(
        <Grid container sx={{alignSelf:'left', height:'100%', width:'200px', minWidth:'200px', backgroundColor:theme.palette.primary.main}}>
            <Stack direction={'column'} sx={{width:"100%"}} justifyContent={'space-between'}>
                <Grid container>
                    <Grid container justifyContent="center" alignItems="center" minHeight={'120px'}>
                        <img src={logo} alt="Logo" style={{ width: 'auto', height: '106px' }} />
                    </Grid>
                    <Grid container sx={{ textAlign: 'left' }}>
                        <Grid
                            item 
                            className="sidebar-button" 
                            style={{ '--primary-dark': theme.palette.primary.dark}}
                            onClick={() => toggleCollapse('rooms')}
                            borderTop={'.5px solid rgb(41, 41, 41)'}
                            marginTop={'3px'}
                        >
                            <Stack direction={'row'} sx={{alignItems:'center', width:'100%', justifyContent: 'space-between'}}>
                                <Stack  direction={'row'} spacing={1}>
                                    <MeetingRoomOutlinedIcon className={'button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                    <Typography variant="h6" fontFamily={'Candara'} color={theme.palette.primary.text.light}>Rooms</Typography>
                                </Stack >
                                {open.rooms ?
                                    <KeyboardArrowDownIcon sx={{color:theme.palette.secondary.light}}/>
                                    :
                                    <KeyboardArrowUpIcon sx={{color:theme.palette.secondary.light}}/>
                                }
                            </Stack>
                            
                        </Grid>
                        <Collapse in={open.rooms} className={'sub-item-collapse'}>
                            <Grid item className="sub-item">
                                <Grid className={'sidebar-button-sub-button'} style={{ '--primary-dark': theme.palette.primary.dark, background: nav.page == 'month' ? theme.palette.primary.dark : null }} onClick={() => handleManuClick('Month')}>
                                    <Stack direction={'row'} className={'sub-button'}>
                                        <CalendarMonthIcon className={'sub-button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                        <Typography variant="body1" className={'sub-button-text'} color={theme.palette.primary.text.main} paddingLeft={'10px'}>Monthly view</Typography>
                                    </Stack> 
                                </Grid>
                                <Grid className={'sidebar-button-sub-button'} style={{ '--primary-dark': theme.palette.primary.dark, background: nav.page == 'week' ? theme.palette.primary.dark : null }} onClick={() => handleManuClick('Week')}>
                                    <Stack direction={'row'} className={'sub-button'}>
                                        <DateRangeIcon className={'sub-button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                        <Typography variant="body1" className={'sub-button-text'} color={theme.palette.primary.text.main}  paddingLeft={'10px'}>Weekly view</Typography>
                                    </Stack>
                                </Grid>
                                <Grid className={'sidebar-button-sub-button'} style={{ '--primary-dark': theme.palette.primary.dark, background: nav.page == 'day' ? theme.palette.primary.dark : null }} onClick={() => handleManuClick('Day')}>
                                    <Stack direction={'row'} className={'sub-button'}>
                                        <TodayIcon className={'sub-button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                        <Typography variant="body1" className={'sub-button-text'} color={theme.palette.primary.text.main} paddingLeft={'10px'}>Daily view</Typography>
                                    </Stack> 
                                </Grid>
                                <Grid className={'sidebar-button-sub-button'} style={{ '--primary-dark': theme.palette.primary.dark, background: nav.page == 'book' ? theme.palette.primary.dark : null }} onClick={() => handleManuClick('Book')}>
                                    <Stack direction={'row'} className={'sub-button'}>
                                        <ViewStreamIcon className={'sub-button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                        <Typography variant="body1" className={'sub-button-text'} color={theme.palette.primary.text.main}  paddingLeft={'10px'}>My bookings</Typography>
                                    </Stack>
                                </Grid>
                                {/* <Grid className={'sidebar-button-sub-button'} style={{ '--primary-dark': theme.palette.primary.dark, background: nav.page == 'search' ? theme.palette.primary.dark : null }} onClick={() => handleManuClick('Search')}>
                                    <Stack direction={'row'} className={'sub-button'}>
                                        <ManageSearchIcon className={'sub-button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                        <Typography variant="body1" className={'sub-button-text'} color={theme.palette.primary.text.main} paddingLeft={'10px'}>Search room</Typography>
                                    </Stack>
                                </Grid> */}
                                <Grid className={'sidebar-button-sub-button'} style={{ '--primary-dark': theme.palette.primary.dark, background: nav.page == 'approve' ? theme.palette.primary.dark : null }} onClick={() => handleManuClick('Approve')}>
                                    <Stack direction={'row'} className={'sub-button'}>
                                        <PlaylistAddCheckIcon className={'sub-button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                        <Typography variant="body1" className={'sub-button-text'} color={theme.palette.primary.text.main}  paddingLeft={'10px'}>Approval queue</Typography>
                                    </Stack>
                                </Grid>
                                {/* <Grid className={'sidebar-button-sub-button'} style={{ '--primary-dark': theme.palette.primary.dark, background: nav.page == 'report' ? theme.palette.primary.dark : null }} onClick={() => handleManuClick('Report')}>
                                    <Stack direction={'row'} className={'sub-button'}>
                                        <AssessmentOutlinedIcon className={'sub-button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                        <Typography variant="body1" className={'sub-button-text'} color={theme.palette.primary.text.main} paddingLeft={'10px'}>Reports</Typography>
                                    </Stack>
                                </Grid> */}
                            </Grid>
                        </Collapse>
                        <Grid 
                            item 
                            className="sidebar-button" 
                            style={{ '--primary-dark': theme.palette.primary.dark }} 
                            onClick={() => toggleCollapse('account')}
                        >
                            <Stack direction={'row'} sx={{alignItems:'center', width:'100%', justifyContent: 'space-between'}}>
                                <Stack  direction={'row'} spacing={1}>
                                    <AccountBoxOutlinedIcon className={'button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                    <Typography variant="h6" fontFamily={'Candara'} color={theme.palette.primary.text.light}>Account</Typography>
                                </Stack>
                                
                                {open.account ?
                                    <KeyboardArrowDownIcon sx={{color:theme.palette.secondary.light}}/>
                                    :
                                    <KeyboardArrowUpIcon sx={{color:theme.palette.secondary.light}}/>
                                }
                            </Stack>
                        </Grid>
                        <Collapse in={open.account} className={'sub-item-collapse'}>
                            <Grid item className="sub-item">
                                <Grid className={'sidebar-button-sub-button'} style={{ '--primary-dark': theme.palette.primary.dark, background: nav.page == 'account' ? theme.palette.primary.dark : null }} onClick={() => handleManuClick('Account')}>
                                    <Stack direction={'row'} className={'sub-button'}>
                                        <AccountBoxOutlinedIcon className={'sub-button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                        <Typography variant="body1" className={'sub-button-text'} color={theme.palette.primary.text.main} paddingLeft={'10px'}>My account</Typography>
                                    </Stack>
                                </Grid>
                                {/* <Grid className={'sidebar-button-sub-button'} style={{ '--primary-dark': theme.palette.primary.dark, background: nav.page == 'settings' ? theme.palette.primary.dark : null }} onClick={() => handleManuClick('Settings')}>
                                    <Stack direction={'row'} className={'sub-button'}>
                                        <SettingsOutlinedIcon className={'sub-button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                        <Typography variant="body1" className={'sub-button-text'} color={theme.palette.primary.text.main}  paddingLeft={'10px'}>Settings</Typography>
                                    </Stack>
                                </Grid> */}
                                {/* <Grid className={'sidebar-button-sub-button'} style={{ '--primary-dark': theme.palette.primary.dark, background: nav.page == 'brand' ? theme.palette.primary.dark : null }} onClick={() => handleManuClick('Branding')}>
                                    <Stack direction={'row'} className={'sub-button'}>
                                        <FavoriteBorderOutlinedIcon className={'sub-button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                        <Typography variant="body1" className={'sub-button-text'} color={theme.palette.primary.text.main} paddingLeft={'10px'}>Branding</Typography>
                                    </Stack>
                                </Grid> */}
                            </Grid>
                        </Collapse>
                        {user?.admin && 
                        (
                            <>
                            <Grid 
                                item 
                                className="sidebar-button" 
                                style={{ '--primary-dark': theme.palette.primary.dark }} 
                                onClick={() => toggleCollapse('manage')}
                            >
                                <Stack direction={'row'} sx={{alignItems:'center', width:'100%', justifyContent: 'space-between'}}>
                                    <Stack  direction={'row'} spacing={1}>
                                        <SettingsOutlinedIcon className={'button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                        <Typography variant="h6" fontFamily={'Candara'} color={theme.palette.primary.text.light}>Manage</Typography>
                                    </Stack>
                                    
                                    {open.manage ?
                                        <KeyboardArrowDownIcon sx={{color:theme.palette.secondary.light}}/>
                                        :
                                        <KeyboardArrowUpIcon sx={{color:theme.palette.secondary.light}}/>
                                    }
                                </Stack>
                            </Grid>
                            <Collapse in={open.manage} className={'sub-item-collapse'}>
                                <Grid item className="sub-item">
                                    <Grid className={'sidebar-button-sub-button'} style={{ '--primary-dark': theme.palette.primary.dark, background: nav.page == 'locations' ? theme.palette.primary.dark : null }} onClick={() => handleManuClick('Locations')}>
                                        <Stack direction={'row'} className={'sub-button'}>
                                            <CorporateFareIcon className={'sub-button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                            <Typography variant="body1" className={'sub-button-text'} color={theme.palette.primary.text.main} paddingLeft={'10px'}>Locations</Typography>
                                        </Stack>
                                    </Grid>
                                    <Grid className={'sidebar-button-sub-button'} style={{ '--primary-dark': theme.palette.primary.dark, background: nav.page == 'rooms' ? theme.palette.primary.dark : null }} onClick={() => handleManuClick('Rooms')}>
                                        <Stack direction={'row'} className={'sub-button'}>
                                            <MeetingRoomOutlinedIcon className={'sub-button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                            <Typography variant="body1" className={'sub-button-text'} color={theme.palette.primary.text.main}  paddingLeft={'10px'}>Rooms</Typography>
                                        </Stack> 
                                    </Grid>
                                    <Grid className={'sidebar-button-sub-button'} style={{ '--primary-dark': theme.palette.primary.dark, background: nav.page == 'types' ? theme.palette.primary.dark : null }} onClick={() => handleManuClick('Types')}>
                                        <Stack direction={'row'} className={'sub-button'}>
                                            <FormatColorFillOutlinedIcon className={'sub-button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                            <Typography variant="body1" className={'sub-button-text'} color={theme.palette.primary.text.main}  paddingLeft={'10px'}>Meeting types</Typography>
                                        </Stack>
                                    </Grid>
                                    <Grid className={'sidebar-button-sub-button'} style={{ '--primary-dark': theme.palette.primary.dark, background: nav.page == 'users' ? theme.palette.primary.dark : null }} onClick={() => handleManuClick('Users')}>
                                        <Stack direction={'row'} className={'sub-button'}>
                                            <PeopleAltOutlinedIcon className={'sub-button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                            <Typography variant="body1" className={'sub-button-text'} color={theme.palette.primary.text.main}  paddingLeft={'10px'}>Users</Typography>
                                        </Stack>
                                    </Grid>
                                    <Grid className={'sidebar-button-sub-button'} style={{ '--primary-dark': theme.palette.primary.dark, background: nav.page == 'resources' ? theme.palette.primary.dark : null }} onClick={() => handleManuClick('Resources')}>
                                        <Stack direction={'row'} className={'sub-button'}>
                                            <AllInboxOutlinedIcon className={'sub-button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                            <Typography variant="body1" className={'sub-button-text'} color={theme.palette.primary.text.main}  paddingLeft={'10px'}>Resources</Typography>
                                        </Stack>   
                                    </Grid>
                                    <Grid className={'sidebar-button-sub-button'} style={{ '--primary-dark': theme.palette.primary.dark, background: nav.page == 'blocked' ? theme.palette.primary.dark : null }} onClick={() => handleManuClick('Blocked dates')}>
                                        <Stack direction={'row'} className={'sub-button'}>
                                            <EditCalendarOutlinedIcon className={'sub-button-icon'} sx={{color:theme.palette.secondary.light}}/>
                                            <Typography variant="body1" className={'sub-button-text'} color={theme.palette.primary.text.main}  paddingLeft={'10px'}>Blocked dates</Typography>
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </Collapse>
                            </>
                        )
                        }
                    </Grid>
                </Grid>  
                <Grid item backgroundColor={theme.palette.background.fill.dark.secondary} borderTop={'1px solid rgb(41, 41, 41)'} paddingTop={'8px'} paddingBottom={'8px'}>
                    <Stack direction={'row'} justifyContent={'space-between'} sx={{marginLeft:'5px'}}>
                        <Typography variant="caption" sx={{alignContent:'center', color:theme.palette.primary.text.main}}>{user?.first_name} {user?.last_name}</Typography>
                        <Grid paddingRight={'5px'}>
                            <Tooltip title="Log Out" arrow
                                componentsProps={{
                                    tooltip: {
                                        sx: {
                                            bgcolor: theme.palette.primary.dark, // Custom background color
                                            color: theme.palette.primary.text.main, // Custom text color
                                            fontSize: '1rem', // Larger text
                                            padding: '10px', // Custom padding
                                        },
                                    },
                                        arrow: {
                                            sx: {
                                                color: theme.palette.primary.dark, // Custom arrow color
                                            },
                                        },
                                }}
                            >
                                <LogoutOutlinedIcon 
                                    className="logout-button" 
                                    sx={{color:theme.palette.secondary.light, ':hover':{color:theme.palette.primary.text.main}}}
                                    onClick={handleLogout}
                                />
                            </Tooltip>
                        </Grid>
                        
                        
                    </Stack>
                </Grid>
            </Stack>
            
        </Grid>
    );
};

export default SideBar;