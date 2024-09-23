import { useState, useEffect } from 'react';
import { useTheme } from '@emotion/react';
import {Box} from "@mui/material";


const HorizontalScrollBar = ({ hoursScrollRef, Cref2, scrollBarRef, Cref }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [boxPosition, setBoxPosition] = useState(0);
    const theme = useTheme();

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.clientX - boxPosition);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const newBoxPosition = e.clientX - startX;
        const maxPosition = scrollBarRef.current.offsetWidth - 52; // Width of the box
        const constrainedPosition = Math.max(0, Math.min(maxPosition, newBoxPosition));
        setBoxPosition(constrainedPosition);

        if (hoursScrollRef.current) {
            hoursScrollRef.current.scrollLeft = constrainedPosition;
        }
        if (Cref.current) {
            Cref.current.scrollLeft = constrainedPosition;
        }
        if (Cref2.current?.length) {
            Cref2.current.forEach(ref => {
                if (ref) {
                    ref.scrollLeft = constrainedPosition;
                }
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <Box
            ref={scrollBarRef}
            sx={{
                marginLeft: '320px',
                width: '410px',
                overflowX: 'hidden',
                position: 'relative',
                height: '25px'
            }}
            flexDirection={'row'}
        >
            <Box sx={{marginTop:'5px', marginLeft:'5px', width: '40px', height: '60%', position: 'absolute', background:theme.palette.background.fill.light.dark}}/>
            <Box sx={{marginTop:'5px', marginLeft:'50px', width: '40px', height: '60%', position: 'absolute', background:theme.palette.background.fill.light.dark}}/>
            <Box sx={{marginTop:'5px', marginLeft:'95px', width: '40px', height: '60%',  position: 'absolute', background:theme.palette.background.fill.light.dark}}/>
            <Box sx={{marginTop:'5px', marginLeft:'140px', width: '40px', height: '60%', position: 'absolute', background:theme.palette.background.fill.light.dark}}/>
            <Box sx={{marginTop:'5px', marginLeft:'185px', width: '40px', height: '60%', position: 'absolute', background:theme.palette.background.fill.light.dark}}/>
            <Box sx={{marginTop:'5px', marginLeft:'230px', width: '40px', height: '60%', position: 'absolute', background:theme.palette.background.fill.light.dark}}/>
            <Box sx={{marginTop:'5px', marginLeft:'275px', width: '40px', height: '60%', position: 'absolute', background:theme.palette.background.fill.light.dark}}/>
            <Box sx={{marginTop:'5px', marginLeft:'320px', width: '40px', height: '60%', position: 'absolute', background:theme.palette.background.fill.light.dark}}/>
            <Box sx={{marginTop:'5px', marginLeft:'365px', width: '40px', height: '60%', position: 'absolute', background:theme.palette.background.fill.light.dark}}/>
            <Box
                sx={{
                    width: '50px',
                    height: '90%',
                    border:`1px solid ${theme.palette.border.light}`,
                    position: 'absolute',
                    left: `${boxPosition}px`,
                    cursor: isDragging ? 'grabbing' : 'grab'
                }}
                onMouseDown={handleMouseDown}
            >
                <Box sx={{marginLeft:'5px', marginRight:'5px' ,marginTop:'4px',height:'15px', background: 'rgba(236,65,81,.4)',}}/>
            </Box>
        </Box>
    );
};

export default HorizontalScrollBar;
