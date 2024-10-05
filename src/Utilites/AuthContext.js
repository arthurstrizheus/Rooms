import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();
//id: 2, firstName: "Geust", lastName: "User", email: 'geustuser@sealimited.com', admin:true, location:1, password:'123456', group:1, status_group:1
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(); // Default to 'user', change based on actual authentication logic
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const login = () => setIsAuthenticated(true);

  const logout = () => {
    setIsAuthenticated(false);
    setUser({});
    localStorage.removeItem("user");
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
