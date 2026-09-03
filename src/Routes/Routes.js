import { useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../Utilites/AuthContext";
import { canAccessPath } from "../Views/Components/Shell/navConfig";
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
import AdminDashboard from "../Views/Pages/Admin/AdminDashboard";
import DepreciationReports from "../Views/Pages/DepreciationReports/DepreciationReports";
import UsageReport from "../Views/Pages/UsageReport/UsageReport";

const AppRoutes = ({
    setLoading,
    selectedDate,
    setSelectedDate,
    loading,
    drawerOpen,
    setDrawerOpen,
    approvalCount = 0,
}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    // Page titles now come from Shell/navConfig via the top bar, so this effect
    // only has to guard unauthenticated access.
    useEffect(() => {
        if (
            !isAuthenticated &&
            location.pathname !== "/login" &&
            location.pathname !== "/signup" &&
            !location.pathname.includes("/embed")
        ) {
            navigate("/login");
        }
    }, [location, isAuthenticated, navigate]);

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
            {/* Guarded through navConfig rather than by restating the roles,
                so the route and the nav entry cannot disagree. They already
                had: a named approver who is not an administrator sees the
                item and the badge, and a hand-written role check here would
                404 them out of the queue they were told to look at. Now that
                the pending-approvals endpoint is scoped, a non-zero count
                means "you have something to approve" and is a real
                credential. */}
            <Route
                path="/approve"
                element={
                    canAccessPath("/approve", user, { approvalCount }) ? (
                        <ApprovalQueue
                            setLoading={setLoading}
                            loading={loading}
                        />
                    ) : (
                        <NotFoundPage />
                    )
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
                    user?.admin ? (
                        <AdminDashboard
                            setLoading={setLoading}
                            loading={loading}
                        />
                    ) : (
                        <NotFoundPage />
                    )
                }
            />
            <Route
                path="/depreciation"
                element={
                    user?.admin || user?.tax_admin ? (
                        <DepreciationReports
                            setLoading={setLoading}
                            loading={loading}
                        />
                    ) : (
                        <NotFoundPage />
                    )
                }
            />
            <Route
                path="/usage-report"
                element={
                    user?.admin ||
                    user?.equipment_admin ||
                    user?.equipment_office_admin ||
                    user?.tax_admin ? (
                        <UsageReport
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
