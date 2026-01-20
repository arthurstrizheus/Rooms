import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../Utilites/AuthContext";
import { showError } from "../Utilites/Functions/ApiFunctions";

const SocketContext = createContext();

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const { user, isAuthenticated, logout } = useAuth();

    // Function to check if token is expired
    const isTokenExpired = (token) => {
        if (!token) return true;

        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const currentTime = Date.now() / 1000;
            return payload.exp < currentTime;
        } catch (error) {
            console.error("Error parsing token:", error);
            return true;
        }
    };

    const connectSocket = (token) => {
        console.log(
            "Attempting to connect socket with token:",
            token ? "Token present" : "No token"
        );

        // Check if token is expired before connecting
        if (!token || isTokenExpired(token)) {
            console.warn(
                "🔴 Cannot connect socket - token is expired or missing"
            );
            showError("Your session has expired. Please log in again.");
            logout();
            return null;
        }

        if (socket) {
            console.log("Disconnecting existing socket");
            socket.disconnect();
        }

        // More robust environment detection
        const hostname = window.location.hostname;
        const port = window.location.port;
        const protocol = window.location.protocol;
        const fullHost = window.location.host;

        // Check if we're in production
        const isProduction = hostname === "equiptment.sealimited.com";

        console.log("Is Production:", isProduction);

        let serverUrl;
        if (isProduction) {
            // Production: use same origin as frontend
            serverUrl = `${protocol}//${fullHost}`;
            console.log("🌐 Using production server URL (same origin)");
        } else {
            // Development: use localhost backend
            serverUrl =
                process.env.REACT_APP_SERVER_URL || "http://localhost:5000";
            console.log("🏠 Using development server URL");
        }

        const newSocket = io(serverUrl, {
            auth: {
                token: token,
            },
            transports: ["polling", "websocket"], // Try polling first
            timeout: 20000,
            forceNew: true,
            withCredentials: true,
        });

        newSocket.on("connect", () => {
            setConnected(true);
        });

        newSocket.on("disconnect", (reason) => {
            console.log("❌ Socket disconnected:", reason);
            setConnected(false);
        });

        newSocket.on("connect_error", (error) => {
            console.error("🔴 Socket connection error:", error);
            setConnected(false);

            // Check if error is due to authentication/token expiration
            if (
                error.message &&
                (error.message.includes("jwt expired") ||
                    error.message.includes("invalid token") ||
                    error.message.includes("Authentication failed"))
            ) {
                console.warn(
                    "🔴 Socket authentication failed - token likely expired"
                );
                showError("Your session has expired. Please log in again.");
                logout();
                return;
            }

            // If websocket fails, try polling
            if (error.message?.includes("websocket")) {
                console.log("🔄 Retrying with polling transport only...");
                newSocket.io.opts.transports = ["polling"];
            }
        });

        // Listen for forced logout messages
        newSocket.on("force_logout", (data) => {
            console.warn("🚪 Reason:", data?.reason || "Admin action");

            // Show notification to user (optional)
            if (data?.reason) {
                showError(
                    `You have been logged out: ${data.reason || "Admin action"}`
                );
            }

            // Perform logout
            logout();
            disconnectSocket();

            // Redirect to login page (optional)
            window.location.href = "/login";
        });

        // Listen for token expiration messages from server
        newSocket.on("token_expired", () => {
            console.warn("🔴 Server reported token expired");
            showError("Your session has expired. Please log in again.");
            logout();
            disconnectSocket();
        });

        newSocket.on("message", (data) => {
            console.log("📨 Received message:", data);
            // Handle other incoming messages here
        });

        setSocket(newSocket);
        return newSocket;
    };

    const disconnectSocket = () => {
        if (socket) {
            console.log("🔌 Disconnecting socket");
            socket.disconnect();
            setSocket(null);
            setConnected(false);
        }
    };

    // Auto-connect when user is authenticated and we have a token
    useEffect(() => {
        const token = localStorage.getItem("authToken");

        if (isAuthenticated && user && token && !socket) {
            // Check token expiration before connecting
            if (isTokenExpired(token)) {
                console.warn("🔴 Token is expired during auto-connect");
                showError("Your session has expired. Please log in again.");
                logout();
                return;
            }
            connectSocket(token);
        } else if (!isAuthenticated && socket) {
            console.log("🔌 Disconnecting socket - user not authenticated");
            disconnectSocket();
        }

        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [isAuthenticated, user, socket]);

    const value = {
        socket,
        connected,
        connectSocket,
        disconnectSocket,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
