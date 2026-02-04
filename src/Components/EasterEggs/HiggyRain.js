import React from "react";
import { Box } from "@mui/material";
import hig1 from "../../Assets/Images/hig1.png";
import hig2 from "../../Assets/Images/hig2.png";

const HiggyRain = () => {
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
                    component="img"
                    src={[hig1, hig2][Math.floor(Math.random() * 2)]}
                    alt="higgy"
                    sx={{
                        position: "absolute",
                        top: -100,
                        left: `${Math.random() * 100}%`,
                        width: `${40 + Math.random() * 60}px`,
                        height: "auto",
                        animation: `higgyFall ${2 + Math.random() * 3}s linear infinite`,
                        animationDelay: `${Math.random() * 5}s`,
                        opacity: 0.8,
                        "@keyframes higgyFall": {
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
                />
            ))}
        </Box>
    );
};

export default HiggyRain;
