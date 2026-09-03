/**
 * Route render smoke tests.
 *
 * Mounts every page in the app against the real theme with the network and
 * socket layers stubbed. This is a "does it render at all" check, not a
 * behavioural one — its job is to catch the class of mistake that only shows up
 * at runtime after a large refactor: a missing provider, a bad theme path, a
 * component handed props it doesn't take.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";

import theme from "./Utilites/theme";
import { AuthProvider } from "./Utilites/AuthContext";
import { SnackbarProvider } from "./Utilites/SnackbarContext";

// --- Stubs -----------------------------------------------------------------

jest.mock("axios", () => {
    const api = {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        interceptors: { request: { use: jest.fn() } },
    };
    return { __esModule: true, default: api, ...api };
});

jest.mock("./Contexts/SocketContext", () => ({
    useSocket: () => ({ socket: null }),
    SocketProvider: ({ children }) => children,
}));

jest.mock("./Utilites/Functions/ApiFunctions", () => ({
    GetLocations: jest.fn(),
    GetUsers: jest.fn(),
    GetCheckoutApprovals: jest.fn(),
    DownloadCheckoutIcs: jest.fn(),
    RunMatterManagerMonthlyGroupReport: jest.fn(),
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showWarning: jest.fn(),
}));

jest.mock("./Utilites/Functions/ApiFunctions/UserFunctions", () => ({
    AuthenticateUser: jest.fn(),
    AuthenticateUserAD: jest.fn(),
    AuthenticatePassword: jest.fn(),
    UserExistsInAD: jest.fn(),
    UpdateUserDetails: jest.fn(),
    UpdateUserPassword: jest.fn(),
    PostUser: jest.fn(),
    UpdateUser: jest.fn(),
    ActivateUser: jest.fn(),
    DeactivateUser: jest.fn(),
    DeleteUser: jest.fn(),
}));

jest.mock("./Utilites/Functions/ApiFunctions/SocketFunctions", () => ({
    GetConnectedUsers: jest.fn(),
    GetConnectionStatus: jest.fn(),
    ForceLogoutUser: jest.fn(),
}));

// FullCalendar measures real layout, which jsdom doesn't provide. The calendar
// pages are still exercised — only the grid itself is replaced.
jest.mock("@fullcalendar/react", () => ({
    __esModule: true,
    default: () => <div data-testid="full-calendar" />,
}));

// --- Harness ---------------------------------------------------------------

const appTheme = theme("light");
const noop = () => {};

function renderRoute(ui, { path = "/", route = "/" } = {}) {
    return render(
        <MemoryRouter initialEntries={[route]}>
            <ThemeProvider theme={appTheme}>
                <AuthProvider>
                    <SnackbarProvider>
                        <Routes>
                            <Route path={path} element={ui} />
                        </Routes>
                    </SnackbarProvider>
                </AuthProvider>
            </ThemeProvider>
        </MemoryRouter>,
    );
}

// Create React App's Jest config sets `resetMocks: true`, which strips the
// implementations off every mock before each test — so they're (re)applied
// here rather than in the factory.
beforeEach(() => {
    const axios = require("axios");
    const api = require("./Utilites/Functions/ApiFunctions");
    const users = require("./Utilites/Functions/ApiFunctions/UserFunctions");
    const sockets = require("./Utilites/Functions/ApiFunctions/SocketFunctions");

    axios.get.mockResolvedValue({ data: [] });
    axios.post.mockResolvedValue({ data: {} });
    axios.put.mockResolvedValue({ data: {} });
    axios.delete.mockResolvedValue({ data: {} });

    api.GetLocations.mockResolvedValue([]);
    api.GetUsers.mockResolvedValue([]);
    api.GetCheckoutApprovals.mockResolvedValue([]);
    api.DownloadCheckoutIcs.mockResolvedValue(true);

    users.UserExistsInAD.mockResolvedValue({
        exists: false,
        accountCreated: false,
    });
    users.AuthenticateUserAD.mockResolvedValue(null);
    users.UpdateUserDetails.mockResolvedValue({});

    sockets.GetConnectedUsers.mockResolvedValue({ success: true, users: [] });
    sockets.GetConnectionStatus.mockResolvedValue({
        success: true,
        stats: null,
    });

    localStorage.clear();
    localStorage.setItem("authToken", "test-token");
    localStorage.setItem(
        "user",
        JSON.stringify({
            id: 1,
            first_name: "Test",
            last_name: "User",
            email: "test@sealimited.com",
            admin: true,
            equipment_admin: true,
            tax_admin: true,
            location: 1,
        }),
    );
});

// Pages fetch on mount; assert on the heading once the effects have settled.
const expectHeading = async (name) =>
    waitFor(() =>
        expect(screen.getByRole("heading", { name })).toBeInTheDocument(),
    );

// --- Tests -----------------------------------------------------------------

describe("pages render", () => {
    it("Login", async () => {
        const Login = require("./Views/Pages/Login/Login").default;
        renderRoute(<Login setLoading={noop} setDrawerOpen={noop} />);
        await expectHeading("Sign in");
    });

    it("Equipment catalog", async () => {
        const Equipment = require("./Views/Pages/Equipment/index").default;
        renderRoute(<Equipment setLoading={noop} loading={false} />);
        await expectHeading("Equipment");
    });

    it("Equipment details", async () => {
        const EquipmentDetails =
            require("./Views/Pages/EquipmentDetails/EquipmentDetails").default;
        renderRoute(<EquipmentDetails setLoading={noop} loading={false} />, {
            path: "/equipment/:equipmentId",
            route: "/equipment/1",
        });
        // With no equipment payload the page shows its loading skeleton state.
        await expectHeading("Equipment");
    });

    it("Equipment calendar", async () => {
        const EquipmentCalendar =
            require("./Views/Pages/EquipmentCalendar").default;
        renderRoute(<EquipmentCalendar setLoading={noop} loading={false} />, {
            path: "/equipment/calendar/:equipmentId",
            route: "/equipment/calendar/1",
        });
        await waitFor(() =>
            expect(screen.getByTestId("full-calendar")).toBeInTheDocument(),
        );
    });

    it("Compare calendar", async () => {
        const EquipmentCompareCalendar =
            require("./Views/Pages/EquipmentCompareCalendar").default;
        renderRoute(
            <EquipmentCompareCalendar setLoading={noop} loading={false} />,
            { path: "/equipment/compare", route: "/equipment/compare?ids=1,2" },
        );
        await expectHeading("Compare schedules");
    });

    it("Calendar embed", async () => {
        const EquipmentCalendarEmbed =
            require("./Views/Pages/EquipmentCalendarEmbed").default;
        renderRoute(<EquipmentCalendarEmbed />, {
            path: "/equipment/:equipmentId/embed",
            route: "/equipment/1/embed",
        });
        await waitFor(() =>
            expect(screen.getByTestId("full-calendar")).toBeInTheDocument(),
        );
    });

    it("Compare calendar embed", async () => {
        const Embed =
            require("./Views/Pages/EquipmentCompareCalendarEmbed").default;
        renderRoute(<Embed />, {
            path: "/equipment/compare/embed",
            route: "/equipment/compare/embed?ids=1,2",
        });
        await waitFor(() =>
            expect(screen.getByTestId("full-calendar")).toBeInTheDocument(),
        );
    });

    it("My reservations", async () => {
        const MyCheckouts = require("./Views/Pages/MyCheckouts/index").default;
        renderRoute(<MyCheckouts setLoading={noop} loading={false} />);
        await expectHeading("My Reservations");
    });

    it("Approval queue", async () => {
        const ApprovalQueue =
            require("./Views/Pages/ApprovalQueue/index").default;
        renderRoute(<ApprovalQueue setLoading={noop} loading={false} />);
        await expectHeading("Approval Queue");
    });

    it("My account", async () => {
        const MyAccount = require("./Views/Pages/MyAccount/MyAccount").default;
        renderRoute(<MyAccount setLoading={noop} loading={false} />);
        await expectHeading("My Account");
    });

    it("Users", async () => {
        const Users = require("./Views/Pages/Users/index").default;
        renderRoute(<Users setLoading={noop} />);
        await expectHeading("Users");
    });

    it("Admin dashboard", async () => {
        const AdminDashboard =
            require("./Views/Pages/Admin/AdminDashboard").default;
        renderRoute(<AdminDashboard setLoading={noop} loading={false} />);
        await expectHeading("Admin Dashboard");
    });

    it("Usage report", async () => {
        const UsageReport =
            require("./Views/Pages/UsageReport/UsageReport").default;
        renderRoute(<UsageReport setLoading={noop} loading={false} />);
        await expectHeading("Usage Report");
    });

    it("Depreciation reports", async () => {
        const DepreciationReports =
            require("./Views/Pages/DepreciationReports/DepreciationReports")
                .default;
        renderRoute(<DepreciationReports setLoading={noop} loading={false} />);
        await expectHeading("Depreciation Reports");
    });

    it("Not found", async () => {
        const NotFoundPage =
            require("./Views/Pages/Errors/NotFoundPage").default;
        renderRoute(<NotFoundPage />);
        await expectHeading("We can't find that page");
    });
});

// ---------------------------------------------------------------------------
// With data
// ---------------------------------------------------------------------------
// The tests above only reach the empty states. These feed real-shaped payloads
// so the row and card renderers actually run.

/** Routes axios.get by URL so a page can get different data per endpoint. */
function mockEndpoints(map) {
    const axios = require("axios");
    axios.get.mockImplementation((url) => {
        const match = Object.keys(map).find((key) => url.startsWith(key));
        return Promise.resolve({ data: match ? map[match] : [] });
    });
}

const EQUIPMENT_FIXTURE = [
    {
        id: 1,
        name: "Thermal Camera",
        serial_number: "TC-9001",
        asset_number: "A-1",
        location: "Columbus",
        contact_person: "Dana Reed",
        status: "available",
        can_book: true,
        last_calibration_date: "2025-01-01T00:00:00.000Z",
        calibration_interval_value: 12,
        calibration_interval_unit: "months",
    },
    {
        id: 2,
        name: "Impact Hammer",
        serial_number: "IH-4402",
        location: "Columbus",
        status: "retired",
        can_book: false,
    },
];

describe("list pages with data", () => {
    it("renders equipment cards", async () => {
        mockEndpoints({
            "/api/equipment": EQUIPMENT_FIXTURE,
            "/api/locations": [{ officeid: 0, Alias: "All", state: "OH" }],
            "/api/checkouts": [],
            "/api/users": [],
        });

        const Equipment = require("./Views/Pages/Equipment/index").default;
        renderRoute(<Equipment setLoading={noop} loading={false} />);

        await waitFor(() =>
            expect(screen.getByText("Thermal Camera")).toBeInTheDocument(),
        );
        expect(screen.getByText("Impact Hammer")).toBeInTheDocument();
        // Bookable items show a status pill; non-bookable ones don't.
        expect(screen.getByText("Available")).toBeInTheDocument();
        expect(screen.getByText("TC-9001")).toBeInTheDocument();
    });

    it("renders reservations grouped into recurring and one-time", async () => {
        mockEndpoints({
            "/api/checkouts/user/": [
                {
                    id: 10,
                    start_time: "2026-02-02T15:00:00.000Z",
                    end_time: "2026-02-02T17:00:00.000Z",
                    status: "auto-approved",
                    project_number: "P-100",
                    Equipment: EQUIPMENT_FIXTURE[0],
                },
                {
                    id: 11,
                    start_time: "2026-02-09T15:00:00.000Z",
                    end_time: "2026-02-09T17:00:00.000Z",
                    status: "pending",
                    recurrence_id: 5,
                    Recurrence: {
                        recurrence_pattern: "weekly",
                        separation_count: 1,
                    },
                    Equipment: EQUIPMENT_FIXTURE[0],
                },
            ],
            "/api/users": [],
        });

        const MyCheckouts = require("./Views/Pages/MyCheckouts/index").default;
        renderRoute(<MyCheckouts setLoading={noop} loading={false} />);

        await waitFor(() =>
            expect(
                screen.getByText(/Recurring reservations \(1\)/),
            ).toBeInTheDocument(),
        );
        expect(
            screen.getByText(/One-time reservations \(1\)/),
        ).toBeInTheDocument();
        // Stat row reflects the loaded set.
        expect(screen.getByText("Total")).toBeInTheDocument();
    });

    it("renders the approval queue with pending rows", async () => {
        const api = require("./Utilites/Functions/ApiFunctions");
        api.GetCheckoutApprovals.mockResolvedValue([
            {
                id: 21,
                equipment_id: 1,
                user_id: 2,
                start_time: "2026-03-01T14:00:00.000Z",
                end_time: "2026-03-01T16:00:00.000Z",
                status: "pending",
                notes: "Site survey",
            },
        ]);
        mockEndpoints({
            "/api/equipment": EQUIPMENT_FIXTURE,
            "/api/users": [
                { id: 2, first_name: "Sam", last_name: "Ortiz" },
            ],
        });

        const ApprovalQueue =
            require("./Views/Pages/ApprovalQueue/index").default;
        renderRoute(<ApprovalQueue setLoading={noop} loading={false} />);

        await waitFor(() =>
            expect(screen.getByText("Thermal Camera")).toBeInTheDocument(),
        );
        expect(screen.getByText("Sam Ortiz")).toBeInTheDocument();
        expect(screen.getByText("Site survey")).toBeInTheDocument();
    });

    it("renders the user table with role badges", async () => {
        const api = require("./Utilites/Functions/ApiFunctions");
        api.GetUsers.mockResolvedValue([
            {
                id: 2,
                first_name: "Sam",
                last_name: "Ortiz",
                email: "sam@sealimited.com",
                location: 0,
                active: true,
                admin: true,
                tax_admin: true,
            },
        ]);
        api.GetLocations.mockResolvedValue([
            { officeid: 0, Alias: "All", state: "OH" },
        ]);

        const Users = require("./Views/Pages/Users/index").default;
        renderRoute(<Users setLoading={noop} />);

        await waitFor(() =>
            expect(screen.getByText("Sam Ortiz")).toBeInTheDocument(),
        );
        expect(screen.getByText("Admin")).toBeInTheDocument();
        expect(screen.getByText("Tax Admin")).toBeInTheDocument();
        expect(screen.getByText("sam@sealimited.com")).toBeInTheDocument();
        expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders equipment details for a loaded item", async () => {
        mockEndpoints({
            "/api/equipment/1/files": [],
            "/api/equipment/1": EQUIPMENT_FIXTURE[0],
            "/api/equipment": EQUIPMENT_FIXTURE,
            "/api/calibrations": [],
            "/api/checkouts": [],
            "/api/locations": [],
            "/api/users": [],
            "/api/equipment-alerts": [],
        });

        const EquipmentDetails =
            require("./Views/Pages/EquipmentDetails/EquipmentDetails").default;
        renderRoute(<EquipmentDetails setLoading={noop} loading={false} />, {
            path: "/equipment/:equipmentId",
            route: "/equipment/1",
        });

        await expectHeading("Thermal Camera");
        expect(screen.getByText("TC-9001")).toBeInTheDocument();
        expect(screen.getByText("Calibration")).toBeInTheDocument();
    });
});
