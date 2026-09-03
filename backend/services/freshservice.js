/**
 * FreshService client — ticket creation only.
 *
 * Deliberately narrow: this app files tickets and never reads, updates or
 * closes them. FreshService is the help desk's system of record, not ours.
 *
 * Nothing here throws. A help desk being unreachable must never take down a
 * reservation or a page load, so every failure comes back as
 * `{ ok: false, error }` and the caller decides what to tell the user.
 *
 * Credentials come from the environment and never appear in a log line or an
 * error message — FreshService authenticates with the API key as the basic-auth
 * username, so an unsanitised request dump would leak it.
 */

const TICKET_TIMEOUT_MS = 8000;

/**
 * `.env` values here are quoted (FRESHSERVICE_DOMAIN='sealtd.freshservice.com'),
 * and dotenv keeps the quotes when the value has surrounding whitespace. An
 * unstripped quote turns the URL into `https://'sealtd...'` and every request
 * fails DNS resolution with a message that looks nothing like a config error.
 */
const normalize = (value) =>
    (value || "")
        .toString()
        .trim()
        .replace(/^['"]|['"]$/g, "");

const domain = () => normalize(process.env.FRESHSERVICE_DOMAIN);
const apiKey = () => normalize(process.env.FRESHSERVICE_API_KEY);

/**
 * Is the integration configured? Both halves are required — a domain with no
 * key produces a 401 per attempt, which is worse than being switched off.
 */
const isEnabled = () => Boolean(domain() && apiKey());

/** Basic auth: the API key is the username, the password is ignored. */
const authHeader = () =>
    "Basic " + Buffer.from(`${apiKey()}:X`).toString("base64");

/**
 * Keep at most `max` characters of an error body. FreshService echoes the
 * submitted payload back in validation errors, so an untruncated copy would put
 * the user's own text into the log a second time.
 */
const sanitizeError = (value, max = 300) => {
    const text =
        typeof value === "string" ? value : JSON.stringify(value ?? "") || "";
    return text.length > max ? `${text.slice(0, max)}…` : text;
};

/**
 * Create a ticket.
 *
 * @param {object} ticket
 * @param {string} ticket.email        requester — must be a real FreshService
 *                                     contact or the API rejects it
 * @param {string} ticket.subject
 * @param {string} ticket.description  HTML
 * @param {number} [ticket.priority]   1 low, 2 medium, 3 high, 4 urgent
 * @param {number} [ticket.status]     2 open
 * @param {string[]} [ticket.tags]
 * @returns {Promise<{ok: boolean, id?: number, error?: string}>}
 */
async function createTicket({
    email,
    subject,
    description,
    priority = 2,
    status = 2,
    tags = [],
}) {
    if (!isEnabled()) {
        return { ok: false, error: "FreshService is not configured." };
    }

    if (!email || !subject || !description) {
        return { ok: false, error: "Missing email, subject or description." };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TICKET_TIMEOUT_MS);

    try {
        const response = await fetch(
            `https://${domain()}/api/v2/tickets`,
            {
                method: "POST",
                headers: {
                    Authorization: authHeader(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    subject,
                    description,
                    priority,
                    status,
                    source: 2, // Portal
                    tags,
                }),
                signal: controller.signal,
            },
        );

        if (!response.ok) {
            // Read the body for the log, but never echo it to the caller — it
            // can contain the submitted payload.
            const body = await response.text().catch(() => "");
            console.error(
                `FreshService ticket failed: HTTP ${response.status} ${sanitizeError(body)}`,
            );
            return {
                ok: false,
                error: `Help desk returned ${response.status}.`,
            };
        }

        const data = await response.json().catch(() => ({}));
        const id = data?.ticket?.id;
        console.log(`FreshService ticket created${id ? ` (#${id})` : ""}`);
        return { ok: true, id };
    } catch (err) {
        const reason =
            err?.name === "AbortError"
                ? `timed out after ${TICKET_TIMEOUT_MS}ms`
                : sanitizeError(err?.message);
        console.error(`FreshService ticket failed: ${reason}`);
        return { ok: false, error: "Could not reach the help desk." };
    } finally {
        clearTimeout(timer);
    }
}

module.exports = { isEnabled, createTicket };
