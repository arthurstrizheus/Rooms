const { Equipment } = require("../models");
const freshservice = require("../services/freshservice");
const { escapeHtml } = require("./mailController");

/**
 * Help requests raised from inside the app, filed as FreshService tickets.
 *
 * Two entry points share this endpoint: the general "Get help" form, and
 * "Report a problem" on an equipment page, which carries an `equipmentId`.
 *
 * The requester is taken from `req.user` and nowhere else. The browser can put
 * anything it likes in the body, so a client-supplied email would let one
 * person file tickets as another — and the reply would go to them.
 */

/** What the user can pick, and how it maps onto FreshService's priority scale. */
const CATEGORIES = {
    "equipment-issue": {
        label: "Equipment damaged, broken or missing",
        // Field work stops when a tool is unusable, so this outranks the rest.
        priority: 3,
    },
    calibration: { label: "Calibration or certification problem", priority: 2 },
    booking: { label: "Problem with a reservation", priority: 2 },
    access: { label: "Access or permissions", priority: 2 },
    other: { label: "Something else", priority: 2 },
};

const MAX = { subject: 150, details: 4000, pageUrl: 500 };

/**
 * One request per user per minute.
 *
 * In-process on purpose: it exists to stop a frustrated user filing the same
 * ticket six times, not to defend against an attacker, and the endpoint already
 * requires a valid session. Note it resets on restart and is per-instance —
 * if this app is ever run behind more than one process, this stops being a
 * guarantee and becomes a courtesy.
 */
const THROTTLE_MS = 60_000;
const lastRequestByUser = new Map();

/** Trim, collapse nothing, and cap. Length is capped rather than rejected so a
 *  long paste still files a ticket instead of bouncing the user back to a form
 *  they'd have to trim by hand. */
const clean = (value, max) =>
    (value == null ? "" : String(value)).trim().slice(0, max);

/**
 * GET /api/support/status
 *
 * Lets the UI hide the help entry points entirely when the help desk isn't
 * configured, rather than offering a button that can only fail.
 */
const GetStatus = async (req, res) => {
    res.json({ enabled: freshservice.isEnabled() });
};

/**
 * POST /api/support/ticket
 * Body: { category, subject, details, equipmentId?, pageUrl? }
 */
const CreateTicket = async (req, res) => {
    try {
        const user = req.user;

        if (!user?.email) {
            return res.status(401).json({
                message: "You must be signed in to request help.",
            });
        }

        if (!freshservice.isEnabled()) {
            return res.status(503).json({
                message:
                    "The help desk integration is not configured. Please email ithelp@sealimited.com.",
            });
        }

        const last = lastRequestByUser.get(user.id);
        if (last && Date.now() - last < THROTTLE_MS) {
            const waitSeconds = Math.ceil(
                (THROTTLE_MS - (Date.now() - last)) / 1000,
            );
            return res.status(429).json({
                message: `You just sent a request. Please wait ${waitSeconds} seconds before sending another.`,
                waitSeconds,
            });
        }

        const category = CATEGORIES[req.body?.category]
            ? req.body.category
            : "other";
        const subject = clean(req.body?.subject, MAX.subject);
        const details = clean(req.body?.details, MAX.details);
        const pageUrl = clean(req.body?.pageUrl, MAX.pageUrl);

        if (!subject || !details) {
            return res.status(400).json({
                message: "Please give a summary and a description.",
            });
        }

        // Equipment is resolved from the id here rather than trusted from the
        // body, so the ticket names the asset the user actually clicked.
        let equipment = null;
        const equipmentId = Number(req.body?.equipmentId);
        if (Number.isInteger(equipmentId) && equipmentId > 0) {
            equipment = await Equipment.findByPk(equipmentId, {
                attributes: [
                    "id",
                    "name",
                    "asset_number",
                    "serial_number",
                    "location",
                    "status",
                ],
            }).catch(() => null);
        }

        const rows = [
            ["Reported by", `${user.first_name} ${user.last_name}`],
            ["Email", user.email],
            ["Category", CATEGORIES[category].label],
        ];

        if (equipment) {
            rows.push(
                ["Equipment", equipment.name],
                ["Asset #", equipment.asset_number || "—"],
                ["Serial #", equipment.serial_number || "—"],
                ["Location", equipment.location || "—"],
                ["Current status", equipment.status || "—"],
            );
        }

        if (pageUrl) rows.push(["Page", pageUrl]);

        const description =
            `<p>A help request was submitted from the SEA Equipment Reservations app.</p>` +
            `<ul>` +
            rows
                .map(
                    ([label, value]) =>
                        `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`,
                )
                .join("") +
            `</ul>` +
            `<p><strong>Description</strong></p>` +
            `<p>${escapeHtml(details).replace(/\n/g, "<br/>")}</p>`;

        const tags = ["equipment-app", category];
        if (equipment) tags.push(`asset-${equipment.id}`);

        const result = await freshservice.createTicket({
            email: user.email,
            subject: equipment
                ? `[Equipment] ${subject} — ${equipment.name}`
                : `[Equipment] ${subject}`,
            description,
            priority: CATEGORIES[category].priority,
            tags,
        });

        // `createTicket` never throws, so an unchecked call would let this
        // endpoint answer "sent" for a request that went nowhere. Telling
        // someone their problem has been reported when it hasn't is the one
        // outcome this must never produce.
        if (!result.ok) {
            return res.status(502).json({
                message:
                    "We could not reach the help desk. Please email ithelp@sealimited.com.",
            });
        }

        // Only start the clock on a request that actually landed, so a failed
        // attempt doesn't lock the user out for a minute.
        lastRequestByUser.set(user.id, Date.now());

        res.status(201).json({
            message: result.id
                ? `Ticket #${result.id} has been created. IT will follow up by email.`
                : "Your request has been sent. IT will follow up by email.",
            ticketId: result.id || null,
        });
    } catch (error) {
        console.error("Error creating support ticket:", error.message);
        res.status(500).json({
            message: "Something went wrong sending your request.",
        });
    }
};

module.exports = { GetStatus, CreateTicket, CATEGORIES };
