import React from "react";
import { Box } from "@mui/material";

const MeatRain = () => {
    return (
        <Box
            sx={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                pointerEvents: "none",
                zIndex: 9999,
                overflow: "hidden",
            }}
        >
            {[...Array(50)].map((_, i) => (
                <Box
                    key={i}
                    sx={{
                        position: "absolute",
                        top: -50,
                        left: `${Math.random() * 100}%`,
                        fontSize: `${20 + Math.random() * 30}px`,
                        animation: `meatFall ${2 + Math.random() * 3}s linear infinite`,
                        animationDelay: `${Math.random() * 5}s`,
                        opacity: 0.8,
                        "@keyframes meatFall": {
                            "0%": {
                                transform: `translateY(0) rotate(0deg)`,
                                opacity: 0,
                            },
                            "10%": {
                                opacity: 0.8,
                            },
                            "90%": {
                                opacity: 0.8,
                            },
                            "100%": {
                                transform: `translateY(100vh) rotate(${
                                    360 + Math.random() * 360
                                }deg)`,
                                opacity: 0,
                            },
                        },
                    }}
                >
                    {["🥩", "🍖", "🥓"][Math.floor(Math.random() * 3)]}
                </Box>
            ))}
        </Box>
    );
};

export default MeatRain;
