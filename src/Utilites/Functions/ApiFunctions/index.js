import axios from "axios";

// Set up axios interceptor to automatically include auth token
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("authToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            console.log("⚠️ No auth token found for request:", config.url);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Your existing API functions...
export * from "./ApiFunctions";
