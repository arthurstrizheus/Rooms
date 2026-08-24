const crypto = require("crypto");
const { addDays, addWeeks, addMonths } = require("date-fns");

// iCalendar (RFC 5545) generation for equipment reservations.
//
// Events are plain published events (METHOD:PUBLISH) with no ATTENDEE lines, so
// calendar clients add a normal appointment instead of an RSVP meeting invite.
// Cancellations reuse the same UID with METHOD:CANCEL and a higher SEQUENCE,
// which is what lets Outlook/Apple Calendar remove the event again.

const PRODID = "-//SEA Limited//Equipment Scheduler//EN";
const ORGANIZER_EMAIL = "noreply@sealimited.com";
const ORGANIZER_NAME = "Equipment Scheduler";
const UID_DOMAIN = "equipment.sealimited.com";
const ICS_FILENAME = "equipment-reservation.ics";

const getBaseUrl = () =>
    (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

const plain = (model) =>
    model && typeof model.get === "function" ? model.get({ plain: true }) : model;

/** Formats a date as a UTC iCalendar timestamp (20260824T130000Z). */
const formatIcsDate = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
};

/** Escapes a value for an iCalendar TEXT property. */
const escapeIcsText = (value) =>
    String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\r\n|\r|\n/g, "\\n");

/** Folds a content line to the 75-octet limit without splitting a character. */
const foldLine = (line) => {
    if (Buffer.byteLength(line, "utf8") <= 75) return line;

    const parts = [];
    let chunk = "";
    let chunkBytes = 0;
    let limit = 75;

    for (const char of line) {
        const charBytes = Buffer.byteLength(char, "utf8");
        if (chunkBytes + charBytes > limit) {
            parts.push(chunk);
            chunk = "";
            chunkBytes = 0;
            limit = 74; // continuation lines carry a leading space
        }
        chunk += char;
        chunkBytes += charBytes;
    }
    if (chunk) parts.push(chunk);

    return parts.join("\r\n ");
};

/**
 * Stable UID for a reservation. Accepts a base checkout id (12) or a virtual
 * recurring-occurrence id (12_3) so a cancellation always matches the event the
 * recipient added earlier.
 */
const getCheckoutUid = (checkoutId) =>
    `equipment-checkout-${checkoutId}@${UID_DOMAIN}`;

/**
 * Monotonically increasing revision number derived from the record timestamps,
 * so an update or cancellation supersedes the copy already on the calendar.
 */
const getSequence = (checkout) => {
    const created = new Date(
        checkout?.createdAt || checkout?.created_at || checkout?.start_time || 0,
    ).getTime();
    const updated = new Date(
        checkout?.updatedAt || checkout?.updated_at || created,
    ).getTime();
    if (!Number.isFinite(created) || !Number.isFinite(updated)) return 0;
    return Math.max(0, Math.floor((updated - created) / 1000));
};

const buildRRule = (recurrence) => {
    const freq = {
        daily: "DAILY",
        weekly: "WEEKLY",
        monthly: "MONTHLY",
    }[String(recurrence?.recurrence_pattern || "").toLowerCase()];
    if (!freq) return null;

    const parts = [`FREQ=${freq}`];
    const interval = Number(recurrence.separation_count) || 1;
    if (interval > 1) parts.push(`INTERVAL=${interval}`);

    if (recurrence.max_occurrences) {
        parts.push(`COUNT=${Number(recurrence.max_occurrences)}`);
    } else if (recurrence.end_date && formatIcsDate(recurrence.end_date)) {
        parts.push(`UNTIL=${formatIcsDate(recurrence.end_date)}`);
    } else {
        // Mirrors the 365-occurrence horizon the calendar view expands to
        parts.push("COUNT=365");
    }

    return parts.join(";");
};

/**
 * Start/end of the nth occurrence of a recurring reservation, matching the
 * indexes generateRecurringCheckouts() uses for its virtual ids.
 */
const getOccurrenceTimes = (checkout, recurrence, index) => {
    const baseStart = new Date(checkout.start_time);
    const duration = new Date(checkout.end_time) - baseStart;
    const separation = Number(recurrence?.separation_count) || 1;
    const pattern = String(recurrence?.recurrence_pattern || "").toLowerCase();

    let start = baseStart;
    for (let i = 0; i < index; i++) {
        if (pattern === "daily") start = addDays(start, separation);
        else if (pattern === "weekly") start = addWeeks(start, separation);
        else if (pattern === "monthly") start = addMonths(start, separation);
        else return null;
    }

    return { start, end: new Date(start.getTime() + duration) };
};

const getReservedByName = (checkout, user) => {
    const person = user || checkout?.User;
    if (!person) return "Unknown user";
    const full = `${person.first_name || ""} ${person.last_name || ""}`.trim();
    return full || person.username || person.email || "Unknown user";
};

const buildDescription = (checkout, equipment, user) => {
    const lines = [
        `Equipment: ${equipment?.name || "N/A"}`,
        `Reserved by: ${getReservedByName(checkout, user)}`,
    ];

    const reservedFor = checkout?.scheduled_on_behalf_of;
    if (reservedFor) lines.push(`Reserved on behalf of: ${reservedFor}`);
    if (equipment?.serial_number)
        lines.push(`Serial Number: ${equipment.serial_number}`);
    if (equipment?.asset_number)
        lines.push(`Asset Number: ${equipment.asset_number}`);
    if (equipment?.location) lines.push(`Location: ${equipment.location}`);
    if (checkout?.project_number)
        lines.push(`Project Number: ${checkout.project_number}`);
    if (checkout?.notes) lines.push(`Notes: ${checkout.notes}`);
    if (equipment?.id)
        lines.push("", `View reservation: ${getBaseUrl()}/equipment/${equipment.id}`);

    return lines.join("\n");
};

/**
 * Builds the .ics document for a reservation.
 *
 * @param {object} params
 * @param {object} params.checkout - Checkout record (Sequelize instance or plain).
 * @param {object} params.equipment - Equipment record.
 * @param {object} [params.user] - Reserving user, when not included on the checkout.
 * @param {object} [params.recurrence] - Recurrence record; adds an RRULE for the series.
 * @param {"PUBLISH"|"CANCEL"} [params.method] - CANCEL removes the event from the calendar.
 * @param {number} [params.occurrenceIndex] - Index of a single occurrence of a series.
 * @param {string} [params.eventId] - Id used for the UID; defaults to the checkout id.
 * @returns {string|null} ICS document, or null if the reservation has no usable times.
 */
const buildCheckoutIcs = ({
    checkout,
    equipment,
    user,
    recurrence,
    method = "PUBLISH",
    occurrenceIndex = null,
    eventId,
}) => {
    const c = plain(checkout);
    const e = plain(equipment) || {};
    const r = plain(recurrence) || plain(c?.Recurrence);
    if (!c) return null;

    let start = c.start_time;
    let end = c.end_time;

    // A single occurrence of a series is emitted as a standalone event
    if (occurrenceIndex !== null && occurrenceIndex !== undefined && r) {
        const times = getOccurrenceTimes(c, r, occurrenceIndex);
        if (!times) return null;
        start = times.start;
        end = times.end;
    }

    const dtStart = formatIcsDate(start);
    const dtEnd = formatIcsDate(end);
    if (!dtStart || !dtEnd) return null;

    const isCancel = method === "CANCEL";
    const uid = getCheckoutUid(eventId ?? c.id);
    // Cancellations must outrank the copy already on the calendar
    const sequence = getSequence(c) + (isCancel ? 1 : 0);

    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        `PRODID:${PRODID}`,
        "CALSCALE:GREGORIAN",
        `METHOD:${method}`,
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${formatIcsDate(new Date())}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${escapeIcsText(`Equipment Reserved: ${e.name || "Equipment"}`)}`,
        `DESCRIPTION:${escapeIcsText(buildDescription(c, e, user))}`,
        `ORGANIZER;CN=${escapeIcsText(ORGANIZER_NAME)}:mailto:${ORGANIZER_EMAIL}`,
        `STATUS:${isCancel ? "CANCELLED" : "CONFIRMED"}`,
        `SEQUENCE:${sequence}`,
        "TRANSP:OPAQUE",
    ];

    if (e.location) lines.push(`LOCATION:${escapeIcsText(e.location)}`);
    if (e.id) lines.push(`URL:${getBaseUrl()}/equipment/${e.id}`);

    // Only the series event carries the recurrence rule
    if (r && (occurrenceIndex === null || occurrenceIndex === undefined)) {
        const rrule = buildRRule(r);
        if (rrule) lines.push(`RRULE:${rrule}`);
    }

    lines.push("END:VEVENT", "END:VCALENDAR");

    return `${lines.map(foldLine).join("\r\n")}\r\n`;
};

/** HMAC that lets an emailed calendar link be opened without an app session. */
const signCheckoutId = (checkoutId) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    return crypto
        .createHmac("sha256", secret)
        .update(`checkout-ics:${checkoutId}`)
        .digest("hex")
        .slice(0, 32);
};

const verifyCheckoutSignature = (checkoutId, signature) => {
    const expected = signCheckoutId(checkoutId);
    if (!expected || !signature) return false;
    const provided = Buffer.from(String(signature), "utf8");
    const valid = Buffer.from(expected, "utf8");
    if (provided.length !== valid.length) return false;
    return crypto.timingSafeEqual(provided, valid);
};

/** Public, signature-protected URL that serves the .ics for a reservation. */
const getAddToCalendarUrl = (checkoutId) => {
    const signature = signCheckoutId(checkoutId);
    if (!signature) return null;
    return `${getBaseUrl()}/api/calendar/checkout/${encodeURIComponent(
        checkoutId,
    )}.ics?sig=${signature}`;
};

const buildIcsAttachment = (ics, method = "PUBLISH") => {
    if (!ics) return null;
    return {
        filename: ICS_FILENAME,
        content: ics,
        contentType: `text/calendar; charset=utf-8; method=${method}`,
    };
};

/** Email button linking to the .ics download. Returns "" when unavailable. */
const buildAddToCalendarButtonHtml = (checkoutId, options = {}) => {
    const {
        color = "#1976d2",
        label = "📅 Add to Calendar",
        note = `Or open the attached <strong>${ICS_FILENAME}</strong> file.`,
    } = options;

    const url = getAddToCalendarUrl(checkoutId);
    if (!url) return "";

    return `
        <div style="text-align: center; margin: 0 0 25px 0;">
            <a href="${url}" style="display: inline-block; background-color: ${color}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 4px; font-size: 14px; font-weight: 600;">${label}</a>
            <p style="color: #999; font-size: 11px; line-height: 1.5; margin: 8px 0 0 0;">${note}</p>
        </div>
    `;
};

/**
 * Convenience wrapper for the mailer: builds both the .ics attachment and the
 * matching button in one call.
 *
 * @returns {{attachments: Array, buttonHtml: string}}
 */
const buildCheckoutCalendarEmailParts = ({
    checkout,
    equipment,
    user,
    recurrence,
    method = "PUBLISH",
    buttonOptions,
}) => {
    const empty = { attachments: undefined, buttonHtml: "" };

    try {
        const c = plain(checkout);
        if (!c?.id) return empty;

        const ics = buildCheckoutIcs({
            checkout,
            equipment,
            user,
            recurrence,
            method,
        });
        const attachment = buildIcsAttachment(ics, method);
        if (!attachment) return empty;

        return {
            attachments: [attachment],
            buttonHtml: buildAddToCalendarButtonHtml(c.id, buttonOptions),
        };
    } catch (error) {
        // A calendar attachment must never block the notification itself
        console.error("Error building calendar attachment:", error.message);
        return empty;
    }
};

module.exports = {
    ICS_FILENAME,
    buildCheckoutIcs,
    buildIcsAttachment,
    buildCheckoutCalendarEmailParts,
    buildAddToCalendarButtonHtml,
    getAddToCalendarUrl,
    getCheckoutUid,
    getOccurrenceTimes,
    signCheckoutId,
    verifyCheckoutSignature,
};
