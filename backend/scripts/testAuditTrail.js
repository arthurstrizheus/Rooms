const axios = require("axios");

const API_BASE_URL = "http://localhost:5001/api";

async function testAuditTrail() {
    console.log("Testing Audit Trail Implementation\n");

    try {
        // Login first to get auth token
        console.log("1. Logging in...");
        const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
            username: "admin",
            password: "admin123",
        });

        const token = loginResponse.data.token;
        console.log("✓ Login successful");

        const config = {
            headers: { Authorization: `Bearer ${token}` },
        };

        // Test 1: Get equipment with audit fields
        console.log("\n2. Fetching equipment details...");
        const equipmentResponse = await axios.get(
            `${API_BASE_URL}/equipment/1`,
            config,
        );
        const equipment = equipmentResponse.data;

        console.log("Equipment Audit Fields:");
        console.log(
            "  Created By:",
            equipment.CreatedBy
                ? `${equipment.CreatedBy.first_name} ${equipment.CreatedBy.last_name}`
                : "N/A",
        );
        console.log(
            "  Updated By:",
            equipment.UpdatedBy
                ? `${equipment.UpdatedBy.first_name} ${equipment.UpdatedBy.last_name}`
                : "N/A",
        );

        // Test 2: Get checkouts with audit fields
        console.log("\n3. Fetching checkout history...");
        const checkoutsResponse = await axios.get(
            `${API_BASE_URL}/checkouts/equipment/1`,
            config,
        );
        const checkouts = checkoutsResponse.data;

        if (checkouts.length > 0) {
            const firstCheckout = checkouts[0];
            console.log("Checkout Audit Fields:");
            console.log(
                "  Created By:",
                firstCheckout.CheckoutCreatedBy
                    ? `${firstCheckout.CheckoutCreatedBy.first_name} ${firstCheckout.CheckoutCreatedBy.last_name}`
                    : "N/A",
            );
            console.log(
                "  Updated By:",
                firstCheckout.CheckoutUpdatedBy
                    ? `${firstCheckout.CheckoutUpdatedBy.first_name} ${firstCheckout.CheckoutUpdatedBy.last_name}`
                    : "N/A",
            );
        } else {
            console.log("  No checkouts found");
        }

        // Test 3: Get files with audit fields
        console.log("\n4. Fetching equipment files...");
        const filesResponse = await axios.get(
            `${API_BASE_URL}/equipment-files/equipment/1`,
            config,
        );
        const files = filesResponse.data;

        if (files.length > 0) {
            const firstFile = files[0];
            console.log("File Audit Fields:");
            console.log(
                "  Created By:",
                firstFile.FileCreatedBy
                    ? `${firstFile.FileCreatedBy.first_name} ${firstFile.FileCreatedBy.last_name}`
                    : "N/A",
            );
            console.log(
                "  Updated By:",
                firstFile.FileUpdatedBy
                    ? `${firstFile.FileUpdatedBy.first_name} ${firstFile.FileUpdatedBy.last_name}`
                    : "N/A",
            );
        } else {
            console.log("  No files found");
        }

        // Test 4: Get calibrations with audit fields
        console.log("\n5. Fetching calibration history...");
        const calibrationsResponse = await axios.get(
            `${API_BASE_URL}/calibrations/equipment/1`,
            config,
        );
        const calibrations = calibrationsResponse.data;

        if (calibrations.length > 0) {
            const firstCal = calibrations[0];
            console.log("Calibration Audit Fields:");
            console.log(
                "  Created By:",
                firstCal.CalibrationCreatedBy
                    ? `${firstCal.CalibrationCreatedBy.first_name} ${firstCal.CalibrationCreatedBy.last_name}`
                    : "N/A",
            );
            console.log(
                "  Updated By:",
                firstCal.CalibrationUpdatedBy
                    ? `${firstCal.CalibrationUpdatedBy.first_name} ${firstCal.CalibrationUpdatedBy.last_name}`
                    : "N/A",
            );
        } else {
            console.log("  No calibrations found");
        }

        // Test 5: Get alerts with audit fields
        console.log("\n6. Fetching user alerts...");
        const alertsResponse = await axios.get(
            `${API_BASE_URL}/equipment-alerts/my-alerts`,
            config,
        );
        const alerts = alertsResponse.data;

        if (alerts.length > 0) {
            const firstAlert = alerts[0];
            console.log("Alert Audit Fields:");
            console.log(
                "  Created By:",
                firstAlert.AlertCreatedBy
                    ? `${firstAlert.AlertCreatedBy.first_name} ${firstAlert.AlertCreatedBy.last_name}`
                    : "N/A",
            );
            console.log(
                "  Updated By:",
                firstAlert.AlertUpdatedBy
                    ? `${firstAlert.AlertUpdatedBy.first_name} ${firstAlert.AlertUpdatedBy.last_name}`
                    : "N/A",
            );
        } else {
            console.log("  No alerts found");
        }

        console.log("\n✓ All audit trail tests completed successfully!");
    } catch (error) {
        console.error(
            "\n✗ Test failed:",
            error.response?.data || error.message,
        );
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        }
    }
}

testAuditTrail();
