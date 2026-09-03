/**
 * Render smoke tests.
 *
 * The build only proves the code parses. These mount the design-system
 * primitives and a representative page against the real theme, which is what
 * catches runtime mistakes a compiler can't see — a bad `sx` palette path, a
 * component reading a theme key that doesn't exist, a hook used outside its
 * provider.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";

import theme from "./Utilites/theme";
import { AuthProvider } from "./Utilites/AuthContext";
import { SnackbarProvider } from "./Utilites/SnackbarContext";

import PageHeader from "./Views/Components/UI/PageHeader";
import PageContainer from "./Views/Components/UI/PageContainer";
import SectionCard from "./Views/Components/UI/SectionCard";
import StatCard from "./Views/Components/UI/StatCard";
import StatusChip from "./Views/Components/UI/StatusChip";
import DetailField from "./Views/Components/UI/DetailField";
import EmptyState from "./Views/Components/UI/EmptyState";
import FilterBar from "./Views/Components/UI/FilterBar";
import ResponsiveDialog from "./Views/Components/UI/ResponsiveDialog";
import AlertDialog from "./Components/AlertDialog";
import ConfirmDialog from "./Components/ConfirmDialog";
import NotFoundPage from "./Views/Pages/Errors/NotFoundPage";

jest.mock("axios", () => ({
    get: jest.fn(() => Promise.resolve({ data: [] })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: { request: { use: jest.fn() } },
}));

const appTheme = theme("light");

const wrap = (ui) =>
    render(
        <MemoryRouter>
            <ThemeProvider theme={appTheme}>
                <AuthProvider>
                    <SnackbarProvider>{ui}</SnackbarProvider>
                </AuthProvider>
            </ThemeProvider>
        </MemoryRouter>,
    );

describe("theme", () => {
    it("exposes the custom token scales pages rely on", () => {
        expect(appTheme.shadowTokens.lg).toEqual(expect.any(String));
        expect(appTheme.motion.emphasized).toEqual(expect.any(String));
        expect(appTheme.radius.lg).toEqual(expect.any(Number));
        expect(appTheme.typography.fontFamilyMono).toEqual(expect.any(String));
    });

    it("keeps the brand red as the primary color", () => {
        expect(appTheme.palette.primary.main).toBe("#C8102E");
    });

    it("keeps the legacy palette keys older screens still read", () => {
        expect(appTheme.palette.background.fill.light.lightHover).toBeDefined();
        expect(appTheme.palette.border.main).toBeDefined();
        expect(appTheme.palette.alert.success).toBeDefined();
        expect(appTheme.palette.primary.selected).toBeDefined();
        expect(appTheme.palette.primary.text.dark).toBeDefined();
    });

    it("exposes the tint steps the sx props address (primary.50 etc.)", () => {
        expect(appTheme.palette.primary[50]).toBeDefined();
        expect(appTheme.palette.primary[100]).toBeDefined();
        expect(appTheme.palette.grey[50]).toBeDefined();
    });
});

describe("UI primitives", () => {
    it("renders a page header with actions", () => {
        wrap(
            <PageHeader
                title="Equipment"
                subtitle="12 items"
                breadcrumbs={[{ label: "Home", to: "/" }, { label: "Equipment" }]}
                actions={[
                    { key: "add", label: "Add", primary: true, onClick: () => {} },
                ]}
            />,
        );
        // "Equipment" appears twice — once as the breadcrumb tail, once as the
        // heading — so query by role to target the heading.
        expect(
            screen.getByRole("heading", { name: "Equipment" }),
        ).toBeInTheDocument();
        expect(screen.getByText("12 items")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    });

    it("renders a section card, stat card and detail field", () => {
        wrap(
            <PageContainer>
                <SectionCard title="Details" subtitle="Sub">
                    <DetailField label="Serial" value="ABC-123" mono />
                    <DetailField label="Missing" value={null} />
                </SectionCard>
                <StatCard label="Total" value={42} tone="success" trend={12} />
            </PageContainer>,
        );
        expect(screen.getByText("Details")).toBeInTheDocument();
        expect(screen.getByText("ABC-123")).toBeInTheDocument();
        expect(screen.getByText("42")).toBeInTheDocument();
        // Empty values fall back to an em dash rather than rendering blank.
        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("maps status strings onto the shared vocabulary", () => {
        wrap(
            <div>
                <StatusChip status="auto-approved" />
                <StatusChip status="pending" />
                <StatusChip status="some_unmapped_thing" />
            </div>,
        );
        expect(screen.getByText("Pending")).toBeInTheDocument();
        // Unknown statuses are title-cased rather than dropped.
        expect(screen.getByText("Some Unmapped Thing")).toBeInTheDocument();
    });

    it("renders an empty state with an action", () => {
        wrap(
            <EmptyState
                title="Nothing here"
                description="Add something"
                action={{ label: "Add", onClick: () => {} }}
            />,
        );
        expect(screen.getByText("Nothing here")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    });

    it("renders a filter bar with active filter chips", () => {
        wrap(
            <FilterBar
                search="drill"
                onSearchChange={() => {}}
                activeFilters={[
                    { key: "status", label: "Available", onClear: () => {} },
                ]}
            />,
        );
        expect(screen.getByDisplayValue("drill")).toBeInTheDocument();
        expect(screen.getByText("Available")).toBeInTheDocument();
    });
});

describe("dialogs", () => {
    it("renders the shared responsive dialog", () => {
        wrap(
            <ResponsiveDialog
                open
                onClose={() => {}}
                title="Upload file"
                subtitle="Pick something"
                actions={<button type="button">Save</button>}
            >
                <p>Body</p>
            </ResponsiveDialog>,
        );
        expect(screen.getByText("Upload file")).toBeInTheDocument();
        expect(screen.getByText("Body")).toBeInTheDocument();
    });

    it("renders the alert and confirm dialogs on the shared chrome", () => {
        wrap(
            <div>
                <AlertDialog open onClose={() => {}} message="Something failed" severity="error" />
            </div>,
        );
        expect(screen.getByText("Something failed")).toBeInTheDocument();
        expect(screen.getByText("Error")).toBeInTheDocument();
    });

    it("renders a destructive confirm", () => {
        wrap(
            <ConfirmDialog
                open
                onConfirm={() => {}}
                onCancel={() => {}}
                message="Delete this?"
                severity="danger"
                confirmText="Delete"
            />,
        );
        expect(screen.getByText("Delete this?")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Delete" }),
        ).toBeInTheDocument();
    });
});

describe("pages", () => {
    it("renders the not-found page", () => {
        wrap(<NotFoundPage />);
        expect(screen.getByText("We can't find that page")).toBeInTheDocument();
    });
});
