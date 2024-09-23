import { useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../Utilites/AuthContext';
import LogIn from '../Views/Pages/Login/Login';
import SignUp from '../Views/Pages/Login/Components/Signup';
import DaySchedulePage from '../Views/Pages/Daily/index';
import WeekSchedulePage from '../Views/Pages/Weekly';
import MonthSchedulePage from '../Views/Pages/Monthly';
import MyBookings from '../Views/Pages/MyBookings/MyBookings';
import MyAccount from '../Views/Pages/MyAccount/MyAccount';
import Locations from '../Views/Pages/Locations/Locations';
import Rooms from '../Views/Pages/Rooms/Rooms';
import MeetingTypes from '../Views/Pages/MeetingTypes/MeetingTypes';
import ApprovalQueue from '../Views/Pages/ApprovalQueue/ApprovalQueue';
import Users from '../Views/Pages/Users/Users';
import Groups from '../Views/Pages/Groups/Groups';
import RoomResources from '../Views/Pages/Resources/RoomResources';
import Resources from '../Views/Pages/Resources/Resources';
import BlockedDates from '../Views/Pages/BlockedDates/BlockedDates';

const AppRoutes = ({ setLoading, selectedDate, setSelectedDate, setBannerText, loading }) => {

    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        // Determine the banner text based on the current path
        if(!isAuthenticated && (location.pathname != '/login' && location.pathname != '/signup')){
            navigate('/login');
        }
        const path = location.pathname;
        let newBannerText = '';
        if (path === '/') {
            newBannerText = 'Day Schedule';
        } else if (path.startsWith('/schedule/type/day')) {
            newBannerText = `Day Schedule`;
        } else if (path.startsWith('/schedule/type/week')) {
            newBannerText = `Week Schedule`;
        }else if (path.startsWith('/schedule/type/month')) {
            newBannerText = `Month Schedule`;
        }else if (path.startsWith('/book')) {
            newBannerText = `My Bookings`;
        }else if (path.startsWith('/search')) {
            newBannerText = `Search for a room`;
        }else if (path.startsWith('/approve')) {
            newBannerText = `Approval Queue`;
        }else if (path.startsWith('/report')) {
            newBannerText = `Reports`;
        }else if (path.startsWith('/account')) {
            newBannerText = `My Account`;
        }else if (path.startsWith('/settings')) {
            newBannerText = `Settings`;
        }else if (path.startsWith('/branding')) {
            newBannerText = `Branding`;
        }else if (path.startsWith('/manage/locations')) {
            newBannerText = `Locations`;
        }else if (path.startsWith('/manage/rooms/resources')) {
            newBannerText = `Resources`;
        }else if (path.startsWith('/manage/rooms')) {
            newBannerText = `Rooms`;
        }else if (path.startsWith('/manage/types')) {
            newBannerText = `Meeting Types`;
        }else if (path.startsWith('/manage/users')) {
            newBannerText = `Users`;
        }else if (path.startsWith('/manage/groups')) {
            newBannerText = `Groups`;
        }else if (path.startsWith('/manage/resources')) {
            newBannerText = `Resources`;
        }else if (path.startsWith('/manage/blockeddates')) {
            newBannerText = `Blocked Dates`;
        }
        // Update the banner text in the parent component
        setBannerText(newBannerText);
    }, [location, setBannerText]);

    return (
        <Routes>
            <Route 
                path="/login" 
                exact 
                element={<LogIn setLoading={setLoading} />} 
            />
            <Route 
                path="/" 
                exact 
                element={<LogIn setLoading={setLoading} />} 
            />
            <Route
                path="/signup"
                exact
                element={<SignUp setLoading={setLoading} />}
            />
            <Route 
                path="/schedule/type/day" 
                element={
                    <DaySchedulePage 
                        setLoading={setLoading} 
                        selectedDate={selectedDate} 
                        setSelectedDate={setSelectedDate}
                        loading={loading}
                    />
                } 
            />
            <Route 
                path="/schedule/type/week" 
                element={
                    <WeekSchedulePage 
                        setLoading={setLoading} 
                        selectedDate={selectedDate} 
                        setSelectedDate={setSelectedDate}
                        loading={loading}
                    />
                } 
            />
            <Route 
                path="/schedule/type/month" 
                element={
                    <MonthSchedulePage 
                        setLoading={setLoading} 
                        selectedDate={selectedDate} 
                        setSelectedDate={setSelectedDate}
                        loading={loading}
                    />
                } 
            />
            <Route 
                path="/book" 
                element={
                    <MyBookings
                        setLoading={setLoading}
                        loading={loading}
                    />
                } 
            />
            <Route 
                path="/account" 
                element={
                    <MyAccount
                        setLoading={setLoading}
                        loading={loading}
                    />
                } 
            />
            <Route 
                path="/manage/locations" 
                element={
                    <Locations
                        setLoading={setLoading}
                        loading={loading}
                    />
                } 
            />
            <Route 
                path="/manage/rooms" 
                element={
                    <Rooms
                        setLoading={setLoading}
                        loading={loading}
                    />
                } 
            />
            <Route 
                path="/manage/types" 
                element={
                    <MeetingTypes
                        setLoading={setLoading}
                        loading={loading}
                    />
                } 
            />
            <Route 
                path="/approve" 
                element={
                    <ApprovalQueue
                        setLoading={setLoading}
                        loading={loading}
                    />
                } 
            />
            <Route 
                path="/manage/users" 
                element={
                    <Users
                        setLoading={setLoading}
                        loading={loading}
                    />
                } 
            />
            <Route 
                path="/manage/groups" 
                element={
                    <Groups
                        setLoading={setLoading}
                        loading={loading}
                    />
                } 
            />
            <Route 
                path="/manage/rooms/resources" 
                element={
                    <RoomResources
                        setLoading={setLoading}
                        loading={loading}
                    />
                } 
            />
            <Route 
                path="/manage/resources" 
                element={
                    <Resources
                        setLoading={setLoading}
                        loading={loading}
                    />
                } 
            />
            <Route 
                path="/manage/blockeddates" 
                element={
                    <BlockedDates
                        setLoading={setLoading}
                        loading={loading}
                    />
                } 
            />
        </Routes>
    );
};

export default AppRoutes;
