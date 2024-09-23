import { useEffect } from 'react';

const useSyncScrollHorizontal = (sourceRef, targetRef) => {
    useEffect(() => {
        const syncScroll = () => {
            if (targetRef.current) {
                targetRef.current.scrollLeft = sourceRef.current.scrollLeft;
            }
        };

        const sourceElement = sourceRef.current;
        if (sourceElement) {
            sourceElement.addEventListener('scroll', syncScroll);
        }

        return () => {
            if (sourceElement) {
                sourceElement.removeEventListener('scroll', syncScroll);
            }
        };
    }, [sourceRef, targetRef]);
};

export default useSyncScrollHorizontal;
