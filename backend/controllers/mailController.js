const nodemailer = require("nodemailer");
require("dotenv").config(); // Must be at the top of the file
const { logErrorToFile } = require("../functions/logErrorToFile.js");
// Lookup models for enriching email content
const {
    Room,
    Type,
    Office,
    User,
    Group,
    GroupUser,
    RoomGroup,
} = require("../models");
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

/**
 * Sends an email to the parent notifying them of their group ownership and members with full access.
 * @param {string} parentEmail - The email of the group parent.
 * @param {string} parentName - The display name of the group parent.
 * @param {string} groupName - The name of the group.
 * @param {string[]} members - An array of member CNs.
 */
const sendGroupNotificationEmail = async (
    parentEmail,
    parentName,
    groupName,
    members
) => {
    if (!parentEmail) {
        console.error("Parent email is required.");
        return;
    }

    // Create the email transporter
    const transporter = nodemailer.createTransport(SMTP_Server);

    const generateMemberList = (members) => {
        return members
            .map((member) => {
                if (typeof member === "string") {
                    // Regular member
                    return `<li>${member}</li>`;
                } else if (
                    typeof member === "object" &&
                    member.groupName &&
                    member.nestedMembers
                ) {
                    // Group with nested members
                    const nestedList = member.nestedMembers
                        .map(
                            (nestedMember) =>
                                `<li style="margin-left: 20px;">${nestedMember}</li>`
                        )
                        .join("");
                    return `<li>${member.groupName}<ul>${nestedList}</ul></li>`;
                }
                return null;
            })
            .filter(Boolean)
            .join("");
    };

    // Create the email content
    const emailSubject = `Group Ownership Notification: ${groupName}`;
    const emailBody = `
  <p>Dear ${parentName},</p>
  <p>You are listed as the parent (owner) for the group <strong>${groupName}</strong>.</p>
  <p>The following associates have full access to your matters:</p>
  <ul>${generateMemberList(members)}</ul>
  <p>Please ensure that this access is appropriate and up-to-date.</p>
  <p>If there is an issue with access, please reply to this email with any concerns.</p>
  <p></p>
  <p>Thank you.</p>
  `;

    try {
        // Send the email
        const info = await transporter.sendMail(
            applyEmailOverride({
                from: "ithelp@sealimited.com", // From address using COLWEB
                to: parentEmail, //parentEmail,
                subject: emailSubject,
                html: emailBody,
            })
        );

        console.log(`Email sent to ${parentEmail}: ${info.messageId}`);
    } catch (error) {
        logErrorToFile(error);
        console.error(`Error sending email to ${parentEmail}:`, error);
    }
};

const sendProcessCompleteEmail = async (status) => {
    // Create the email transporter
    const transporter = nodemailer.createTransport(SMTP_Server);

    // Create the email content
    const emailSubject = `Group Ownership Notification Email ${status}`;
    const emailBody = `
  <p>Dear Developer,</p>
  <p>The Matter Manager email notification has completed with status <strong>${status}</strong>.</p>
  <p></p>
  <p>Thank you.</p>
  `;

    try {
        // Send the email
        const info = await transporter.sendMail(
            applyEmailOverride({
                from: "ithelp@sealimited.com", // From address using COLWEB
                to: "astrizheus@sealimited.com", //parentEmail,
                subject: emailSubject,
                html: emailBody,
            })
        );

        console.log(
            `Email sent to astrizheus@sealimited.com: ${info.messageId}`
        );
    } catch (error) {
        logErrorToFile(error);
        console.error(
            `Error sending email to astrizheus@sealimited.com:`,
            error
        );
    }
};

const sendEmail = async (status) => {
    // Create the email transporter
    const transporter = nodemailer.createTransport(SMTP_Server);

    // Create the email content
    const emailSubject = `Group Ownership Notification Email ${status}`;
    const emailBody = `
  <p>Dear Developer,</p>
  <p>The Matter Manager email notification has completed with status <strong>${status}</strong>.</p>
  <p></p>
  <p>Thank you.</p>
  `;

    try {
        // Send the email
        const info = await transporter.sendMail(
            applyEmailOverride({
                from: "ithelp@sealimited.com", // From address using COLWEB
                to: "astrizheus@sealimited.com", //parentEmail,
                subject: emailSubject,
                html: emailBody,
            })
        );

        console.log(
            `Email sent to astrizheus@sealimited.com: ${info.messageId}`
        );
    } catch (error) {
        logErrorToFile(error);
        console.error(
            `Error sending email to astrizheus@sealimited.com:`,
            error
        );
    }
};

/**
 * Sends an approval request email for a meeting to a specified recipient.
 * @param {object} meeting - Meeting object (can be a Sequelize instance or plain object).
 * @param {string} recipientEmail - Email address of the approver / recipient.
 */
const sendMeetingApprovalRequestEmail = async (meeting, recipientEmail) => {
    if (!meeting || !recipientEmail) {
        console.error("Meeting object and recipientEmail are required.");
        return;
    }

    // Normalize meeting data (support Sequelize instance .get())
    const m = typeof meeting.get === "function" ? meeting.get() : meeting;
    const {
        id,
        name,
        start_time,
        end_time,
        room,
        location,
        type, // added to display human readable meeting type
        organizer,
        description,
    } = m;

    // Enrich lookup values (room/location/type) – graceful fallback if records missing
    let roomName = room ?? "N/A";
    let locationName = location ?? "N/A";
    let typeName = type ?? "N/A";
    try {
        const [roomRec, officeRec, typeRec] = await Promise.all([
            room ? Room.findByPk(room) : null,
            location ? Office.findByPk(location) : null,
            type ? Type.findByPk(type) : null,
        ]);
        if (roomRec?.value)
            roomName =
                roomRec.value +
                (roomRec.location ? ` (Loc ${roomRec.location})` : "");
        if (officeRec) {
            // Prefer Alias then City then officeid
            locationName =
                officeRec.Alias ||
                officeRec.City ||
                officeRec.officeid ||
                locationName;
            roomName =
                roomRec.value +
                (roomRec.location ? ` (Loc ${locationName})` : "");
        }
        if (typeRec?.value) typeName = typeRec.value;
    } catch (e) {
        logErrorToFile(e);
        console.warn("Lookup enrichment failed, falling back to raw IDs.");
    }

    const formatDate = (d) => {
        if (!d) return "N/A";
        try {
            return new Date(d).toLocaleString();
        } catch {
            return d;
        }
    };

    const emailSubject = `Action Required: Approve Meeting ${
        name ? '"' + name + '"' : "#" + id
    }`;
    const approvalBaseUrl = "https://rooms.sealimited.com/approve"; // static per request
    const approvalLink = id
        ? `${approvalBaseUrl}?meetingId=${encodeURIComponent(id)}`
        : approvalBaseUrl;
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
    const emailBody = `
    <p>Dear ${greetingName},</p>
    <p>A meeting requires your approval.</p>
    <table style="border-collapse:collapse;font-size:14px;margin-top:8px;">
        <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Title</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
            name || "N/A"
        }</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Start</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${formatDate(
            start_time
        )}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>End</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${formatDate(
            end_time
        )}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Room</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${roomName}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Location</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${locationName}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Type</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${typeName}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Organizer</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
            organizer || "N/A"
        }</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Description</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
            description || "N/A"
        }</td></tr>
    </table>
    <p style="margin-top:16px;">Please review and take the appropriate action.</p>
    <p style="margin:24px 0;">
        <a href="${approvalLink}" style="background:#005ea5;color:#ffffff;padding:10px 16px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:600;">Review / Approve Meeting</a>
    </p>
    <p style="font-size:12px;">If the button doesn't work, copy and paste this link into your browser:<br/><span style="word-break:break-all;">${approvalLink}</span></p>
    <p>Thank you.<br/>This is an automated message; please do not reply.</p>
    `;

    try {
        const transporter = nodemailer.createTransport(SMTP_Server);
        const info = await transporter.sendMail(
            applyEmailOverride({
                from: "noreply@sealimited.com",
                to: recipientEmail,
                subject: emailSubject,
                html: emailBody,
            })
        );
        // Fire socket notification (non-blocking)
        try {
            // Direct to recipient (if connected) by email; meeting controller handles broader approver list
            SendMessage(
                {
                    message: "meeting_approval_requested",
                    data: { meetingId: id, recipient: recipientEmail },
                },
                { emails: [recipientEmail] }
            );
        } catch (e) {
            console.warn("Socket notify failed (approval request)", e);
        }
        const actualTo = info?.envelope?.to || info?.accepted || [];
        console.log(
            `Meeting approval request email sent (override=${
                EMAIL_OVERRIDE_ACTIVE ? "ON" : "OFF"
            }) original=${recipientEmail} actual=${
                Array.isArray(actualTo) ? actualTo.join(",") : actualTo
            } id=${info.messageId}`
        );
    } catch (error) {
        logErrorToFile(error);
        console.error(
            `Error sending meeting approval request email to ${recipientEmail}:`,
            error
        );
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
        const info = await transporter.sendMail(
            applyEmailOverride({
                from: from || "noreply@sealimited.com",
                to,
                subject,
                html,
                text,
                cc,
                bcc,
                attachments,
            })
        );
        console.log(`Generic email sent to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        logErrorToFile(error);
        console.error(`Error sending generic email to ${to}:`, error);
    }
};

/**
 * Sends a re-approval request when an already-approved meeting has been modified.
 * @param {object} oldMeeting - Previous persisted meeting values (Sequelize instance or plain object)
 * @param {object} newMeeting - Updated meeting values (Sequelize instance or plain object)
 * @param {string} recipientEmail - Approver's email address
 */
const sendMeetingReapprovalRequestEmail = async (
    oldMeeting,
    newMeeting,
    recipientEmail
) => {
    if (!oldMeeting || !newMeeting || !recipientEmail) {
        console.error(
            "oldMeeting, newMeeting and recipientEmail are all required for re-approval email"
        );
        return;
    }

    const normalize = (m) => (typeof m?.get === "function" ? m.get() : m);
    const prev = normalize(oldMeeting) || {};
    const curr = normalize(newMeeting) || {};

    // Pre-fetch lookups for old/new values (room/location/type) to show names instead of IDs
    const lookupIds = {
        rooms: [prev.room, curr.room].filter((v) => v != null),
        locations: [prev.location, curr.location].filter((v) => v != null),
        types: [prev.type, curr.type].filter((v) => v != null),
    };
    let lookupCache = { room: {}, location: {}, type: {} };
    try {
        const [roomRecords, officeRecords, typeRecords] = await Promise.all([
            lookupIds.rooms.length
                ? Room.findAll({ where: { id: { [Op.in]: lookupIds.rooms } } })
                : [],
            lookupIds.locations.length
                ? Office.findAll({
                      where: { officeid: { [Op.in]: lookupIds.locations } },
                  })
                : [],
            lookupIds.types.length
                ? Type.findAll({ where: { id: { [Op.in]: lookupIds.types } } })
                : [],
        ]);
        roomRecords.forEach((r) => (lookupCache.room[r.id] = r.value));
        officeRecords.forEach(
            (o) =>
                (lookupCache.location[o.officeid] =
                    o.Alias || o.City || `${o.officeid}`)
        );
        typeRecords.forEach((t) => (lookupCache.type[t.id] = t.value));
    } catch (e) {
        logErrorToFile(e);
        console.warn("Re-approval lookup enrichment failed");
    }

    const FIELDS = [
        { key: "name", label: "Title" },
        { key: "start_time", label: "Start" },
        { key: "end_time", label: "End" },
        {
            key: "room",
            label: "Room",
            transform: (v) => (v == null ? v : lookupCache.room[v] || v),
        },
        {
            key: "location",
            label: "Location",
            transform: (v) => (v == null ? v : lookupCache.location[v] || v),
        },
        {
            key: "type",
            label: "Type",
            transform: (v) => (v == null ? v : lookupCache.type[v] || v),
        },
        { key: "organizer", label: "Organizer" },
        { key: "description", label: "Description" },
    ];

    const formatValue = (key, val) => {
        if (val == null || val === "") return "<em>N/A</em>";
        if (key.endsWith("_time")) {
            try {
                return new Date(val).toLocaleString();
            } catch {
                return val;
            }
        }
        return String(val);
    };

    const changed = [];
    const rowsHtml = FIELDS.map(({ key, label, transform }) => {
        const rawPrev = prev[key];
        const rawCurr = curr[key];
        const displayPrev = transform ? transform(rawPrev) : rawPrev;
        const displayCurr = transform ? transform(rawCurr) : rawCurr;
        const beforeVal = formatValue(key, displayPrev);
        const afterVal = formatValue(key, displayCurr);
        const isChanged =
            rawPrev != null || rawCurr != null
                ? JSON.stringify(rawPrev) !== JSON.stringify(rawCurr)
                : false;
        if (isChanged) changed.push(label);
        return `<tr style="${
            isChanged ? "background:#fff8e1;" : ""
        }"><td style="padding:4px 8px;border:1px solid #ddd;">${label}</td><td style="padding:4px 8px;border:1px solid #ddd;">${beforeVal}</td><td style="padding:4px 8px;border:1px solid #ddd;">${afterVal}</td></tr>`;
    }).join("");

    const id = curr.id || prev.id;
    const approvalBaseUrl = "https://rooms.sealimited.com/approve";
    const approvalLink = id
        ? `${approvalBaseUrl}?meetingId=${encodeURIComponent(id)}`
        : approvalBaseUrl;

    const subject = `Re-Approval Required: Updated Meeting ${
        curr.name ? '"' + curr.name + '"' : id ? "#" + id : ""
    }`;
    // Personalize greeting for re-approval
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
    const emailBody = `
    <p>Dear ${greetingName},</p>
    <p>A previously approved meeting has been updated and requires your review.</p>
    <p><strong>Changed Fields:</strong> ${
        changed.length ? changed.join(", ") : "(No detected field changes)"
    }</p>
    <table style="border-collapse:collapse;font-size:14px;margin-top:8px;">
        <thead>
            <tr style="background:#f0f0f0;">
                <th style="padding:6px 8px;border:1px solid #ccc;text-align:left;">Field</th>
                <th style="padding:6px 8px;border:1px solid #ccc;text-align:left;">Previous</th>
                <th style="padding:6px 8px;border:1px solid #ccc;text-align:left;">Updated</th>
            </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
    </table>
    <p style="margin:24px 0 8px;">
        <a href="${approvalLink}" style="background:#005ea5;color:#ffffff;padding:10px 16px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:600;">Review Updated Meeting</a>
    </p>
    <p style="font-size:12px;">If the button does not work, paste this URL into your browser:<br/>${approvalLink}</p>
    <p>Thank you.<br/>This is an automated message; please do not reply.</p>
    `;

    try {
        const transporter = nodemailer.createTransport(SMTP_Server);
        const info = await transporter.sendMail(
            applyEmailOverride({
                from: "noreply@sealimited.com",
                to: recipientEmail,
                subject,
                html: emailBody,
            })
        );
        try {
            SendMessage(
                {
                    message: "meeting_reapproval_requested",
                    data: {
                        meetingId: id,
                        recipient: recipientEmail,
                        changedFields: changed,
                    },
                },
                { emails: [recipientEmail] }
            );
        } catch (e) {
            console.warn("Socket notify failed (re-approval request)", e);
        }
        console.log(
            `Meeting re-approval request email sent to ${recipientEmail}: ${info.messageId}`
        );
    } catch (error) {
        logErrorToFile(error);
        console.error(
            `Error sending meeting re-approval request email to ${recipientEmail}:`,
            error
        );
    }
};

/**
 * Sends an email to the meeting creator informing them it was declined.
 * @param {object} meeting - Meeting object (Sequelize instance or plain object)
 * @param {string} recipientEmail - Creator's email address
 * @param {string} [reason] - Optional reason for decline
 */
const sendMeetingDeclinedEmail = async (meeting, recipientEmail, reason) => {
    if (!meeting || !recipientEmail) {
        console.error("meeting and recipientEmail required for declined email");
        return;
    }
    const m = typeof meeting.get === "function" ? meeting.get() : meeting;
    const {
        id,
        name,
        start_time,
        end_time,
        room,
        location,
        type,
        organizer,
        description,
    } = m;
    let roomName = room ?? "N/A";
    let locationName = location ?? "N/A";
    let typeName = type ?? "N/A";
    try {
        const [roomRec, officeRec, typeRec] = await Promise.all([
            room ? Room.findByPk(room) : null,
            location ? Office.findByPk(location) : null,
            type ? Type.findByPk(type) : null,
        ]);
        if (roomRec?.value) roomName = roomRec.value;
        if (officeRec)
            locationName =
                officeRec.Alias ||
                officeRec.City ||
                officeRec.officeid ||
                locationName;
        if (typeRec?.value) typeName = typeRec.value;
    } catch (e) {
        logErrorToFile(e);
    }
    const fmt = (d) => {
        try {
            return new Date(d).toLocaleString();
        } catch {
            return d || "N/A";
        }
    };
    // Personalize creator greeting and approver list
    let creatorName = organizer || "User";
    try {
        if (m.created_user_id) {
            const creator = await User.findByPk(m.created_user_id);
            if (creator) {
                creatorName =
                    `${creator.first_name || ""} ${
                        creator.last_name || ""
                    }`.trim() || creatorName;
            }
        }
    } catch {}
    // Build approver list (subset for readability) excluding admins; hyperlink office & group approvers
    let approverLinks = [];
    try {
        const approverMap = new Map();
        const addUser = (u, isOfficeAdmin = false) => {
            if (!u || !u.id) return;
            if (u.admin) return; // exclude admins
            if (!u.email) return; // need email for hyperlink
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
        if (location) {
            const officeAdmins = await User.findAll({
                where: { office_admin: location },
            });
            officeAdmins.forEach((u) => addUser(u, true));
        }
        // Group full-access users tied to the room
        if (room) {
            const roomGroups = await RoomGroup.findAll({
                where: { room_id: room },
            });
            const groupIds = roomGroups.map((rg) => rg.group_id);
            if (groupIds.length) {
                const fullGroups = await Group.findAll({
                    where: { id: groupIds, access: "Full" },
                });
                const fullGroupIds = fullGroups.map((g) => g.id);
                if (fullGroupIds.length) {
                    const groupUsers = await GroupUser.findAll({
                        where: { group_id: fullGroupIds },
                    });
                    const userIds = groupUsers.map((gu) => gu.user_id);
                    if (userIds.length) {
                        const users = await User.findAll({
                            where: { id: userIds },
                        });
                        users.forEach((u) => addUser(u));
                    }
                }
            }
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
    const subject = `Meeting Declined: ${name ? '"' + name + '"' : "#" + id}`;
    const body = `
        <p>Dear ${creatorName},</p>
        <p>Your meeting has been <strong style="color:#d32f2f;">declined</strong>.</p>
        <table style="border-collapse:collapse;font-size:14px;margin-top:8px;">
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Title</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                name || "N/A"
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Start</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${fmt(
                start_time
            )}</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>End</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${fmt(
                end_time
            )}</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Room</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${roomName}</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Location</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${locationName}</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Type</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${typeName}</td></tr>
        </table>
        ${
            description
                ? `<p style=\"margin-top:12px;\"><strong>Description:</strong> ${description}</p>`
                : ""
        }
        ${
            reason
                ? `<p style=\"margin-top:12px;\"><strong>Reason:</strong> ${reason}</p>`
                : ""
        }
        <p style="margin-top:16px;">If you believe this was in error you may create a new meeting${approverLine}.</p>
        <p>Thank you.<br/>This is an automated message; please do not reply.</p>
    `;
    try {
        const transporter = nodemailer.createTransport(SMTP_Server);
        const info = await transporter.sendMail(
            applyEmailOverride({
                from: "noreply@sealimited.com",
                to: recipientEmail,
                subject,
                html: body,
            })
        );
        try {
            SendMessage(
                {
                    message: "meeting_declined",
                    data: { meetingId: id, created_user_id: m.created_user_id },
                },
                { emails: [recipientEmail] }
            );
        } catch (e) {
            console.warn("Socket notify failed (meeting declined email)", e);
        }
        console.log(
            `Meeting declined email sent to ${recipientEmail}: ${info.messageId}`
        );
    } catch (error) {
        logErrorToFile(error);
        console.error(
            `Error sending meeting declined email to ${recipientEmail}:`,
            error
        );
    }
};

/**
 * Sends an email to the meeting creator informing them it was approved.
 * Re-uses same table formatting for consistency.
 * @param {object} meeting - Meeting object
 * @param {string} recipientEmail - Creator email
 */
const sendMeetingApprovedEmail = async (meeting, recipientEmail) => {
    if (!meeting || !recipientEmail) return;
    const m = typeof meeting.get === "function" ? meeting.get() : meeting;
    const { id, name, start_time, end_time, room, location, type, organizer } =
        m;
    let roomName = room ?? "N/A";
    let locationName = location ?? "N/A";
    let typeName = type ?? "N/A";
    try {
        const [roomRec, officeRec, typeRec] = await Promise.all([
            room ? Room.findByPk(room) : null,
            location ? Office.findByPk(location) : null,
            type ? Type.findByPk(type) : null,
        ]);
        if (roomRec?.value) roomName = roomRec.value;
        if (officeRec)
            locationName =
                officeRec.Alias ||
                officeRec.City ||
                officeRec.officeid ||
                locationName;
        if (typeRec?.value) typeName = typeRec.value;
    } catch (e) {
        logErrorToFile(e);
    }
    const fmt = (d) => {
        try {
            return new Date(d).toLocaleString();
        } catch {
            return d || "N/A";
        }
    };
    let creatorName = organizer || "User";
    try {
        if (m.created_user_id) {
            const creator = await User.findByPk(m.created_user_id);
            if (creator) {
                creatorName =
                    `${creator.first_name || ""} ${
                        creator.last_name || ""
                    }`.trim() || creatorName;
            }
        }
    } catch {}
    const subject = `Meeting Approved: ${name ? '"' + name + '"' : "#" + id}`;
    const body = `
        <p>Dear ${creatorName},</p>
        <p>Your meeting has been <strong style="color:#2e7d32;">approved</strong>.</p>
        <table style="border-collapse:collapse;font-size:14px;margin-top:8px;">
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Title</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${
                name || "N/A"
            }</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Start</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${fmt(
                start_time
            )}</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>End</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${fmt(
                end_time
            )}</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Room</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${roomName}</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Location</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${locationName}</td></tr>
            <tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>Type</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${typeName}</td></tr>
        </table>
        <p style="margin-top:16px;">You can view or modify this meeting in the Rooms application.</p>
        <p>Thank you.<br/>This is an automated message; please do not reply.</p>
    `;
    try {
        const transporter = nodemailer.createTransport(SMTP_Server);
        await transporter.sendMail(
            applyEmailOverride({
                from: "noreply@sealimited.com",
                to: recipientEmail,
                subject,
                html: body,
            })
        );
    } catch (e) {
        logErrorToFile(e);
        console.error("Error sending meeting approved email", e);
    }
};

module.exports = {
    sendGroupNotificationEmail,
    sendProcessCompleteEmail,
    sendEmail,
    sendMeetingApprovalRequestEmail,
    sendGenericEmail,
    sendMeetingReapprovalRequestEmail,
    sendMeetingDeclinedEmail,
    sendMeetingApprovedEmail,
};
