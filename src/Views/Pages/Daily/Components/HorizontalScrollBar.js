import { useState, useEffect, useRef } from "react";
import { useTheme } from "@emotion/react";
import { Box } from "@mui/material";

const HorizontalScrollBar = ({ hoursScrollRef, Cref2, scrollBarRef, Cref }) => {
  const theme = useTheme();

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [handlePosition, setHandlePosition] = useState(0);
  const [scrollbarTrackWidth, setScrollbarTrackWidth] = useState(0);
  const [scrollableWidth, setScrollableWidth] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);

  const HANDLE_WIDTH = 52;
  const TICK_SPACING = 45;
  const TICK_COUNT = Math.ceil((trackWidth - 5) / TICK_SPACING);
  const handleRef = useRef(null);

  // Update track width dynamically
  useEffect(() => {
    const updateTrackWidth = () => {
      if (hoursScrollRef.current) {
        setTrackWidth(hoursScrollRef.current.clientWidth);
      }
    };
    updateTrackWidth();
    window.addEventListener("resize", updateTrackWidth);
    return () => window.removeEventListener("resize", updateTrackWidth);
  }, [hoursScrollRef]);

  // Measure scrollable width and track width
  const measure = () => {
    setScrollbarTrackWidth(trackWidth);
    if (hoursScrollRef.current) {
      const totalScrollWidth = hoursScrollRef.current.scrollWidth || 0;
      const visibleWidth = hoursScrollRef.current.clientWidth || 0;
      setScrollableWidth(Math.max(0, totalScrollWidth - visibleWidth));
    }
  };

  useEffect(() => {
    measure();
  }, [trackWidth]);

  // Handle dragging
  const handleMouseDown = (e) => {
    setIsDragging(true);
    const { left } = e.currentTarget.getBoundingClientRect();
    setDragOffset(e.clientX - left);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollBarRef.current) return;
    const { left: scrollBarLeft } =
      scrollBarRef.current.getBoundingClientRect();
    const maxHandlePos = Math.max(0, scrollbarTrackWidth - HANDLE_WIDTH);
    let newPos = e.clientX - scrollBarLeft - dragOffset;
    newPos = Math.max(0, Math.min(newPos, maxHandlePos));
    setHandlePosition(newPos);
    scrollContentByHandle(newPos, maxHandlePos);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, scrollbarTrackWidth, scrollableWidth]);

  useEffect(() => {
    const updateDimensions = () => {
      if (hoursScrollRef.current) {
        const newTrackWidth = hoursScrollRef.current.clientWidth;
        const totalScrollWidth = hoursScrollRef.current.scrollWidth || 0;
        const visibleWidth = hoursScrollRef.current.clientWidth || 0;
        setTrackWidth(newTrackWidth);
        setScrollableWidth(Math.max(0, totalScrollWidth - visibleWidth));
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [hoursScrollRef]);

  useEffect(() => {
    const syncHandleWithScroll = () => {
      if (!hoursScrollRef.current || scrollableWidth <= 0) {
        setHandlePosition(0);
        return;
      }
      const scrollLeft = hoursScrollRef.current.scrollLeft;
      const maxHandlePos = Math.max(0, trackWidth - HANDLE_WIDTH);
      const ratio = scrollLeft / scrollableWidth;
      const newHandlePos = ratio * maxHandlePos;
      setHandlePosition(Math.max(0, Math.min(newHandlePos, maxHandlePos)));
    };
    const el = hoursScrollRef.current;
    if (el) {
      el.addEventListener("scroll", syncHandleWithScroll);
      syncHandleWithScroll(); // Initial sync
      return () => el.removeEventListener("scroll", syncHandleWithScroll);
    }
  }, [trackWidth, scrollableWidth, hoursScrollRef]);

  // Handle track click
  const handleTrackClick = (e) => {
    if (handleRef.current && handleRef.current.contains(e.target)) return;
    if (!scrollBarRef.current) return;
    const trackRect = scrollBarRef.current.getBoundingClientRect();
    const maxHandlePos = Math.max(0, scrollbarTrackWidth - HANDLE_WIDTH);
    let newPos = e.clientX - trackRect.left - HANDLE_WIDTH / 2;
    newPos = Math.max(0, Math.min(newPos, maxHandlePos));
    setHandlePosition(newPos);
    scrollContentByHandle(newPos, maxHandlePos);
  };

  // Scroll content based on handle position
  const scrollContentByHandle = (pos, maxPos) => {
    if (scrollableWidth <= 0 || maxPos <= 0) return;
    const ratio = pos / maxPos;
    const scrollLeft = ratio * scrollableWidth;
    if (hoursScrollRef.current) hoursScrollRef.current.scrollLeft = scrollLeft;
    if (Cref?.current) Cref.current.scrollLeft = scrollLeft;
    if (Cref2?.current?.length) {
      Cref2.current.forEach((ref) => {
        if (ref) ref.scrollLeft = scrollLeft;
      });
    }
  };

  // Sync handle with content scroll
  const syncHandleWithScroll = () => {
    if (!hoursScrollRef.current) return;
    if (scrollableWidth <= 0) {
      setHandlePosition(0);
      return;
    }
    const scrollLeft = hoursScrollRef.current.scrollLeft;
    const maxHandlePos = Math.max(0, scrollbarTrackWidth - HANDLE_WIDTH);
    const ratio = scrollLeft / scrollableWidth;
    const newHandlePos = ratio * maxHandlePos;
    setHandlePosition(Math.max(0, Math.min(newHandlePos, maxHandlePos)));
  };

  useEffect(() => {
    const el = hoursScrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", syncHandleWithScroll);
    return () => el.removeEventListener("scroll", syncHandleWithScroll);
  }, [scrollableWidth, scrollbarTrackWidth]);

  return (
    <Box
      ref={scrollBarRef}
      onClick={handleTrackClick}
      sx={{
        position: "relative",
        height: "25px",
        marginLeft: "320px",
        width: trackWidth,
        overflow: "hidden",
      }}
    >
      {[...Array(TICK_COUNT)].map((_, i) => (
        <Box
          key={i}
          sx={{
            position: "absolute",
            left: `${(i / (TICK_COUNT - 1)) * (trackWidth - 40)}px`,
            marginTop: "5px",
            width: "40px",
            height: "60%",
            background: theme.palette.background.fill.light.main,
          }}
        />
      ))}
      <Box
        ref={handleRef}
        sx={{
          position: "absolute",
          left: `${handlePosition}px`,
          width: `${HANDLE_WIDTH}px`,
          height: "90%",
          border: `1px solid ${theme.palette.border.secondary}`,
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
      >
        <Box
          sx={{
            margin: "4px 5px",
            height: "15px",
            background: theme.palette.background.fill.dark.light,
          }}
        />
      </Box>
    </Box>
  );
};

export default HorizontalScrollBar;
