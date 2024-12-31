import { useState, useEffect, useRef } from "react";
import { useTheme } from "@emotion/react";
import { Box } from "@mui/material";

const HorizontalScrollBar = ({
  hoursScrollRef,
  Cref2,
  scrollBarRef,
  Cref,
  roomsWidth,
}) => {
  const theme = useTheme();

  // Drag / handle state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [handlePosition, setHandlePosition] = useState(0);

  // Measurements for ratio-based scroll
  const [scrollbarTrackWidth, setScrollbarTrackWidth] = useState(0);
  const [scrollableWidth, setScrollableWidth] = useState(0);

  const HANDLE_WIDTH = 52;

  // For dynamic ticks
  const TICK_COUNT = 10;
  const TICK_SPACING = 45;

  // Reference to the handle Box, so we can detect clicks on it
  const handleRef = useRef(null);

  // -----------------------------
  // 1) MEASURE TRACK & CONTENT
  // -----------------------------
  const measure = () => {
    if (scrollBarRef.current) {
      setScrollbarTrackWidth(scrollBarRef.current.offsetWidth);
    }
    if (hoursScrollRef.current) {
      const totalScrollWidth = hoursScrollRef.current.scrollWidth || 0;
      const visibleWidth = hoursScrollRef.current.clientWidth || 0;
      setScrollableWidth(Math.max(0, totalScrollWidth - visibleWidth));
    }
  };

  // Re-measure whenever roomsWidth changes
  useEffect(() => {
    measure();
  }, [roomsWidth]);

  // -----------------------------
  // 2) DRAG LOGIC
  // -----------------------------
  const handleMouseDown = (e) => {
    setIsDragging(true);
    // Distance between handle’s left edge & click
    const { left } = e.currentTarget.getBoundingClientRect();
    setDragOffset(e.clientX - left);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollBarRef.current) return;
    const { left: scrollBarLeft } =
      scrollBarRef.current.getBoundingClientRect();

    // New position = mouseX - trackLeft - offset in handle
    let newPos = e.clientX - scrollBarLeft - dragOffset;
    const maxHandlePos = scrollbarTrackWidth - HANDLE_WIDTH;
    newPos = Math.max(0, Math.min(newPos, maxHandlePos));

    setHandlePosition(newPos);
    scrollContentByHandle(newPos, maxHandlePos);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Attach/Detach events while dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // -----------------------------
  // 3) CLICK TRACK TO JUMP HANDLE
  // -----------------------------
  const handleTrackClick = (e) => {
    // If the user clicked on the handle itself, skip
    if (handleRef.current && handleRef.current.contains(e.target)) {
      return;
    }
    if (!scrollBarRef.current) return;

    const trackRect = scrollBarRef.current.getBoundingClientRect();
    // Center handle under cursor:
    let newPos = e.clientX - trackRect.left - HANDLE_WIDTH / 2;
    const maxHandlePos = scrollbarTrackWidth - HANDLE_WIDTH;
    newPos = Math.max(0, Math.min(newPos, maxHandlePos));

    setHandlePosition(newPos);
    scrollContentByHandle(newPos, maxHandlePos);
  };

  // -----------------------------
  // 4) HANDLE → SCROLL SYNC
  // -----------------------------
  const scrollContentByHandle = (pos, maxPos) => {
    if (scrollableWidth <= 0) return;
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

  // -----------------------------
  // 5) SCROLL → HANDLE SYNC
  // -----------------------------
  const syncHandleWithScroll = () => {
    if (!hoursScrollRef.current || scrollableWidth <= 0) return;
    const scrollLeft = hoursScrollRef.current.scrollLeft;
    const maxHandlePos = scrollbarTrackWidth - HANDLE_WIDTH;
    const ratio = scrollLeft / scrollableWidth;
    setHandlePosition(ratio * maxHandlePos);
  };

  useEffect(() => {
    const el = hoursScrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", syncHandleWithScroll);
    return () => el.removeEventListener("scroll", syncHandleWithScroll);
  }, [scrollableWidth, scrollbarTrackWidth]);

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <Box
      ref={scrollBarRef}
      onClick={handleTrackClick}
      sx={{
        position: "relative",
        height: "25px",
        marginLeft: "320px",
        width: roomsWidth - 300 + 410, // or use calc(...) if needed
        overflow: "hidden",
      }}
    >
      {/* Dynamically created ticks using theme colors */}
      {[...Array(TICK_COUNT)].map((_, i) => (
        <Box
          key={i}
          sx={{
            position: "absolute",
            left: `${5 + i * TICK_SPACING}px`,
            marginTop: "5px",
            width: "40px",
            height: "60%",
            background: theme.palette.background.fill.light.main,
          }}
        />
      ))}

      {/* Draggable handle */}
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
        {/* Inner bar */}
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
