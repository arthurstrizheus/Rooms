/**
 * Mobile layout smoke tests.
 *
 * jsdom has no `matchMedia`, so `useMediaQuery` reports false and the other
 * suites only ever exercise the desktop branches. These stub matchMedia to
 * report a narrow viewport, which is the only way to prove the compact layouts
 * — card lists, bottom sheets, the bottom bar, full-screen dialogs — actually
 * render.
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";

import theme from "./Utilites/theme";
import { AuthProvider } from "./Utilites/AuthContext";
import { SnackbarProvider } from "./Utilites/SnackbarContext";

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
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showWarning: jest.fn(),
}));

const appTheme = theme("light");
const noop = () => {};

// The first test to pull in a page drags its whole module graph — the page,
// its dialogs, and a few hundred MUI icons — through Babel. That transform, not
// the render, is what blows past Jest's 5s default.
jest.setTimeout(30000);

/**
 * Reports every `max-width` query as matching and every `min-width` query as
 * not matching — i.e. the narrowest breakpoint. Also matches the coarse-pointer
 * query so hover-only affordances stay hidden.
 */
function mockNarrowViewport() {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches:
            query.includes("max-width") ||
            query.includes("pointer: coarse") ||
            (query.includes("hover: none") && !query.includes("min-width")),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    }));
}

function renderMobile(ui, { path = "/", route = "/" } = {}) {
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

const EQUIPMENT_FIXTURE = [
    {
        id: 1,
        name: "Thermal Camera",
        serial_number: "TC-9001",
        location: "Columbus",
        status: "available",
        can_book: true,
    },
];

beforeEach(() => {
    mockNarrowViewport();

    const axios = require("axios");
    const api = require("./Utilites/Functions/ApiFunctions");

    axios.get.mockImplementation((url) => {
        if (url.startsWith("/api/equipment"))
            return Promise.resolve({ data: EQUIPMENT_FIXTURE });
        if (url.startsWith("/api/locations"))
            return Promise.resolve({
                data: [{ officeid: 0, Alias: "All", state: "OH" }],
            });
        return Promise.resolve({ data: [] });
    });
    axios.post.mockResolvedValue({ data: {} });
    axios.put.mockResolvedValue({ data: {} });
    axios.delete.mockResolvedValue({ data: {} });

    api.GetLocations.mockResolvedValue([{ officeid: 0, Alias: "All" }]);
    api.GetUsers.mockResolvedValue([]);
    api.GetCheckoutApprovals.mockResolvedValue([]);

    localStorage.clear();
    localStorage.setItem("authToken", "test-token");
    localStorage.setItem(
        "user",
        JSON.stringify({
            id: 1,
            first_name: "Test",
            last_name: "User",
            admin: true,
            location: 0,
        }),
    );
});

describe("mobile layouts", () => {
    it("reports the compact breakpoint through useResponsive", () => {
        const useResponsive = require("./hooks/useResponsive").default;
        let flags;
        const Probe = () => {
            flags = useResponsive();
            return null;
        };
        renderMobile(<Probe />);
        expect(flags.isCompact).toBe(true);
        expect(flags.isDesktop).toBe(false);
    });

    it("renders the equipment catalog as cards, not a table", async () => {
        const Equipment = require("./Views/Pages/Equipment/index").default;
        renderMobile(<Equipment setLoading={noop} loading={false} />);

        await waitFor(() =>
            expect(screen.getByText("Thermal Camera")).toBeInTheDocument(),
        );
        // The desktop grid/table toggle is hidden on small screens.
        expect(screen.queryByLabelText("Table")).not.toBeInTheDocument();
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("moves filters into a bottom sheet behind one button", async () => {
        const Equipment = require("./Views/Pages/Equipment/index").default;
        renderMobile(<Equipment setLoading={noop} loading={false} />);

        const filtersButton = await screen.findByLabelText("Filters");
        // The filter selects are not inline on mobile…
        expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();

        fireEvent.click(filtersButton);

        // …they live in a sheet that opens on demand.
        await waitFor(() =>
            expect(
                screen.getByRole("button", { name: "Show results" }),
            ).toBeInTheDocument(),
        );
        expect(screen.getByLabelText("Close filters")).toBeInTheDocument();
    });

    it("renders dialogs full screen", async () => {
        const ResponsiveDialog =
            require("./Views/Components/UI/ResponsiveDialog").default;

        renderMobile(
            <ResponsiveDialog open onClose={noop} title="Reserve">
                <p>Body</p>
            </ResponsiveDialog>,
        );

        await waitFor(() =>
            expect(screen.getByText("Reserve")).toBeInTheDocument(),
        );
        // MUI marks the paper with this class only when fullScreen is on.
        expect(
            document.querySelector(".MuiDialog-paperFullScreen"),
        ).toBeTruthy();
    });

    it("renders the mobile bottom bar with the primary destinations", async () => {
        const BottomNav =
            require("./Views/Components/Shell/BottomNav").default;
        renderMobile(<BottomNav approvalCount={3} />);

        const nav = screen.getByRole("navigation", { name: "Primary" });
        expect(nav).toBeInTheDocument();
        expect(screen.getByText("Equipment")).toBeInTheDocument();
        expect(screen.getByText("Bookings")).toBeInTheDocument();
        // The approval badge surfaces the pending count.
        expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("renders my reservations as cards", async () => {
        const axios = require("axios");
        axios.get.mockImplementation((url) => {
            if (url.startsWith("/api/checkouts/user/")) {
                return Promise.resolve({
                    data: [
                        {
                            id: 10,
                            start_time: "2026-02-02T15:00:00.000Z",
                            end_time: "2026-02-02T17:00:00.000Z",
                            status: "auto-approved",
                            project_number: "P-100",
                            Equipment: EQUIPMENT_FIXTURE[0],
                        },
                    ],
                });
            }
            return Promise.resolve({ data: [] });
        });

        const MyCheckouts = require("./Views/Pages/MyCheckouts/index").default;
        renderMobile(<MyCheckouts setLoading={noop} loading={false} />);

        await waitFor(() =>
            expect(
                screen.getByText(/One-time reservations \(1\)/),
            ).toBeInTheDocument(),
        );
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
        expect(screen.getByText("P-100")).toBeInTheDocument();
    });

    it("renders the user list as cards", async () => {
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
            },
        ]);

        const Users = require("./Views/Pages/Users/index").default;
        renderMobile(<Users setLoading={noop} />);

        await waitFor(() =>
            expect(screen.getByText("Sam Ortiz")).toBeInTheDocument(),
        );
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
});
