import { useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../Utilites/AuthContext";
import LogIn from "../Views/Pages/Login/Login";
import MyCheckouts from "../Views/Pages/MyCheckouts/index";
import MyAccount from "../Views/Pages/MyAccount/MyAccount";
import Equipment from "../Views/Pages/Equipment/index";
import EquipmentDetails from "../Views/Pages/EquipmentDetails/EquipmentDetails";
import ApprovalQueue from "../Views/Pages/ApprovalQueue/index";
import Users from "../Views/Pages/Users/index";
import NotFoundPage from "../Views/Pages/Errors/NotFoundPage";
import EquipmentCalendar from "../Views/Pages/EquipmentCalendar";
import EquipmentCalendarEmbed from "../Views/Pages/EquipmentCalendarEmbed";
import EquipmentCompareCalendar from "../Views/Pages/EquipmentCompareCalendar";
import EquipmentCompareCalendarEmbed from "../Views/Pages/EquipmentCompareCalendarEmbed";
import { useMediaQuery } from "@mui/system";
import AdminDashboard from "../Views/Pages/Admin/AdminDashboard";
import DepreciationReports from "../Views/Pages/DepreciationReports/DepreciationReports";

const AppRoutes = ({
    setLoading,
    selectedDate,
    setSelectedDate,
    setBannerText,
    loading,
    drawerOpen,
    setDrawerOpen,
}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const matchSm = useMediaQuery((theme) => theme.breakpoints.down("md"));

    useEffect(() => {
        // Determine the banner text based on the current path
        // Skip auth redirect for embed routes
        if (
            !isAuthenticated &&
            location.pathname != "/login" &&
            location.pathname != "/signup" &&
            !location.pathname.includes("/embed")
        ) {
            navigate("/login");
        }
        const path = location.pathname;
        let newBannerText = "";
        if (path === "/") {
            newBannerText = "Equipment";
        } else if (path.startsWith("/equipment/compare")) {
            newBannerText = `Compare Equipment Schedules`;
        } else if (path.startsWith("/equipment/calendar")) {
            newBannerText = `Equipment Schedule`;
        } else if (path.match(/\/equipment\/\d+$/)) {
            newBannerText = `Equipment Details`;
        } else if (path.startsWith("/equipment")) {
            newBannerText = `Equipment`;
        } else if (path.startsWith("/reservations")) {
            newBannerText = `My Reservations`;
        } else if (path.startsWith("/approve")) {
            newBannerText = `Approval Queue`;
        } else if (path.startsWith("/account")) {
            newBannerText = `My Account`;
        } else if (
            path.startsWith("/manage/users") &&
            (user?.admin || user?.equipment_admin)
        ) {
            newBannerText = `Users`;
        } else if (path.startsWith("/admin-dashboard") && user?.admin) {
            newBannerText = `Admin Dashboard`;
        } else if (
            path.startsWith("/depreciation") &&
            (user?.admin || user?.equipment_admin)
        ) {
            newBannerText = `Depreciation Reports`;
        } else {
            newBannerText = "Page Not Found"; // Default for undefined routes
        }
        // Update the banner text in the parent component
        setBannerText(newBannerText);
    }, [location, setBannerText]);

    return (
        <Routes>
            <Route
                path="/login"
                exact
                element={
                    <LogIn
                        setLoading={setLoading}
                        setDrawerOpen={setDrawerOpen}
                    />
                }
            />
            <Route
                path="/"
                exact
                element={
                    <Equipment setLoading={setLoading} loading={loading} />
                }
            />
            <Route
                path="/equipment"
                element={
                    <Equipment setLoading={setLoading} loading={loading} />
                }
            />
            <Route
                path="/equipment/compare/embed"
                element={<EquipmentCompareCalendarEmbed />}
            />
            <Route
                path="/equipment/compare"
                element={
                    <EquipmentCompareCalendar
                        setLoading={setLoading}
                        loading={loading}
                    />
                }
            />
            <Route
                path="/equipment/:equipmentId"
                element={
                    <EquipmentDetails
                        setLoading={setLoading}
                        loading={loading}
                    />
                }
            />
            <Route
                path="/equipment/:equipmentId/embed"
                element={<EquipmentCalendarEmbed />}
            />
            <Route
                path="/equipment/calendar/:equipmentId/embed"
                element={<EquipmentCalendarEmbed />}
            />
            <Route
                path="/equipment/calendar/:equipmentId"
                element={
                    <EquipmentCalendar
                        setLoading={setLoading}
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        loading={loading}
                        drawerOpen={drawerOpen}
                    />
                }
            />
            <Route
                path="/reservations"
                element={
                    <MyCheckouts setLoading={setLoading} loading={loading} />
                }
            />
            <Route
                path="/account"
                element={
                    <MyAccount setLoading={setLoading} loading={loading} />
                }
            />
            <Route
                path="/approve"
                element={
                    <ApprovalQueue setLoading={setLoading} loading={loading} />
                }
            />
            <Route
                path="/manage/users"
                element={
                    user?.admin || user?.equipment_admin ? (
                        <Users setLoading={setLoading} loading={loading} />
                    ) : (
                        <NotFoundPage />
                    )
                }
            />
            <Route
                path="/admin-dashboard"
                element={
                    user?.admin && (
                        <AdminDashboard
                            setLoading={setLoading}
                            loading={loading}
                        />
                    )
                }
            />
            <Route
                path="/depreciation"
                element={
                    user?.admin || user?.equipment_admin ? (
                        <DepreciationReports
                            setLoading={setLoading}
                            loading={loading}
                        />
                    ) : (
                        <NotFoundPage />
                    )
                }
            />
            {/* Catch-all route for undefined URLs */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};

export default AppRoutes;
