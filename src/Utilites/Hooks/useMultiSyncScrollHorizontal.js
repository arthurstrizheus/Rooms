// useMultiSyncScrollHorizontal.js
import { useEffect, useRef } from "react";

const useMultiSyncScrollHorizontal = (refs, masterRef) => {
    const isScrollingRef = useRef(false);

    useEffect(() => {
        const syncScroll = (source, targets) => {
            const handleScroll = () => {
                if (isScrollingRef.current) return; // Prevent concurrent updates

                isScrollingRef.current = true;

                const sourceScrollLeft = source.current.scrollLeft;

                targets.forEach(target => {
                    if (target && target.current && target.current.scrollLeft !== sourceScrollLeft) {
                        target.current.scrollLeft = sourceScrollLeft;
                    }
                });

                isScrollingRef.current = false;
            };

            if (source && source.current) {
                source.current.addEventListener("scroll", handleScroll);
            }

            return () => {
                if (source && source.current) {
                    source.current.removeEventListener("scroll", handleScroll);
                }
            };
        };

        if (masterRef && refs.length > 0) {
            const removeHandlers = refs?.map(ref => syncScroll(ref, [masterRef, ...refs.filter(r => r !== ref)]));

            return () => {
                removeHandlers.forEach(remove => remove());
            };
        }
    }, [refs, masterRef]);
};

export default useMultiSyncScrollHorizontal;
