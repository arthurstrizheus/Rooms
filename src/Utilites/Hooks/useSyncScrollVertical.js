import { useEffect, useState } from 'react';

const useSyncScrollVertical = (sourceRef, targetRef) => {
    const [shiftKey, setShiftKey] = useState(false);
    const [leftMouse, setLeftMouse] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Shift') {
                setShiftKey(true);
            }
        };

        const handleKeyUp = (event) => {
            if (event.key === 'Shift') {
                setShiftKey(false);
            }
        };

        const handleMouseDown = (event) => {
            if (event.button === 0) {
                setLeftMouse(true);
            }
        };

        const handleMouseUp = (event) => {
            if (event.button === 0) {
                setLeftMouse(false);
            }
        };

        const handleScroll = () => {
            if (targetRef.current && !shiftKey && !leftMouse) {
                targetRef.current.scrollTop = sourceRef.current.scrollTop;
            }
        };

        const handleWheel = (event) => {
            if (shiftKey || leftMouse) {
                event.preventDefault();
                return;
            }
        };

        if (sourceRef.current) {
            sourceRef.current.addEventListener('scroll', handleScroll);
            sourceRef.current.addEventListener('wheel', handleWheel);
        }

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            if (sourceRef.current) {
                sourceRef.current.removeEventListener('scroll', handleScroll);
                sourceRef.current.removeEventListener('wheel', handleWheel);
            }

            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [sourceRef, targetRef, shiftKey, leftMouse]);
};

export default useSyncScrollVertical;
