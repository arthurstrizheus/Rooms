import { useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../Utilites/AuthContext";
import LogIn from "../Views/Pages/Login/Login";
import SignUp from "../Views/Pages/Login/Components/Signup";
import MyBookings from "../Views/Pages/MyBookings/MyBookings";
import MyAccount from "../Views/Pages/MyAccount/MyAccount";
import Locations from "../Views/Pages/Locations/Locations";
import Rooms from "../Views/Pages/Rooms/Rooms";
import MeetingTypes from "../Views/Pages/MeetingTypes/MeetingTypes";
import ApprovalQueue from "../Views/Pages/ApprovalQueue/ApprovalQueue";
import Users from "../Views/Pages/Users/index";
import Groups from "../Views/Pages/Groups/Groups";
import RoomResources from "../Views/Pages/Resources/index";
import Resources from "../Views/Pages/Resources/index";
import BlockedDates from "../Views/Pages/BlockedDates/BlockedDates";
import Development from "../Views/Pages/Development/Development";
import NotFoundPage from "../Views/Pages/Errors/NotFoundPage";
import Calendar from "../Views/Pages/Calendar";
import { useMediaQuery } from "@mui/system";

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
    if (
      !isAuthenticated &&
      location.pathname != "/login" &&
      location.pathname != "/signup"
    ) {
      navigate("/login");
    }
    const path = location.pathname;
    let newBannerText = "";
    if (path === "/") {
      newBannerText = "Day Schedule";
    } else if (path.startsWith("/schedule/type/day")) {
      newBannerText = `Day Schedule`;
    } else if (path.startsWith("/schedule/type/week")) {
      newBannerText = `Week Schedule`;
    } else if (path.startsWith("/schedule/type/month")) {
      newBannerText = `Month Schedule`;
    } else if (path.startsWith("/book")) {
      newBannerText = `My Bookings`;
    } else if (path.startsWith("/approve")) {
      newBannerText = `Approval Queue`;
    } else if (path.startsWith("/account")) {
      newBannerText = `My Account`;
    } else if (path.startsWith("/manage/locations") && user?.admin) {
      newBannerText = `Locations`;
    } else if (path.startsWith("/manage/rooms/resources") && user?.admin) {
      newBannerText = `Resources`;
    } else if (path.startsWith("/manage/rooms") && user?.admin) {
      newBannerText = `Rooms`;
    } else if (path.startsWith("/manage/types") && user?.admin) {
      newBannerText = `Meeting Types`;
    } else if (path.startsWith("/manage/users") && user?.admin) {
      newBannerText = `Users`;
    } else if (path.startsWith("/manage/groups") && user?.admin) {
      newBannerText = `Groups`;
    } else if (path.startsWith("/manage/resources") && user?.admin) {
      newBannerText = `Resources`;
    } else if (path.startsWith("/manage/blockeddates") && user?.admin) {
      newBannerText = `Blocked Dates`;
    } else if (path.startsWith("/dev") && user?.id == 47) {
      newBannerText = `Dev Tools`;
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
          <LogIn setLoading={setLoading} setDrawerOpen={setDrawerOpen} />
        }
      />
      <Route path="/" exact element={<LogIn setLoading={setLoading} />} />
      <Route
        path="/schedule/type/day"
        element={
          <Calendar
            setLoading={setLoading}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            loading={loading}
            defaultView={"timeGridDay"}
            range={"Day"}
            drawerOpen={drawerOpen}
          />
        }
      />
      <Route
        path="/schedule/type/week"
        element={
          <Calendar
            setLoading={setLoading}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            loading={loading}
            defaultView={matchSm ? "listWeek" : "timeGridWeek"}
            range={"Week"}
          />
        }
      />
      <Route
        path="/schedule/type/month"
        element={
          <Calendar
            setLoading={setLoading}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            loading={loading}
            defaultView={"dayGridMonth"}
            range={"Month"}
          />
          // <MonthSchedulePage
          //   setLoading={setLoading}
          //   selectedDate={selectedDate}
          //   setSelectedDate={setSelectedDate}
          //   loading={loading}
          // />
        }
      />
      <Route
        path="/book"
        element={<MyBookings setLoading={setLoading} loading={loading} />}
      />
      <Route
        path="/account"
        element={<MyAccount setLoading={setLoading} loading={loading} />}
      />
      <Route
        path="/manage/locations"
        element={
          user?.admin ? (
            <Locations setLoading={setLoading} loading={loading} />
          ) : (
            <NotFoundPage />
          )
        }
      />
      <Route
        path="/manage/rooms"
        element={
          user?.admin ? (
            <Rooms setLoading={setLoading} loading={loading} />
          ) : (
            <NotFoundPage />
          )
        }
      />
      <Route
        path="/manage/types"
        element={
          user?.admin ? (
            <MeetingTypes setLoading={setLoading} loading={loading} />
          ) : (
            <NotFoundPage />
          )
        }
      />
      <Route
        path="/approve"
        element={<ApprovalQueue setLoading={setLoading} loading={loading} />}
      />
      <Route
        path="/manage/users"
        element={
          user?.admin ? (
            <Users setLoading={setLoading} loading={loading} />
          ) : (
            <NotFoundPage />
          )
        }
      />
      <Route
        path="/manage/groups"
        element={
          user?.admin ? (
            <Groups setLoading={setLoading} loading={loading} />
          ) : (
            <NotFoundPage />
          )
        }
      />
      <Route
        path="/manage/rooms/resources"
        element={
          user?.admin ? (
            <RoomResources setLoading={setLoading} loading={loading} />
          ) : (
            <NotFoundPage />
          )
        }
      />
      <Route
        path="/manage/resources"
        element={
          user?.admin ? (
            <Resources setLoading={setLoading} loading={loading} />
          ) : (
            <NotFoundPage />
          )
        }
      />
      <Route
        path="/manage/blockeddates"
        element={
          user?.admin ? (
            <BlockedDates setLoading={setLoading} loading={loading} />
          ) : (
            <NotFoundPage />
          )
        }
      />
      <Route
        path="/dev"
        element={
          user?.id == 47 ? (
            <Development setLoading={setLoading} loading={loading} />
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
