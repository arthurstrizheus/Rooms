const nodemailer = require("nodemailer");
require("dotenv").config(); // Must be at the top of the file
const { logErrorToFile } = require("../functions/logErrorToFile.js");
// Lookup models for enriching email content
const { User } = require("../models");
const { Op } = require("sequelize");
// Socket messaging
const { SendMessage } = require("../utils/socketUtils");

// Global email override: if EMAIL_OVERRIDE is truthy (1,true,yes,on) route ALL outbound emails
// to EMAIL_OVERRIDE_ADDRESS (or default).
const EMAIL_OVERRIDE_ACTIVE = (() => {
    const v = (process.env.EMAIL_OVERRIDE || "0")
        .toString()
        .trim()
        .toLowerCase();
    return ["1", "true", "yes", "on"].includes(v);
})();
const EMAIL_OVERRIDE_ADDRESS = (
    process.env.EMAIL_OVERRIDE_ADDRESS || "astrizheus@sealimited.com"
).replace(/['"]/g, "");

function applyEmailOverride(mailOpts) {
    if (!EMAIL_OVERRIDE_ACTIVE) return mailOpts;
    const original = { to: mailOpts.to, cc: mailOpts.cc, bcc: mailOpts.bcc };
    const originalHtml = mailOpts.html || mailOpts.text || "";
    return {
        ...mailOpts,
        to: EMAIL_OVERRIDE_ADDRESS,
        cc: undefined,
        bcc: undefined,
        subject: `[OVERRIDE] ${mailOpts.subject}`,
        headers: {
            ...(mailOpts.headers || {}),
            "X-Original-Recipients": JSON.stringify(original),
        },
        html:
            originalHtml +
            `<hr style=\"margin-top:24px;\"/><p style=\"font-size:11px;color:#666;\"><strong>Email Override Active (EMAIL_OVERRIDE=${
                process.env.EMAIL_OVERRIDE
            }).</strong><br/>Original Recipients:<br/><pre style=\"white-space:pre-wrap;font-size:11px;\">${escapeHtml(
                JSON.stringify(original, null, 2)
            )}</pre></p>`,
        _originalRecipients: original,
    };
}

// Simple HTML escape for embedding JSON safely
function escapeHtml(str) {
    return (str || "").replace(
        /[&<>\"']/g,
        (c) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            }[c])
    );
}

// SMTP server configuration
const SMTP_Server = {
    host: process.env.SMTP_SERVER,
    port: 587,
    secure: false, // Set to true if using SSL
    auth: {
        user: process.env.SMTP_USER, // e.g., "ithelp@sealimited.com"
        pass: process.env.SMTP_PASS, // Your SMTP password or app-specific password
    },
    tls: {
        // Optional: Enforce specific TLS settings if needed
        rejectUnauthorized: true, // Set to false if testing with self-signed certificates
    },
};

// Global send-enable flag: default off. Set SEND_EMAILS=1 to allow sending.
const SEND_EMAILS_ACTIVE = (() => {
    const v = (process.env.SEND_EMAILS || "0").toString().trim().toLowerCase();
    return ["1", "true", "yes", "on"].includes(v);
})();

/**
 * Sends an approval request email for equipment checkout to a specified recipient.
 * @param {object} checkout - Checkout object (can be a Sequelize instance or plain object).
 * @param {object} equipment - Equipment object.
 * @param {string} recipientEmail - Email address of the approver / recipient.
 */
const sendCheckoutApprovalRequestEmail = async (
    checkout,
    equipment,
    recipientEmail
) => {
    if (!checkout || !equipment || !recipientEmail) {
        console.error("Checkout, equipment, and recipientEmail are required.");
        return;
    }

    // Normalize checkout data (support Sequelize instance .get())
    const c = typeof checkout.get === "function" ? checkout.get() : checkout;
    const e = typeof equipment.get === "function" ? equipment.get() : equipment;

    const { id, start_time, end_time, purpose, user_id } = c;

    const formatDate = (d) => {
        if (!d) return "N/A";
        try {
            return new Date(d).toLocaleString();
        } catch {
            return d;
        }
    };

    const approvalBaseUrl =
        process.env.REACT_APP_URL || "https://equipment.sealimited.com";
    const approvalLink = id
        ? `${approvalBaseUrl}/checkout-approval?checkoutId=${encodeURIComponent(
              id
          )}`
        : approvalBaseUrl;

    // Get requester name
    let requesterName = "User";
    try {
        const userRec = await User.findByPk(user_id);
        if (userRec) {
            requesterName =
                `${userRec.first_name || ""} ${
                    userRec.last_name || ""
                }`.trim() || userRec.email;
        }
    } catch {}

    // Personalize greeting
    let approverName = null;
    try {
        const userRec = await User.findOne({
            where: { email: recipientEmail },
        });
        if (userRec) {
            approverName = `${userRec.first_name || ""} ${
                userRec.last_name || ""
            }`.trim();
        }
    } catch {}
    const greetingName = approverName || "Approver";

    const emailSubject = `Action Required: Approve Equipment Checkout for ${e.name}`;
    const emailBody = `
    <p>Dear ${greetingName},</p>
    <p>An equipment checkout request requires your approval.</p>
    <table style="border-collapse:collapse;font-size:14px;margin-top:8px;">
        <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Equipment</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
            e.name
        }</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Serial Number</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
            e.serial_number || "N/A"
        }</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Location</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
            e.location || "N/A"
        }</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Requester</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${requesterName}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Start Time</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${formatDate(
            start_time
        )}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>End Time</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${formatDate(
            end_time
        )}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Purpose</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
            purpose || "N/A"
        }</td></tr>
    </table>
    <p style="margin-top:16px;">Please review and take the appropriate action.</p>
    <p style="margin:24px 0;">
    <a href="${approvalLink}" style="background:#005ea5;color:#ffffff;padding:10px 16px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:600;">Review / Approve Checkout</a>
    </p>
    <p style="font-size:12px;">If the button doesn't work, copy and paste this link into your browser:<br/><span style="word-break:break-all;">${approvalLink}</span></p>
    <p>Thank you.<br/>This is an automated message; please do not reply.</p>
    `;

    try {
        const transporter = nodemailer.createTransport(SMTP_Server);
        const mailOpts = applyEmailOverride({
            from: "noreply@sealimited.com",
            to: recipientEmail,
            subject: emailSubject,
            html: emailBody,
        });

        if (!SEND_EMAILS_ACTIVE) {
            console.log(
                `SEND_EMAILS disabled - skipping checkout approval request to ${mailOpts.to}. Subject: ${mailOpts.subject}`
            );
            return;
        }

        const info = await transporter.sendMail(mailOpts);

        // Fire socket notification (non-blocking)
        try {
            SendMessage(
                {
                    message: "checkout_approval_requested",
                    data: { checkoutId: id, recipient: recipientEmail },
                },
                { emails: [recipientEmail] }
            );
        } catch (e) {
            console.warn("Socket notify failed (checkout approval request)", e);
        }

        console.log(
            `Checkout approval request email sent to ${recipientEmail}: ${info.messageId}`
        );
    } catch (error) {
        logErrorToFile(error);
        console.error(
            `Error sending checkout approval request email to ${recipientEmail}:`,
            error
        );
    }
};

/**
 * Sends an email to the checkout requester informing them it was approved.
 * @param {object} checkout - Checkout object
 * @param {object} equipment - Equipment object
 * @param {string} recipientEmail - Requester's email address
 */
const sendCheckoutApprovedEmail = async (
    checkout,
    equipment,
    recipientEmail
) => {
    if (!checkout || !equipment || !recipientEmail) return;

    const c = typeof checkout.get === "function" ? checkout.get() : checkout;
    const e = typeof equipment.get === "function" ? equipment.get() : equipment;

    const { id, start_time, end_time, purpose } = c;

    const fmt = (d) => {
        try {
            return new Date(d).toLocaleString();
        } catch {
            return d || "N/A";
        }
    };

    let requesterName = "User";
    try {
        if (c.user_id) {
            const requester = await User.findByPk(c.user_id);
            if (requester) {
                requesterName =
                    `${requester.first_name || ""} ${
                        requester.last_name || ""
                    }`.trim() || requesterName;
            }
        }
    } catch {}

    const subject = `Equipment Checkout Approved: ${e.name}`;
    const body = `
        <p>Dear ${requesterName},</p>
        <p>Your equipment checkout request has been <strong style="color:#2e7d32;">approved</strong>.</p>
        <table style="border-collapse:collapse;font-size:14px;margin-top:8px;">
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Equipment</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.name
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Serial Number</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.serial_number || "N/A"
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Location</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.location || "N/A"
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Start Time</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${fmt(
                start_time
            )}</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>End Time</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${fmt(
                end_time
            )}</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Purpose</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                purpose || "N/A"
            }</td></tr>
        </table>
        <p style="margin-top:16px;">You can view or manage your checkout in the Equipment Scheduler application.</p>
        <p>Thank you.<br/>This is an automated message; please do not reply.</p>
    `;

    try {
        const transporter = nodemailer.createTransport(SMTP_Server);
        const mailOpts = applyEmailOverride({
            from: "noreply@sealimited.com",
            to: recipientEmail,
            subject,
            html: body,
        });

        if (!SEND_EMAILS_ACTIVE) {
            console.log(
                `SEND_EMAILS disabled - skipping checkout approved email to ${mailOpts.to}`
            );
            return;
        }

        await transporter.sendMail(mailOpts);

        try {
            SendMessage(
                {
                    message: "checkout_approved",
                    data: { checkoutId: id, user_id: c.user_id },
                },
                { emails: [recipientEmail] }
            );
        } catch (e) {
            console.warn("Socket notify failed (checkout approved)", e);
        }
    } catch (e) {
        logErrorToFile(e);
        console.error("Error sending checkout approved email", e);
    }
};

/**
 * Sends an email to the checkout requester informing them it was declined.
 * @param {object} checkout - Checkout object
 * @param {object} equipment - Equipment object
 * @param {string} recipientEmail - Requester's email address
 * @param {string} [reason] - Optional reason for decline
 */
const sendCheckoutDeclinedEmail = async (
    checkout,
    equipment,
    recipientEmail,
    reason
) => {
    if (!checkout || !equipment || !recipientEmail) {
        console.error(
            "checkout, equipment, and recipientEmail required for declined email"
        );
        return;
    }

    const c = typeof checkout.get === "function" ? checkout.get() : checkout;
    const e = typeof equipment.get === "function" ? equipment.get() : equipment;

    const { id, start_time, end_time, purpose } = c;

    const fmt = (d) => {
        try {
            return new Date(d).toLocaleString();
        } catch {
            return d || "N/A";
        }
    };

    let requesterName = "User";
    try {
        if (c.user_id) {
            const requester = await User.findByPk(c.user_id);
            if (requester) {
                requesterName =
                    `${requester.first_name || ""} ${
                        requester.last_name || ""
                    }`.trim() || requesterName;
            }
        }
    } catch {}

    // Build approver list
    let approverLinks = [];
    try {
        const approverMap = new Map();
        const addUser = (u, isOfficeAdmin = false) => {
            if (!u || !u.id) return;
            if (u.admin) return; // exclude admins
            if (!u.email) return;
            if (approverMap.has(u.id)) return;
            const fullName =
                `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email;
            approverMap.set(u.id, {
                name: fullName,
                email: u.email,
                isOfficeAdmin,
            });
        };

        // Office admins for this location
        if (e.location) {
            const officeAdmins = await User.findAll({
                where: { equipment_office_admin: e.location },
            });
            officeAdmins.forEach((u) => addUser(u, true));
        }

        const prioritized = Array.from(approverMap.values()).sort((a, b) => {
            if (a.isOfficeAdmin && !b.isOfficeAdmin) return -1;
            if (!a.isOfficeAdmin && b.isOfficeAdmin) return 1;
            return a.name.localeCompare(b.name);
        });

        approverLinks = prioritized
            .slice(0, 5)
            .map(
                (p) =>
                    `<a href="mailto:${p.email}" style="text-decoration:none;color:#005ea5;">${p.name}</a>`
            );
    } catch {}

    const approverLine = approverLinks.length
        ? ` or contact: ${approverLinks.join(", ")}`
        : "";

    const subject = `Equipment Checkout Declined: ${e.name}`;
    const body = `
        <p>Dear ${requesterName},</p>
        <p>Your equipment checkout request has been <strong style="color:#d32f2f;">declined</strong>.</p>
        <table style="border-collapse:collapse;font-size:14px;margin-top:8px;">
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Equipment</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.name
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Serial Number</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.serial_number || "N/A"
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Location</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.location || "N/A"
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Start Time</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${fmt(
                start_time
            )}</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>End Time</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${fmt(
                end_time
            )}</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Purpose</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                purpose || "N/A"
            }</td></tr>
        </table>
        ${
            reason
                ? `<p style="margin-top:12px;"><strong>Reason:</strong> ${reason}</p>`
                : ""
        }
        <p style="margin-top:16px;">If you believe this was in error you may create a new checkout request${approverLine}.</p>
        <p>Thank you.<br/>This is an automated message; please do not reply.</p>
    `;

    try {
        const transporter = nodemailer.createTransport(SMTP_Server);
        const mailOpts = applyEmailOverride({
            from: "noreply@sealimited.com",
            to: recipientEmail,
            subject,
            html: body,
        });

        if (!SEND_EMAILS_ACTIVE) {
            console.log(
                `SEND_EMAILS disabled - skipping checkout declined email to ${mailOpts.to}`
            );
            return;
        }

        const info = await transporter.sendMail(mailOpts);

        try {
            SendMessage(
                {
                    message: "checkout_declined",
                    data: { checkoutId: id, user_id: c.user_id },
                },
                { emails: [recipientEmail] }
            );
        } catch (e) {
            console.warn("Socket notify failed (checkout declined email)", e);
        }

        console.log(
            `Checkout declined email sent to ${recipientEmail}: ${info.messageId}`
        );
    } catch (error) {
        logErrorToFile(error);
        console.error(
            `Error sending checkout declined email to ${recipientEmail}:`,
            error
        );
    }
};

/**
 * Sends an email when equipment is returned.
 * @param {object} checkout - Checkout object
 * @param {object} equipment - Equipment object
 * @param {string[]} subscriberEmails - Array of emails who subscribed to return alerts
 */
const sendEquipmentReturnedEmail = async (
    checkout,
    equipment,
    subscriberEmails
) => {
    if (
        !checkout ||
        !equipment ||
        !subscriberEmails ||
        subscriberEmails.length === 0
    )
        return;

    const c = typeof checkout.get === "function" ? checkout.get() : checkout;
    const e = typeof equipment.get === "function" ? equipment.get() : equipment;

    const subject = `Equipment Returned: ${e.name}`;
    const body = `
        <p>Dear Equipment Scheduler User,</p>
        <p>The following equipment has been returned and may be available for checkout:</p>
        <table style="border-collapse:collapse;font-size:14px;margin-top:8px;">
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Equipment</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.name
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Serial Number</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.serial_number || "N/A"
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Location</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.location || "N/A"
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Status</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.status || "Available"
            }</td></tr>
        </table>
        <p style="margin-top:16px;"><em>Note: This equipment may have additional bookings scheduled. Please check availability before requesting checkout.</em></p>
        <p>Thank you.<br/>This is an automated message; please do not reply.</p>
    `;

    try {
        const transporter = nodemailer.createTransport(SMTP_Server);

        for (const email of subscriberEmails) {
            const mailOpts = applyEmailOverride({
                from: "noreply@sealimited.com",
                to: email,
                subject,
                html: body,
            });

            if (!SEND_EMAILS_ACTIVE) {
                console.log(
                    `SEND_EMAILS disabled - skipping equipment returned email to ${mailOpts.to}`
                );
                continue;
            }

            await transporter.sendMail(mailOpts);
        }

        console.log(
            `Equipment returned emails sent to ${subscriberEmails.length} subscribers`
        );
    } catch (error) {
        logErrorToFile(error);
        console.error("Error sending equipment returned emails", error);
    }
};

/**
 * Sends an email when equipment is available (returned AND no bookings within 2 hours).
 * @param {object} equipment - Equipment object
 * @param {string[]} subscriberEmails - Array of emails who subscribed to availability alerts
 */
const sendEquipmentAvailableEmail = async (equipment, subscriberEmails) => {
    if (!equipment || !subscriberEmails || subscriberEmails.length === 0)
        return;

    const e = typeof equipment.get === "function" ? equipment.get() : equipment;

    const subject = `Equipment Available: ${e.name}`;
    const body = `
        <p>Dear Equipment Scheduler User,</p>
        <p>The following equipment is now <strong style="color:#2e7d32;">available</strong> for checkout with no upcoming bookings in the next 2 hours:</p>
        <table style="border-collapse:collapse;font-size:14px;margin-top:8px;">
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Equipment</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.name
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Serial Number</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.serial_number || "N/A"
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Location</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.location || "N/A"
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Status</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.status || "Available"
            }</td></tr>
        </table>
        <p style="margin-top:16px;">You can request a checkout for this equipment now.</p>
        <p>Thank you.<br/>This is an automated message; please do not reply.</p>
    `;

    try {
        const transporter = nodemailer.createTransport(SMTP_Server);

        for (const email of subscriberEmails) {
            const mailOpts = applyEmailOverride({
                from: "noreply@sealimited.com",
                to: email,
                subject,
                html: body,
            });

            if (!SEND_EMAILS_ACTIVE) {
                console.log(
                    `SEND_EMAILS disabled - skipping equipment available email to ${mailOpts.to}`
                );
                continue;
            }

            await transporter.sendMail(mailOpts);
        }

        console.log(
            `Equipment available emails sent to ${subscriberEmails.length} subscribers`
        );
    } catch (error) {
        logErrorToFile(error);
        console.error("Error sending equipment available emails", error);
    }
};

/**
 * Sends a calibration due reminder email.
 * @param {object} equipment - Equipment object
 * @param {string[]} subscriberEmails - Array of emails who subscribed to calibration alerts
 * @param {number} daysUntilDue - Number of days until calibration is due
 */
const sendCalibrationDueEmail = async (
    equipment,
    subscriberEmails,
    daysUntilDue
) => {
    if (!equipment || !subscriberEmails || subscriberEmails.length === 0)
        return;

    const e = typeof equipment.get === "function" ? equipment.get() : equipment;

    const urgencyColor = daysUntilDue <= 7 ? "#d32f2f" : "#ff9800";
    const urgencyLabel =
        daysUntilDue <= 0 ? "OVERDUE" : `Due in ${daysUntilDue} day(s)`;

    const subject = `Calibration ${
        daysUntilDue <= 0 ? "Overdue" : "Due Soon"
    }: ${e.name}`;
    const body = `
        <p>Dear Equipment Manager,</p>
        <p>The following equipment has a calibration <strong style="color:${urgencyColor};">${urgencyLabel}</strong>:</p>
        <table style="border-collapse:collapse;font-size:14px;margin-top:8px;">
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Equipment</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.name
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Serial Number</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.serial_number || "N/A"
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Location</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.location || "N/A"
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Calibration Due Date</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.calibration_due_date
                    ? new Date(e.calibration_due_date).toLocaleDateString()
                    : "N/A"
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Last Calibration</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                e.last_calibration_date
                    ? new Date(e.last_calibration_date).toLocaleDateString()
                    : "N/A"
            }</td></tr>
        </table>
        <p style="margin-top:16px;">Please schedule calibration as soon as possible to maintain equipment compliance.</p>
        <p>Thank you.<br/>This is an automated message; please do not reply.</p>
    `;

    try {
        const transporter = nodemailer.createTransport(SMTP_Server);

        for (const email of subscriberEmails) {
            const mailOpts = applyEmailOverride({
                from: "noreply@sealimited.com",
                to: email,
                subject,
                html: body,
            });

            if (!SEND_EMAILS_ACTIVE) {
                console.log(
                    `SEND_EMAILS disabled - skipping calibration due email to ${mailOpts.to}`
                );
                continue;
            }

            await transporter.sendMail(mailOpts);
        }

        console.log(
            `Calibration due emails sent to ${subscriberEmails.length} subscribers`
        );
    } catch (error) {
        logErrorToFile(error);
        console.error("Error sending calibration due emails", error);
    }
};

/**
 * Sends a generic email with flexible options.
 * @param {object} params
 * @param {string|string[]} params.to - Primary recipient(s).
 * @param {string} params.subject - Email subject.
 * @param {string} [params.html] - HTML body.
 * @param {string} [params.text] - Plain text body (fallback if html not supported).
 * @param {string|string[]} [params.cc]
 * @param {string|string[]} [params.bcc]
 * @param {Array} [params.attachments] - Nodemailer attachments array.
 * @param {string} [params.from] - Override from (defaults to noreply@sealimited.com)
 */
const sendGenericEmail = async (params = {}) => {
    const { to, subject, html, text, cc, bcc, attachments, from } = params;
    if (!to || !subject || (!html && !text)) {
        console.error(
            "Missing required fields: to, subject, and one of html/text"
        );
        return;
    }
    try {
        const transporter = nodemailer.createTransport(SMTP_Server);
        const mailOpts = applyEmailOverride({
            from: from || "noreply@sealimited.com",
            to,
            subject,
            html,
            text,
            cc,
            bcc,
            attachments,
        });

        if (!SEND_EMAILS_ACTIVE) {
            console.log(
                `SEND_EMAILS disabled - skipping generic email to ${mailOpts.to}. Subject: ${mailOpts.subject}`
            );
            return;
        }

        const info = await transporter.sendMail(mailOpts);
        console.log(`Generic email sent to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        logErrorToFile(error);
        console.error(`Error sending generic email to ${to}:`, error);
    }
};

module.exports = {
    sendCheckoutApprovalRequestEmail,
    sendCheckoutApprovedEmail,
    sendCheckoutDeclinedEmail,
    sendEquipmentReturnedEmail,
    sendEquipmentAvailableEmail,
    sendCalibrationDueEmail,
    sendGenericEmail,
};
