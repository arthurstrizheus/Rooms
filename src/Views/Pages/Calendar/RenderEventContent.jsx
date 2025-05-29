import { Box, Typography } from "@mui/material";

function RenderEventContent(arg) {
  const { view, event } = arg;
  const roomName = event.extendedProps.roomName;
  const title = event.title;

  // 1) MONTH (dayGrid) — block, ellipsis in two lines
  if (view.type === "dayGridMonth") {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          px: 0.5,
          py: 0.25,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="body2"
          noWrap
          sx={{
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          noWrap
          sx={{
            lineHeight: 1.1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "text.secondary",
          }}
        >
          {roomName}
        </Typography>
      </Box>
    );
  }

  // 2) TIME-GRID (day/week) — similar, but you might want a little more padding
  if (view.type === "timeGridDay" || view.type === "timeGridWeek") {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Typography variant="body2">{title}</Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {roomName}
        </Typography>
      </Box>
    );
  }

  // 3) LIST views — lay it out in a single row, flex-grow on the title
  if (view.type.startsWith("list")) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          width: "100%",
        }}
      >
        <Typography
          variant="body2"
          noWrap
          sx={{
            flex: "1 1 auto",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          noWrap
          sx={{
            ml: 1,
            flex: "0 0 auto",
            color: "text.secondary",
          }}
        >
          {roomName}
        </Typography>
      </Box>
    );
  }

  // 4) fallback for any other view
  return (
    <Box>
      <Typography variant="body2">{title}</Typography>
    </Box>
  );
}

export default RenderEventContent;
