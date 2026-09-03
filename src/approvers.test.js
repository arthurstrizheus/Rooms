/**
 * Per-equipment approver picker.
 *
 * The risks worth pinning here are the quiet ones: a shape mismatch that sends
 * a stale field back to the server, a duplicate that trips a unique index, and
 * a slow directory response that lands after a newer one and overwrites it.
 */
import React from "react";
import {
    render,
    screen,
    waitFor,
    fireEvent,
    within,
    act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "./Utilites/theme";

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

const USERS = [
    { id: 1, first_name: "Sam", last_name: "Ortiz", email: "sam@sealimited.com" },
    { id: 2, first_name: "Dana", last_name: "Reed", email: "dana@sealimited.com" },
];

function renderPicker(props) {
    const ApproverPicker =
        require("./Views/Components/Equipment/ApproverPicker").default;
    return render(
        <ThemeProvider theme={appTheme}>
            <ApproverPicker users={USERS} {...props} />
        </ThemeProvider>,
    );
}

beforeEach(() => {
    const axios = require("axios");
    // `status` matters: handleApiResponseError treats a response without a 2xx
    // status as a failure, and SearchAdGroups then reports the directory as
    // reachable-but-empty rather than trusting a `configured` flag it never saw.
    axios.get.mockResolvedValue({
        status: 200,
        data: {
            configured: true,
            groups: [
                {
                    name: "SEA-Lab-Managers",
                    dn: "CN=SEA-Lab-Managers,OU=Groups,DC=sea,DC=local",
                    description: "Lab equipment owners",
                },
            ],
        },
    });
    localStorage.clear();
    localStorage.setItem("authToken", "test-token");
});

describe("approver form values", () => {
    it("drops fields the API only ever sends back", () => {
        const {
            toApproverFormValues,
        } = require("./Views/Components/Equipment/ApproverPicker");

        expect(
            toApproverFormValues([
                {
                    id: 99,
                    approver_type: "user",
                    user_id: 1,
                    ApproverUser: { id: 1, first_name: "Sam" },
                },
                {
                    id: 100,
                    approver_type: "ad_group",
                    ad_group_name: "SEA-Lab-Managers",
                    ad_group_dn: "CN=SEA-Lab-Managers",
                    ApproverUser: null,
                },
            ]),
        ).toEqual([
            { approver_type: "user", user_id: 1 },
            {
                approver_type: "ad_group",
                ad_group_name: "SEA-Lab-Managers",
                ad_group_dn: "CN=SEA-Lab-Managers",
            },
        ]);
    });

    it("survives a missing or malformed approver list", () => {
        const {
            toApproverFormValues,
        } = require("./Views/Components/Equipment/ApproverPicker");

        expect(toApproverFormValues(undefined)).toEqual([]);
        // A row with neither a user nor a group is unusable, and passing it on
        // would fail the database CHECK constraint on save.
        expect(
            toApproverFormValues([{ approver_type: "user", user_id: null }]),
        ).toEqual([]);
    });
});

describe("approver picker", () => {
    it("says administrators approve when nobody is named", () => {
        renderPicker({ value: [], onChange: () => {} });
        expect(screen.getByText(/administrator/i)).toBeInTheDocument();
    });

    it("does not offer someone who is already an approver", async () => {
        renderPicker({
            value: [{ approver_type: "user", user_id: 1 }],
            onChange: () => {},
        });

        const personInput = screen.getByRole("combobox", {
            name: "Add a person",
        });
        fireEvent.mouseDown(personInput);

        const listbox = await screen.findByRole("listbox");
        // Sam is already an approver, so he still shows in the chosen list but
        // must not be offered again -- the unique index would reject it.
        expect(within(listbox).getByText("Dana Reed")).toBeInTheDocument();
        expect(within(listbox).queryByText("Sam Ortiz")).toBeNull();
    });

    it("removes an approver without disturbing the others", () => {
        const onChange = jest.fn();
        renderPicker({
            value: [
                { approver_type: "user", user_id: 1 },
                { approver_type: "user", user_id: 2 },
            ],
            onChange,
        });

        fireEvent.click(screen.getAllByRole("button", { name: /remove/i })[0]);

        expect(onChange).toHaveBeenCalledWith([
            { approver_type: "user", user_id: 2 },
        ]);
    });

    it("does not search the directory for a one-character term", async () => {
        const axios = require("axios");
        renderPicker({ value: [], onChange: () => {} });

        await userEvent.type(
            screen.getByRole("combobox", { name: "Add an AD group" }),
            "s",
        );

        // Comfortably past the 300ms debounce. One letter against a corporate
        // directory would match thousands of groups and return nothing useful,
        // so the request must not be made at all.
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 600));
        });

        expect(axios.get).not.toHaveBeenCalled();
    });

    it("tells the admin when the directory is not configured", async () => {
        const axios = require("axios");
        axios.get.mockResolvedValue({
            status: 200,
            data: { configured: false, groups: [] },
        });

        renderPicker({ value: [], onChange: () => {} });

        // userEvent, not fireEvent: MUI's Autocomplete only propagates to
        // onInputChange from a real key sequence, so a bare change event
        // leaves the controlled inputValue untouched and the search never runs.
        await userEvent.type(
            screen.getByRole("combobox", { name: "Add an AD group" }),
            "lab",
        );

        // Otherwise this reads as "no groups match" and the admin keeps trying
        // different spellings of a name that was never reachable.
        await waitFor(() =>
            expect(screen.getByText(/not configured/i)).toBeInTheDocument(),
        );
    });
});
