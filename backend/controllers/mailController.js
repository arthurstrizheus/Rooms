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

/**
 * Generates an unsubscribe footer with link to manage alert subscriptions
 * @param {number} equipmentId - ID of the equipment
 * @param {string} alertType - Type of alert (checkout_created, equipment_returned, etc.)
 * @returns {string} HTML footer with unsubscribe link
 */
function getUnsubscribeFooter(equipmentId, alertType) {
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const unsubscribeUrl = `${baseUrl}/equipment/${equipmentId}`;

    return `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <p style="margin: 5px 0;">You are receiving this email because you subscribed to <strong>${alertType.replace(
                /_/g,
                " "
            )}</strong> alerts for this equipment.</p>
            <p style="margin: 5px 0;"><a href="${unsubscribeUrl}" style="color: #1976d2;">Manage your alert subscriptions</a> or disable this alert in the equipment details page.</p>
        </div>
    `;
}

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
    <a href="${approvalLink}" style="background:#005ea5;color:#000000;padding:10px 16px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:600;">Review / Approve Checkout</a>
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
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                <div style="background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #000000; margin: 0; font-size: 24px; font-weight: 600;">✅ Checkout Approved</h1>
                    <p style="color: #000000; margin: 10px 0 0 0; font-size: 14px;">Your equipment request has been approved</p>
                </div>
                <div style="padding: 30px;">
                    <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">Dear ${requesterName},</p>
                    <p style="color: #666; font-size: 14px; margin: 0 0 25px 0;">Your equipment checkout request has been <strong style="color:#2e7d32;">approved</strong>.</p>
                    <div style="background-color: #f8f9fa; border-left: 4px solid #4caf50; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                        <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0;">📦 Equipment Information</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Equipment:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                e.name
                            }</td></tr>
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Serial Number:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                e.serial_number || "N/A"
                            }</td></tr>
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Location:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                e.location || "N/A"
                            }</td></tr>
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Start Time:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${fmt(
                                start_time
                            )}</td></tr>
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>End Time:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${fmt(
                                end_time
                            )}</td></tr>
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Purpose:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                purpose || "N/A"
                            }</td></tr>
                        </table>
                        <p style="margin: 15px 0 0 0; font-size: 13px;"><a href="${
                            process.env.BASE_URL || "http://localhost:3000"
                        }/equipment/${
        e.id
    }" style="color: #4caf50; text-decoration: none; font-weight: 600;">→ Click here to view equipment details</a></p>
                    </div>
                </div>
                <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
                    <p style="color: #666; font-size: 12px; margin: 0;">This is an automated notification from the Equipment Scheduler System.</p>
                </div>
            </div>
        </body>
        </html>
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
 * Sends an email when a checkout is cancelled by the user or admin.
 * @param {object} checkout - Checkout object
 * @param {object} equipment - Equipment object
 * @param {string[]} subscriberEmails - Array of emails to notify (checkout owner + subscribers)
 * @param {string} cancelledBy - Name of the person who cancelled (user or admin)
 */
const sendCheckoutCancelledEmail = async (
    checkout,
    equipment,
    subscriberEmails,
    cancelledBy
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

    const { start_time, end_time, purpose } = c;

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

    const subject = `Equipment Checkout Cancelled: ${e.name}`;
    const body = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                <div style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #000000; margin: 0; font-size: 24px; font-weight: 600;">🚫 Checkout Cancelled</h1>
                    <p style="color: #000000; margin: 10px 0 0 0; font-size: 14px;">Equipment checkout has been cancelled</p>
                </div>
                <div style="padding: 30px;">
                    <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">Dear ${requesterName},</p>
                    <p style="color: #666; font-size: 14px; margin: 0 0 25px 0;">An equipment checkout has been <strong style="color:#f57c00;">cancelled</strong> by ${cancelledBy}.</p>
                    <div style="background-color: #f8f9fa; border-left: 4px solid #ff9800; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                        <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0;">📦 Equipment Information</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Equipment:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                e.name
                            }</td></tr>
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Serial Number:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                e.serial_number || "N/A"
                            }</td></tr>
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Location:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                e.location || "N/A"
                            }</td></tr>
                        </table>
                        <p style="margin: 15px 0 0 0; font-size: 13px;"><a href="${
                            process.env.BASE_URL || "http://localhost:3000"
                        }/equipment/${
        e.id
    }" style="color: #ff9800; text-decoration: none; font-weight: 600;">→ Click here to view equipment details</a></p>
                    </div>
                    <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                        <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0;">📅 Cancelled Checkout Details</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Reserved By:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${requesterName}</td></tr>
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Start Time:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${fmt(
                                start_time
                            )}</td></tr>
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>End Time:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${fmt(
                                end_time
                            )}</td></tr>
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Purpose:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                purpose || "N/A"
                            }</td></tr>
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Cancelled By:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${cancelledBy}</td></tr>
                        </table>
                    </div>
                    <p style="color: #666; font-size: 14px; margin: 20px 0 0 0;">The equipment is now available for other checkouts during this time period.</p>
                </div>
                <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
                    <p style="color: #666; font-size: 12px; margin: 0;">This is an automated notification from the Equipment Scheduler System.</p>
                </div>
            </div>
        </body>
        </html>
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
                    `SEND_EMAILS disabled - skipping checkout cancelled email to ${mailOpts.to}`
                );
                continue;
            }

            await transporter.sendMail(mailOpts);
        }

        console.log(
            `Checkout cancelled emails sent to ${subscriberEmails.length} recipients`
        );
    } catch (error) {
        logErrorToFile(error);
        console.error("Error sending checkout cancelled emails", error);
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

        // Equipment admins (all offices)
        const equipmentAdmins = await User.findAll({
            where: { equipment_admin: true },
        });
        equipmentAdmins.forEach((u) => addUser(u, true));

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
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                <div style="background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #000000; margin: 0; font-size: 24px; font-weight: 600;">❌ Checkout Declined</h1>
                    <p style="color: #000000; margin: 10px 0 0 0; font-size: 14px;">Your equipment request was not approved</p>
                </div>
                <div style="padding: 30px;">
                    <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">Dear ${requesterName},</p>
                    <p style="color: #666; font-size: 14px; margin: 0 0 25px 0;">Your equipment checkout request has been <strong style="color:#d32f2f;">declined</strong>.</p>
                    <div style="background-color: #f8f9fa; border-left: 4px solid #f44336; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                        <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0;">📦 Equipment Information</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Equipment:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                e.name
                            }</td></tr>
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Serial Number:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                e.serial_number || "N/A"
                            }</td></tr>
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Location:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                e.location || "N/A"
                            }</td></tr>
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Start Time:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${fmt(
                                start_time
                            )}</td></tr>
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>End Time:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${fmt(
                                end_time
                            )}</td></tr>
                            <tr><td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Purpose:</strong></td><td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                purpose || "N/A"
                            }</td></tr>
                        </table>
                        <p style="margin: 15px 0 0 0; font-size: 13px;"><a href="${
                            process.env.BASE_URL || "http://localhost:3000"
                        }/equipment/${
        e.id
    }" style="color: #f44336; text-decoration: none; font-weight: 600;">→ Click here to view equipment details</a></p>
                    </div>
                    ${
                        reason
                            ? `<div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <p style="color: #856404; font-size: 14px; margin: 0;"><strong>Reason:</strong> ${reason}</p>
                    </div>`
                            : ""
                    }
                    <p style="color: #666; font-size: 14px; margin: 20px 0;">If you believe this was in error, you may create a new checkout request${approverLine}.</p>
                </div>
                <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
                    <p style="color: #666; font-size: 12px; margin: 0;">This is an automated notification from the Equipment Scheduler System.</p>
                </div>
            </div>
        </body>
        </html>
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

    const user = c.User || {};
    const userName =
        user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.username || "Unknown User";
    const returnDate = c.end_time
        ? new Date(c.end_time).toLocaleString()
        : new Date().toLocaleString();

    const subject = `Equipment Returned: ${e.name}`;
    const body = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #000000; margin: 0; font-size: 24px; font-weight: 600;">✅ Equipment Returned</h1>
                    <p style="color: #000000; margin: 10px 0 0 0; font-size: 14px;">Now available for checkout</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello,</p>
                    <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0;">The following equipment has been returned and is now available for checkout:</p>
                    
                    <!-- Equipment Info Card -->
                    <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                        <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">📦 Equipment Information</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Equipment:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    e.name
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Serial Number:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    e.serial_number || "N/A"
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Location:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    e.location || "N/A"
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Current Status:</strong></td>
                                <td style="padding: 8px 0;">
                                    <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #d4edda; color: #155724;">${
                                        e.status || "AVAILABLE"
                                    }</span>
                                </td>
                            </tr>
                        </table>
                        <p style="margin: 15px 0 0 0; font-size: 13px;"><a href="${
                            process.env.BASE_URL || "http://localhost:3000"
                        }/equipment/${
        e.id
    }" style="color: #11998e; text-decoration: none; font-weight: 600;">→ Click here to view equipment details</a></p>
                    </div>

                    <!-- Return Details Card -->
                    <div style="background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                        <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">👤 Return Information</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Returned By:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${userName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Return Time:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${returnDate}</td>
                            </tr>
                            ${
                                c.purpose
                                    ? `
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Used For:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${c.purpose}</td>
                            </tr>`
                                    : ""
                            }
                            ${
                                c.project_number
                                    ? `
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Project Number:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${c.project_number}</td>
                            </tr>`
                                    : ""
                            }
                        </table>
                    </div>

                    <div style="background-color: #e7f3ff; border-left: 4px solid #2196f3; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <p style="color: #0d47a1; font-size: 13px; line-height: 1.6; margin: 0;">ℹ️ This equipment may have additional bookings scheduled. Please check availability before requesting checkout.</p>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
                    <p style="color: #666; font-size: 12px; line-height: 1.5; margin: 0 0 10px 0;">This is an automated notification from the Equipment Scheduler System.</p>
                    ${getUnsubscribeFooter(e.id, "equipment_returned")}
                </div>
            </div>
        </body>
        </html>
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
        ${getUnsubscribeFooter(e.id, "equipment_available")}
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

    const urgencyColor =
        daysUntilDue <= 0
            ? "#dc3545"
            : daysUntilDue <= 7
            ? "#fd7e14"
            : "#ffc107";
    const urgencyBgColor =
        daysUntilDue <= 0
            ? "#f8d7da"
            : daysUntilDue <= 7
            ? "#fff3cd"
            : "#fff3cd";
    const urgencyLabel =
        daysUntilDue <= 0
            ? "⚠️ OVERDUE"
            : daysUntilDue === 1
            ? `⏰ Due Tomorrow`
            : `⏰ Due in ${daysUntilDue} days`;
    const urgencyMessage =
        daysUntilDue <= 0
            ? "This equipment's calibration is overdue. Immediate action required!"
            : daysUntilDue <= 7
            ? "This equipment's calibration is due soon. Please schedule as soon as possible."
            : "This is an advance notice for upcoming calibration.";

    const subject = `${daysUntilDue <= 0 ? "🚨 URGENT" : "⚠️"} Calibration ${
        daysUntilDue <= 0 ? "Overdue" : "Due Soon"
    }: ${e.name}`;
    const body = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, ${
                    daysUntilDue <= 0
                        ? "#e74c3c 0%, #c0392b 100%"
                        : "#f39c12 0%, #e67e22 100%"
                }); padding: 30px; text-align: center;">
                    <h1 style="color: #000000; margin: 0; font-size: 24px; font-weight: 600;">Calibration ${
                        daysUntilDue <= 0 ? "Overdue" : "Due Soon"
                    }</h1>
                    <p style="color: #000000; margin: 10px 0 0 0; font-size: 14px;">${urgencyLabel}</p>
                </div>
                
                <!-- Urgency Alert -->
                <div style="background-color: ${urgencyBgColor}; border-left: 4px solid ${urgencyColor}; padding: 15px 20px; margin: 0;">
                    <p style="color: ${urgencyColor}; font-size: 14px; font-weight: 600; margin: 0;">${urgencyMessage}</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello,</p>
                    <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0;">This is a ${
                        daysUntilDue <= 0 ? "critical" : "scheduled"
                    } notification regarding equipment calibration:</p>
                    
                    <!-- Equipment Info Card -->
                    <div style="background-color: #f8f9fa; border-left: 4px solid ${urgencyColor}; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                        <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">📦 Equipment Information</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Equipment:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    e.name
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Serial Number:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    e.serial_number || "N/A"
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Location:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    e.location || "N/A"
                                }</td>
                            </tr>
                            ${
                                e.contact_person
                                    ? `
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Contact:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${e.contact_person}</td>
                            </tr>`
                                    : ""
                            }
                        </table>
                        <p style="margin: 15px 0 0 0; font-size: 13px;"><a href="${
                            process.env.BASE_URL || "http://localhost:3000"
                        }/equipment/${
        e.id
    }" style="color: ${urgencyColor}; text-decoration: none; font-weight: 600;">→ Click here to view equipment details</a></p>
                    </div>

                    <!-- Calibration Details Card -->
                    <div style="background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                        <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">🔧 Calibration Details</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Due Date:</strong></td>
                                <td style="padding: 8px 0; color: ${urgencyColor}; font-size: 14px; font-weight: 600;">${
        e.calibration_due_date
            ? new Date(e.calibration_due_date).toLocaleDateString()
            : "N/A"
    }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Last Calibrated:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    e.last_calibration_date
                                        ? new Date(
                                              e.last_calibration_date
                                          ).toLocaleDateString()
                                        : "Never"
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Interval:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    e.calibration_interval_days
                                        ? `${e.calibration_interval_days} days`
                                        : "N/A"
                                }</td>
                            </tr>
                        </table>
                    </div>

                    ${
                        daysUntilDue <= 0
                            ? `
                    <div style="background-color: #fff5f5; border: 2px solid ${urgencyColor}; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <p style="color: ${urgencyColor}; font-size: 14px; font-weight: 600; margin: 0 0 10px 0;">⚠️ Action Required</p>
                        <p style="color: #666; font-size: 13px; line-height: 1.6; margin: 0;">This equipment may need to be taken out of service until calibration is completed. Please coordinate with equipment users and schedule calibration immediately.</p>
                    </div>`
                            : ""
                    }
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
                    <p style="color: #666; font-size: 12px; line-height: 1.5; margin: 0 0 10px 0;">This is an automated calibration reminder from the Equipment Scheduler System.</p>
                    ${getUnsubscribeFooter(e.id, "calibration_due")}
                </div>
            </div>
        </body>
        </html>
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

/**
 * Sends an email when a new checkout is created
 */
const sendCheckoutCreatedEmail = async (
    checkout,
    equipment,
    subscriberEmails
) => {
    if (!subscriberEmails || subscriberEmails.length === 0) {
        console.log("No subscribers for checkout created notification");
        return;
    }

    const checkoutData = checkout.get
        ? checkout.get({ plain: true })
        : checkout;
    const equipmentData = equipment.get
        ? equipment.get({ plain: true })
        : equipment;

    const startDate = new Date(checkoutData.start_time).toLocaleString();
    const endDate = new Date(checkoutData.end_time).toLocaleString();

    const user = checkoutData.User || {};
    const userName =
        user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.username || "Unknown User";
    const userEmail = user.email || "N/A";

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #000000; margin: 0; font-size: 24px; font-weight: 600;">Equipment Checkout Created</h1>
                    <p style="color: #000000; margin: 10px 0 0 0; font-size: 14px;">A new checkout has been scheduled</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello,</p>
                    <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0;">A new checkout has been created for equipment you're monitoring. Please review the details below:</p>
                    
                    <!-- Equipment Info Card -->
                    <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                        <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">📦 Equipment Information</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Equipment:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    equipmentData.name
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Serial Number:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    equipmentData.serial_number || "N/A"
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Location:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    equipmentData.location || "N/A"
                                }</td>
                            </tr>
                        </table>
                        <p style="margin: 15px 0 0 0; font-size: 13px;"><a href="${
                            process.env.BASE_URL || "http://localhost:3000"
                        }/equipment/${
        equipmentData.id
    }" style="color: #667eea; text-decoration: none; font-weight: 600;">→ Click here to view equipment details</a></p>
                    </div>

                    <!-- Checkout Details Card -->
                    <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                        <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">📅 Checkout Details</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Reserved By:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${userName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Email:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${userEmail}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Start Time:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${startDate}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>End Time:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${endDate}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Purpose:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    checkoutData.purpose || "Not specified"
                                }</td>
                            </tr>
                            ${
                                checkoutData.project_number
                                    ? `
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Project Number:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${checkoutData.project_number}</td>
                            </tr>`
                                    : ""
                            }
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Status:</strong></td>
                                <td style="padding: 8px 0;">
                                    <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; 
                                        ${
                                            checkoutData.status === "approved"
                                                ? "background-color: #d4edda; color: #155724;"
                                                : ""
                                        }
                                        ${
                                            checkoutData.status === "pending"
                                                ? "background-color: #fff3cd; color: #856404;"
                                                : ""
                                        }
                                        ${
                                            checkoutData.status ===
                                            "checked_out"
                                                ? "background-color: #d1ecf1; color: #0c5460;"
                                                : ""
                                        }
                                    ">${checkoutData.status.toUpperCase()}</span>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
                    <p style="color: #666; font-size: 12px; line-height: 1.5; margin: 0 0 10px 0;">This is an automated notification from the Equipment Scheduler System.</p>
                    ${getUnsubscribeFooter(
                        equipmentData.id,
                        "checkout_created"
                    )}
                </div>
            </div>
        </body>
        </html>
    `;

    const mailOpts = {
        from: "noreply@sealimited.com",
        to: subscriberEmails.join(", "),
        subject: `Checkout Created: ${equipmentData.name}`,
        html: htmlContent,
    };

    if (!SEND_EMAILS_ACTIVE) {
        console.log("Email disabled. Would send checkout created email:", {
            to: subscriberEmails,
            equipment: equipmentData.name,
        });
        return;
    }

    try {
        const transporter = nodemailer.createTransport(SMTP_Server);
        const finalOpts = applyEmailOverride(mailOpts);
        const info = await transporter.sendMail(finalOpts);
        console.log(`Checkout created email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        logErrorToFile(error);
        console.error("Error sending checkout created email:", error);
    }
};

/**
 * Sends an email when equipment is checked out
 */
const sendEquipmentCheckedOutEmail = async (
    checkout,
    equipment,
    subscriberEmails
) => {
    if (!subscriberEmails || subscriberEmails.length === 0) {
        console.log("No subscribers for equipment checked out notification");
        return;
    }

    const checkoutData = checkout.get
        ? checkout.get({ plain: true })
        : checkout;
    const equipmentData = equipment.get
        ? equipment.get({ plain: true })
        : equipment;

    const startDate = new Date(checkoutData.start_time).toLocaleString();
    const endDate = new Date(checkoutData.end_time).toLocaleString();

    const user = checkoutData.User || {};
    const userName =
        user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.username || "Unknown User";

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #000000; margin: 0; font-size: 24px; font-weight: 600;">📤 Equipment Checked Out</h1>
                    <p style="color: #000000; margin: 10px 0 0 0; font-size: 14px;">Currently in use</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello,</p>
                    <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0;">Equipment you're monitoring has been checked out and is currently in use:</p>
                    
                    <!-- Equipment Info Card -->
                    <div style="background-color: #f8f9fa; border-left: 4px solid #17a2b8; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                        <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">📦 Equipment Information</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Equipment:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    equipmentData.name
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Serial Number:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    equipmentData.serial_number || "N/A"
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Location:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    equipmentData.location || "N/A"
                                }</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Checkout Details Card -->
                    <div style="background-color: #d1ecf1; border-left: 4px solid #0c5460; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                        <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">👤 Checkout Details</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Checked Out By:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${userName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Checkout Time:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${startDate}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Expected Return:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${endDate}</td>
                            </tr>
                            ${
                                checkoutData.purpose
                                    ? `
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Purpose:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${checkoutData.purpose}</td>
                            </tr>`
                                    : ""
                            }
                            ${
                                checkoutData.project_number
                                    ? `
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Project Number:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${checkoutData.project_number}</td>
                            </tr>`
                                    : ""
                            }
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Status:</strong></td>
                                <td style="padding: 8px 0;">
                                    <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #0c5460; color: #000000;">📤 CHECKED OUT</span>
                                </td>
                            </tr>
                        </table>
                        <p style="margin: 15px 0 0 0; font-size: 13px;"><a href="${
                            process.env.BASE_URL || "http://localhost:3000"
                        }/equipment/${
        equipmentData.id
    }" style="color: #17a2b8; text-decoration: none; font-weight: 600;">→ Click here to view equipment details</a></p>
                    </div>

                    <div style="background-color: #e7f3ff; border-left: 4px solid #2196f3; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <p style="color: #0d47a1; font-size: 13px; line-height: 1.6; margin: 0;">ℹ️ This equipment will be unavailable until returned. You'll receive a notification when it's returned.</p>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
                    <p style="color: #666; font-size: 12px; line-height: 1.5; margin: 0 0 10px 0;">This is an automated notification from the Equipment Scheduler System.</p>
                    ${getUnsubscribeFooter(
                        equipmentData.id,
                        "equipment_checked_out"
                    )}
                </div>
            </div>
        </body>
        </html>
    `;

    const mailOpts = {
        from: "noreply@sealimited.com",
        to: subscriberEmails.join(", "),
        subject: `Equipment Checked Out: ${equipmentData.name}`,
        html: htmlContent,
    };

    if (!SEND_EMAILS_ACTIVE) {
        console.log("Email disabled. Would send equipment checked out email:", {
            to: subscriberEmails,
            equipment: equipmentData.name,
        });
        return;
    }

    try {
        const transporter = nodemailer.createTransport(SMTP_Server);
        const finalOpts = applyEmailOverride(mailOpts);
        const info = await transporter.sendMail(finalOpts);
        console.log(`Equipment checked out email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        logErrorToFile(error);
        console.error("Error sending equipment checked out email:", error);
    }
};

/**
 * Sends an email when equipment status changes
 */
const sendEquipmentStatusChangeEmail = async (
    equipment,
    oldStatus,
    newStatus,
    subscriberEmails
) => {
    if (!subscriberEmails || subscriberEmails.length === 0) {
        console.log("No subscribers for equipment status change notification");
        return;
    }

    const equipmentData = equipment.get
        ? equipment.get({ plain: true })
        : equipment;

    const subject = `Equipment Status Changed: ${equipmentData.name}`;
    const statusColor =
        {
            available: "#28a745",
            checked_out: "#17a2b8",
            maintenance: "#fd7e14",
            retired: "#dc3545",
        }[newStatus] || "#6c757d";

    const statusBgColor =
        {
            available: "#d4edda",
            checked_out: "#d1ecf1",
            maintenance: "#fff3cd",
            retired: "#f8d7da",
        }[newStatus] || "#e9ecef";

    const statusIcon =
        {
            available: "✅",
            checked_out: "📤",
            maintenance: "🔧",
            retired: "🚫",
        }[newStatus] || "ℹ️";

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #000000; margin: 0; font-size: 24px; font-weight: 600;">${statusIcon} Equipment Status Changed</h1>
                    <p style="color: #000000; margin: 10px 0 0 0; font-size: 14px;">Status update notification</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hello,</p>
                    <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0;">The status of equipment you're monitoring has been updated:</p>
                    
                    <!-- Equipment Info Card -->
                    <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                        <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">📦 Equipment Information</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Equipment:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    equipmentData.name
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Serial Number:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    equipmentData.serial_number || "N/A"
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Location:</strong></td>
                                <td style="padding: 8px 0; color: #333; font-size: 14px;">${
                                    equipmentData.location || "N/A"
                                }</td>
                            </tr>
                        </table>
                        <p style="margin: 15px 0 0 0; font-size: 13px;"><a href="${
                            process.env.BASE_URL || "http://localhost:3000"
                        }/equipment/${
        equipmentData.id
    }" style="color: ${statusColor}; text-decoration: none; font-weight: 600;">→ Click here to view equipment details</a></p>
                    </div>

                    <!-- Status Change Card -->
                    <div style="background-color: ${statusBgColor}; border-left: 4px solid ${statusColor}; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                        <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">🔄 Status Change</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Previous Status:</strong></td>
                                <td style="padding: 8px 0; color: #666; font-size: 14px; text-decoration: line-through;">${
                                    oldStatus || "Unknown"
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>New Status:</strong></td>
                                <td style="padding: 8px 0;">
                                    <span style="display: inline-block; padding: 6px 16px; border-radius: 16px; font-size: 14px; font-weight: 600; background-color: ${statusColor}; color: #000000;">
                                        ${statusIcon} ${newStatus.toUpperCase()}
                                    </span>
                                </td>
                            </tr>
                        </table>
                    </div>

                    ${
                        newStatus === "maintenance"
                            ? `
                    <div style="background-color: #fff3cd; border-left: 4px solid #fd7e14; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <p style="color: #856404; font-size: 13px; line-height: 1.6; margin: 0;">⚠️ This equipment is currently under maintenance and unavailable for checkout.</p>
                    </div>`
                            : ""
                    }
                    
                    ${
                        newStatus === "retired"
                            ? `
                    <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <p style="color: #721c24; font-size: 13px; line-height: 1.6; margin: 0;">🚫 This equipment has been retired and is no longer available for use.</p>
                    </div>`
                            : ""
                    }
                    
                    ${
                        newStatus === "available"
                            ? `
                    <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <p style="color: #155724; font-size: 13px; line-height: 1.6; margin: 0;">✅ This equipment is now available and ready for checkout.</p>
                    </div>`
                            : ""
                    }
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
                    <p style="color: #666; font-size: 12px; line-height: 1.5; margin: 0 0 10px 0;">This is an automated notification from the Equipment Scheduler System.</p>
                    ${getUnsubscribeFooter(equipmentData.id, "status_change")}
                </div>
            </div>
        </body>
        </html>
    `;

    const mailOpts = {
        from: "noreply@sealimited.com",
        to: subscriberEmails.join(", "),
        subject: `Equipment Status Changed: ${equipmentData.name} - ${newStatusLabel}`,
        html: htmlContent,
    };

    if (!SEND_EMAILS_ACTIVE) {
        console.log(
            "Email disabled. Would send equipment status change email:",
            {
                to: subscriberEmails,
                equipment: equipmentData.name,
                oldStatus,
                newStatus,
            }
        );
        return;
    }

    try {
        const transporter = nodemailer.createTransport(SMTP_Server);
        const finalOpts = applyEmailOverride(mailOpts);
        const info = await transporter.sendMail(finalOpts);
        console.log(`Equipment status change email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        logErrorToFile(error);
        console.error("Error sending equipment status change email:", error);
    }
};

module.exports = {
    sendCheckoutApprovalRequestEmail,
    sendCheckoutApprovedEmail,
    sendCheckoutDeclinedEmail,
    sendCheckoutCancelledEmail,
    sendEquipmentReturnedEmail,
    sendEquipmentAvailableEmail,
    sendCalibrationDueEmail,
    sendGenericEmail,
    sendCheckoutCreatedEmail,
    sendEquipmentCheckedOutEmail,
    sendEquipmentStatusChangeEmail,
};
