import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Collapse, Grid, Stack, Tooltip, Typography, Divider, IconButton, Button, Box } from '@mui/material';
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
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import logo from '../../../Assets/Images/sea-logo.png';
import './SideBar.css';
import { useAuth } from '../../../Utilites/AuthContext';

const SideBar = ({ setBannerText, setContent, bannderText }) => {
    const location = useLocation();
    const theme = useTheme();
    const [nav, setNav] = useState({ page: location.pathname.split('/').splice(-1) });
    const { user, setUser, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState({ rooms: true, account: false, manage: false });
    
    const toggleCollapse = (section) => {
        setOpen((prevState) => ({ ...prevState, [section]: !prevState[section] }));
    };

    const handleMenuClick = (menu) => {
        setBannerText(menu);
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
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        if (!rememberMe) {
        localStorage.removeItem('email');
        }
        logout();
        setUser({});
    };

    return (
        <Grid container sx={{ minWidth: 220, backgroundColor: 'white' }}>
        <Stack direction="column" sx={{ width: '100%', height: '100%' }} justifyContent="space-between">
            <Grid container justifyContent="center" alignItems="center" sx={{ padding: 2 }}>
            <img src={logo} alt="Logo" style={{ width: 'auto', height: 100 }} />
            </Grid>
            <Grid item sx={{ textAlign: 'left', paddingLeft:'10px', paddingRight:'10px' }}>
                <MenuItem 
                    title="Rooms" 
                    icon={<MeetingRoomOutlinedIcon />} 
                    isOpen={open.rooms} 
                    onToggle={() => toggleCollapse('rooms')}
                    items={[
                    { name: 'Monthly View', icon: <CalendarMonthIcon />, onClick: () => handleMenuClick('month') },
                    { name: 'Weekly View', icon: <DateRangeIcon />, onClick: () => handleMenuClick('week') },
                    { name: 'Daily View', icon: <TodayIcon />, onClick: () => handleMenuClick('day') },
                    { name: 'My Bookings', icon: <ViewStreamIcon />, onClick: () => handleMenuClick('book') },
                    { name: 'Approval Queue', icon: <PlaylistAddCheckIcon />, onClick: () => handleMenuClick('approve') },
                    ]}
                />
                <Divider />
                <MenuItem 
                    title="Account" 
                    icon={<AccountBoxOutlinedIcon />} 
                    isOpen={open.account} 
                    onToggle={() => toggleCollapse('account')} 
                    items={[
                    { name: 'My Account', icon: <AccountBoxOutlinedIcon />, onClick: () => handleMenuClick('account') },
                    ]}
                />
                {user?.admin && (
                    <>
                    <Divider />
                    <MenuItem 
                        title="Manage" 
                        icon={<SettingsOutlinedIcon />} 
                        isOpen={open.manage} 
                        onToggle={() => toggleCollapse('manage')} 
                        items={[
                        { name: 'Locations', icon: <CorporateFareIcon />, onClick: () => handleMenuClick('locations') },
                        { name: 'Rooms', icon: <MeetingRoomOutlinedIcon />, onClick: () => handleMenuClick('rooms') },
                        { name: 'Users', icon: <PeopleAltOutlinedIcon />, onClick: () => handleMenuClick('users') },
                        ]}
                    />
                    </>
                )}
            </Grid>
            <Grid item sx={{ padding: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color={theme.palette.text.primary}>
                {user?.first_name} {user?.last_name}
                </Typography>
                <Tooltip title="Log Out" arrow>
                <IconButton onClick={handleLogout}>
                    <LogoutOutlinedIcon sx={{ color: theme.palette.error.main }} />
                </IconButton>
                </Tooltip>
            </Stack>
            </Grid>
        </Stack>
        </Grid>
    );
};

const MenuItem = ({ title, icon, onToggle, items }) => {
    const theme = useTheme();
    return (
        <>
        <Grid
            item
            sx={{
                padding: 1,
                cursor: 'default',
                transition: 'background-color 0.3s ease',
            }}
            onClick={onToggle}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" alignItems="center" spacing={2}>
                    {icon}
                    <Typography variant="subtitle1">{title}</Typography>
                </Stack>
            </Stack>
        </Grid >
        <Box sx={{display:'flex', flexDirection:'column', gap:.5}}>
            {items.map((item, index) => (
                    <Button 
                        startIcon={item.icon}
                        fullWidth
                        key={index}
                        sx={{
                            paddingTop: 1.5,
                            paddingBottom: 1.5,
                            paddingLeft:0,
                            paddingLeft: 4,
                            cursor: 'pointer',
                            backgroundColor: theme.palette.background.paper,
                            transition: 'background-color 0.4s ease',
                            '&:hover': {
                                backgroundColor: theme.palette.background.fill.light.light,
                            },
                        }}
                        onClick={item.onClick}
                    >{item.name}</Button>
                ))}
        </Box> 
        </>
    );
    };

export default SideBar;
