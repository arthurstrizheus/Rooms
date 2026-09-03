import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../Utilites/AuthContext";
import { bottomBarItems } from "./navConfig";

export const BOTTOM_NAV_HEIGHT = 58;

/**
 * Thumb-reachable bottom bar for phones.
 *
 * Only the primary destinations appear here; everything else stays in the
 * drawer. The active item is marked by a pill that slides between tabs, which
 * reads as one continuous element rather than four independent highlights.
 */
export default function BottomNav({ approvalCount = 0 }) {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const items = bottomBarItems(user, { approvalCount });
    if (items.length < 2) return null;

    const activeIndex = items.findIndex((item) => item.match(location.pathname));

    return (
        <Paper
            component="nav"
            aria-label="Primary"
            elevation={0}
            sx={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: (t) => t.zIndex.appBar,
                borderTop: "1px solid",
                borderColor: "divider",
                borderRadius: 0,
                bgcolor: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(14px) saturate(180%)",
                WebkitBackdropFilter: "blur(14px) saturate(180%)",
                pb: "env(safe-area-inset-bottom)",
            }}
        >
            <Box
                sx={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: `repeat(${items.length}, 1fr)`,
                    height: BOTTOM_NAV_HEIGHT,
                }}
            >
                {/* Sliding indicator */}
                {activeIndex >= 0 && (
                    <Box
                        aria-hidden
                        sx={{
                            position: "absolute",
                            top: 6,
                            left: 0,
                            width: `${100 / items.length}%`,
                            height: 3,
                            display: "flex",
                            justifyContent: "center",
                            transform: `translateX(${activeIndex * 100}%)`,
                            transition:
                                "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
                            pointerEvents: "none",
                        }}
                    >
                        <Box
                            sx={{
                                width: 22,
                                height: 3,
                                borderRadius: 2,
                                bgcolor: "primary.main",
                            }}
                        />
                    </Box>
                )}

                {items.map((item, index) => {
                    const Icon = item.icon;
                    const selected = index === activeIndex;
                    const badge =
                        item.badge === "approvals" ? approvalCount : 0;

                    return (
                        <Box
                            key={item.id}
                            component="button"
                            type="button"
                            aria-current={selected ? "page" : undefined}
                            onClick={() => navigate(item.path)}
                            sx={{
                                position: "relative",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 0.25,
                                border: 0,
                                background: "none",
                                font: "inherit",
                                cursor: "pointer",
                                color: selected
                                    ? "primary.main"
                                    : "text.disabled",
                                transition: "color 200ms ease",
                                WebkitTapHighlightColor: "transparent",
                                "&:active .bottom-nav-icon": {
                                    transform: "scale(0.86)",
                                },
                            }}
                        >
                            <Box
                                className="bottom-nav-icon"
                                sx={{
                                    position: "relative",
                                    display: "flex",
                                    transition:
                                        "transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                                    transform: selected
                                        ? "translateY(-1px) scale(1.06)"
                                        : "none",
                                }}
                            >
                                <Icon sx={{ fontSize: 22 }} />
                                {badge > 0 && (
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            top: -4,
                                            right: -8,
                                            minWidth: 16,
                                            height: 16,
                                            px: 0.5,
                                            borderRadius: 4,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "0.625rem",
                                            fontWeight: 700,
                                            color: "common.white",
                                            bgcolor: "primary.main",
                                            border: "2px solid",
                                            borderColor: "background.paper",
                                        }}
                                    >
                                        {badge > 9 ? "9+" : badge}
                                    </Box>
                                )}
                            </Box>
                            <Typography
                                sx={{
                                    fontSize: "0.625rem",
                                    fontWeight: selected ? 700 : 600,
                                    letterSpacing: "0.01em",
                                    lineHeight: 1,
                                }}
                            >
                                {item.shortLabel || item.label}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>
        </Paper>
    );
}
