import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();
//id: 2, firstName: "Geust", lastName: "User", email: 'geustuser@sealimited.com', admin:true, location:1, password:'123456', group:1, status_group:1
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check for existing session on app load
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("authToken");

        if (storedUser && storedToken) {
            console.log("🔄 Restoring user session from localStorage");
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
        }
    }, []);

    const login = (userData, token) => {
        console.log(
            "🔐 Login called with user:",
            userData?.username,
            "token:",
            token ? "present" : "missing"
        );

        setIsAuthenticated(true);
        setUser(userData);

        // Store user and token in localStorage
        if (userData) {
            localStorage.setItem("user", JSON.stringify(userData));
        }
        if (token) {
            localStorage.setItem("authToken", token);
            console.log("✅ Token stored in localStorage");
        } else {
            console.log("⚠️ No token provided to login function");
        }
    };

    const logout = () => {
        console.log("🚪 Logging out user");
        setIsAuthenticated(false);
        setUser(null);
        const remember = localStorage.getItem("rememberMe");
        if (Boolean(remember)) {
            localStorage.removeItem("user");
            localStorage.removeItem("authToken");
            localStorage.removeItem("lastLocation");
        } else {
            // Clear localStorage
            localStorage.removeItem("user");
            localStorage.removeItem("authToken");
            localStorage.removeItem("email");
            localStorage.removeItem("rememberMe");
            localStorage.removeItem("lastLocation");
        }
    };

    return (
        <AuthContext.Provider
            value={{ user, login, logout, isAuthenticated, setUser }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
