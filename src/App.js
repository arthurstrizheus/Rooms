import { useLocation, useNavigate } from 'react-router-dom';
import theme from "./Utilites/theme";
import { useEffect, useState } from "react";
import { useAuth } from './/Utilites/AuthContext';
import { ThemeProvider } from '@emotion/react';
import { SnackbarProvider } from './Utilites/SnackbarContext';
import { Stack } from '@mui/material';
import SideBar from './Views/Components/SideBar/SideBar';
import Banner from './Views/Components/Banner/Banner';
import AppRoutes from './Routes/Routes'

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function App() {

  const [mode, setMode] = useState('light');
  const [bannerText, setBannerText] = useState("Month Schedule")
  const [loading, setLoading] = useState(false);
  const [update, setUpdate] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { isAuthenticated, setUser, login, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    delay(120000).then(() => setUpdate(prev => prev + 1));
  },[update]);

  // I DONT LIKE HOW THIS WORKS. I need a better way to page authentication
  useEffect(() => {
    if(!isAuthenticated && (location.pathname != '/login' && location.pathname != '/signup')){
      localStorage.setItem('lastLocation', location.pathname);
      navigate('/login');
    }else if(location.pathname == ''){
      const user = JSON.parse(storedUser);
      // Restore the user's session
      setUser(user);
      login(user); 
      navigate('/schedule/type/day');
    }

    const storedUser = localStorage.getItem('user');
    if ((JSON.parse(storedUser)?.id && !user) || (JSON.parse(storedUser)?.id === user?.id && isAuthenticated == false && user?.id !== null && user?.id !== undefined)) {
        const user = JSON.parse(storedUser);
        // Restore the user's session
        setUser(user);
        login(user);  
        if(localStorage.getItem('lastLocation') === '/'){
          navigate('/schedule/type/day');
        }else{
          navigate(localStorage.getItem('lastLocation'));
        }  
    }
  },[isAuthenticated, user]);


  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="Rooms">
      <ThemeProvider theme={theme(mode)}>
        <SnackbarProvider>
        {isAuthenticated && (
          <Stack direction={'row'} height={'100vh'}>
            <SideBar setBannerText={setBannerText} bannerText={bannerText}/>
            <Stack direction={'column'} height={'100%'} width={'100%'}>
              <Banner bannerText={bannerText} loading={loading} selectedDate={selectedDate} setSelectedDate={setSelectedDate}/>
              <AppRoutes setLoading={setLoading} setBannerText={setBannerText} selectedDate={selectedDate} setSelectedDate={setSelectedDate} loading={loading}/>
          </Stack>
        </Stack>
        )}
        {!isAuthenticated && (
          <Stack direction={'column'} height={'100%'} width={'100%'}>
              <AppRoutes setLoading={setLoading} setBannerText={setBannerText} selectedDate={selectedDate} setSelectedDate={setSelectedDate} loading={loading}/>
          </Stack>
        )}
        </SnackbarProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
