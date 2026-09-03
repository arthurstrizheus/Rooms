/**
 * Help desk (FreshService) support request tests.
 *
 * The failure modes here are the ones that matter: the dialog must not report
 * success for a request that didn't land, and it must show the server's own
 * wording when it refuses -- the rate limiter tells the user how long to wait,
 * and generic text would throw that away.
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";

import theme from "./Utilites/theme";
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

const appTheme = theme("light");

jest.setTimeout(30000);

function renderWithShell(ui) {
    return render(
        <MemoryRouter>
            <ThemeProvider theme={appTheme}>
                <SnackbarProvider>{ui}</SnackbarProvider>
            </ThemeProvider>
        </MemoryRouter>,
    );
}

beforeEach(() => {
    const axios = require("axios");
    axios.get.mockResolvedValue({ data: { enabled: true } });
    axios.post.mockResolvedValue({
        data: { message: "Ticket #42 has been created.", ticketId: 42 },
    });
    localStorage.clear();
    localStorage.setItem("authToken", "test-token");
});

describe("support requests", () => {
    it("will not send until there is both a summary and a description", async () => {
        const SupportDialog =
            require("./Views/Components/Support/SupportDialog").default;
        renderWithShell(<SupportDialog open onClose={() => {}} />);

        const send = screen.getByRole("button", { name: /send request/i });
        expect(send).toBeDisabled();

        fireEvent.change(screen.getByLabelText(/summary/i), {
            target: { value: "Camera will not power on" },
        });
        // Summary alone is not enough -- a ticket with no description wastes a
        // round trip with the help desk.
        expect(send).toBeDisabled();

        fireEvent.change(screen.getByLabelText(/what happened/i), {
            target: { value: "Pressed the power button, no lights." },
        });
        expect(send).toBeEnabled();
    });

    it("sends the equipment id and the current page with the ticket", async () => {
        const axios = require("axios");
        const onClose = jest.fn();
        const SupportDialog =
            require("./Views/Components/Support/SupportDialog").default;

        renderWithShell(
            <SupportDialog
                open
                onClose={onClose}
                equipmentId={7}
                equipmentName="Thermal Camera"
            />,
        );

        // Opening from an equipment page names the asset up front.
        expect(screen.getByText("Thermal Camera")).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText(/summary/i), {
            target: { value: "Lens cracked" },
        });
        fireEvent.change(screen.getByLabelText(/what happened/i), {
            target: { value: "Found it cracked in the case." },
        });
        fireEvent.click(screen.getByRole("button", { name: /send request/i }));

        await waitFor(() => expect(axios.post).toHaveBeenCalled());

        const [url, payload] = axios.post.mock.calls[0];
        expect(url).toBe("/api/support/ticket");
        expect(payload).toMatchObject({
            equipmentId: 7,
            subject: "Lens cracked",
            // Opening from equipment preselects the matching category.
            category: "equipment-issue",
        });
        expect(payload.pageUrl).toEqual(expect.stringContaining("/"));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it("keeps the dialog open and shows the server's wording when refused", async () => {
        const axios = require("axios");
        axios.post.mockRejectedValue({
            response: {
                status: 429,
                data: {
                    message:
                        "You just sent a request. Please wait 47 seconds before sending another.",
                },
            },
        });

        const onClose = jest.fn();
        const SupportDialog =
            require("./Views/Components/Support/SupportDialog").default;
        renderWithShell(<SupportDialog open onClose={onClose} />);

        fireEvent.change(screen.getByLabelText(/summary/i), {
            target: { value: "Cannot book" },
        });
        fireEvent.change(screen.getByLabelText(/what happened/i), {
            target: { value: "The reserve button does nothing." },
        });
        fireEvent.click(screen.getByRole("button", { name: /send request/i }));

        await waitFor(() =>
            expect(screen.getByText(/wait 47 seconds/i)).toBeInTheDocument(),
        );
        // A refused request is not a sent request.
        expect(onClose).not.toHaveBeenCalled();
    });

    it("reports the help desk as unavailable rather than throwing", async () => {
        const axios = require("axios");
        axios.get.mockRejectedValue(new Error("network down"));

        const { GetSupportStatus } = require("./Utilites/Functions/ApiFunctions");
        await expect(GetSupportStatus()).resolves.toBe(false);
    });
});
