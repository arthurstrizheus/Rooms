import { useEffect, useState } from 'react';
import { addDays, subDays, format, startOfWeek, endOfWeek, endOfMonth, startOfMonth } from 'date-fns';
import { useTheme } from '@emotion/react';
import { useLocation } from 'react-router-dom';
import { Typography, Box, IconButton, Collapse } from "@mui/material";
import DaySelector from './DayComponent';
import WeekPicker from './WeekPicker';
import MonthSelector from './MonthSelector';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIosOutlined';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIosOutlined';

const DateSelector = ({ selectedDate, setSelectedDate }) => {
    const [open, setOpen] = useState(false);
    const theme = useTheme();
    const location = useLocation();
    const [type, setType] = useState('day');
    // Calculate the start and end of the week for the selected date
    const [weekStart, setWeekStart] = useState(startOfWeek(selectedDate, { weekStartsOn: 1 })); // Monday
    const [weekEnd, setWeekEnd] = useState(endOfWeek(selectedDate, { weekStartsOn: 1 })); // Saturday

    useEffect(() => {
        // Determine if we're showing day or week view based on the URL
        setType(location.pathname.split("/").pop());
    }, [location]);

    useEffect(() => {
        setWeekStart(startOfWeek(selectedDate, { weekStartsOn: 1 }));
        setWeekEnd(endOfWeek(selectedDate, { weekStartsOn: 1 }));
    },[selectedDate]);

    const toggleOpen = () => {
        setOpen(!open);
    };

    const handlePrevDay = () => {
        if(type === 'week'){
            setSelectedDate(() => subDays(weekStart, 1));
        }else if(type === 'day'){
            setSelectedDate((prevDate) => subDays(prevDate, 1));
        }else if(type === 'month'){
            setSelectedDate((prevDate) => subDays(startOfMonth(prevDate), 1));
        }
    };

    const handleNextDay = () => {
        if(type === 'week'){
            setSelectedDate(() => addDays(weekEnd, 1));
        }else if(type === 'day'){
            setSelectedDate((prevDate) => addDays(prevDate, 1));
        }else if(type === 'month'){
            setSelectedDate((prevDate) => addDays(endOfMonth(prevDate), 1));
        }
    };

    

    return (
        <Box sx={{ textAlign: 'center', minWidth: '430px', padding: '10px', borderRadius: '8px', width: 'fit-content', marginBottom: '10px', background: theme.palette.background.fill.light.main }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center',}}>
                <IconButton onClick={handlePrevDay}>
                    <ArrowBackIosIcon />
                </IconButton>
                <Typography variant="h4" sx={{ margin: '0 8px', fontFamily: 'Courier New, sans-serif',cursor: 'pointer'  }} onClick={toggleOpen}>
                    {type === 'day' && 
                        // Display the day in a readable format
                        selectedDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                    } 
                    {type === 'week' &&
                        // Display the week start and end dates in a readable format
                        `${format(weekStart, 'dd')} - ${format(weekEnd, 'dd MMM, yyyy')}`
                    }
                    {type === 'month' &&
                        // Display the month and year
                        selectedDate.toLocaleDateString('en-GB', {month: 'long', year: 'numeric' })
                    } 
                </Typography>
                <IconButton onClick={handleNextDay}>
                    <ArrowForwardIosIcon />
                </IconButton>
            </Box>
            <Collapse in={open}>
                {type === 'day' && (
                    <DaySelector selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
                )}
                {type === 'week' && (
                    <WeekPicker selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
                )}
                {type === 'month' && (
                    <MonthSelector selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
                )}
            </Collapse>
        </Box>
    );
};

export default DateSelector;
