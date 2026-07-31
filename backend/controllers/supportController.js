const { sendGenericEmail } = require("./mailController");
const { awardBadgesForClicks } = require("./clippyBadges");
const { DISPLAY_WIDTH, DISPLAY_HEIGHT } = require("./clippyBadgeArt");
const { logErrorToFile } = require("../functions/logErrorToFile.js");

/**
 * Where the badge images are served from. Must be reachable by a mail client
 * and by Gmail's image proxy, so it is the PUBLIC origin — not localhost, and
 * not a path relative to the API. Matches the approval links in mailController.
 */
const PUBLIC_BASE_URL = (
    process.env.PUBLIC_BASE_URL || "https://rooms.sealimited.com"
).replace(/\/+$/, "");

/**
 * Clippy support tickets.
 *
 * Emails IT and stores nothing. That is a deliberate scope choice: a table would
 * need a model, an entry in `initModels`, and a hand-written migration (the app
 * boots with `sync({ alter: false })`, so columns are never created for you) —
 * all to hold data whose only consumer is a human reading their inbox. If a
 * queue or a history view is ever wanted, that is the point to add the table.
 *
 * The identity on the ticket comes from `req.user`, never from the request body.
 * The body is the user's own account of the problem; the *who* is the JWT's, so
 * nobody can file a ticket as somebody else.
 */

/** Where tickets land. Overridable so a test box can point somewhere harmless. */
const IT_INBOX = process.env.IT_SUPPORT_EMAIL || "ithelp@sealimited.com";

/**
 * One ticket per user per THROTTLE_MS. This form is reached by rage-clicking, so
 * "user submits it four times because the first one felt slow" is the expected
 * failure, not a hypothetical — and each one is an email to a real person.
 *
 * In-memory and per-process, which is the right size for the problem: the app
 * runs as a single node process, and the worst case if that ever changes is a
 * duplicate email rather than anything unsafe.
 */
const THROTTLE_MS = 60 * 1000;
const lastSentByUser = new Map();

/** Escape everything user-supplied — all of this is interpolated into HTML. */
const escapeHtml = (str) =>
    String(str ?? "").replace(
        /[&<>"']/g,
        (c) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            }[c])
    );

/** Trim, coerce to string, and cap length so no single field can bloat the mail. */
const clean = (value, max) => String(value ?? "").trim().slice(0, max);

/** Escaped, and with newlines preserved as <br> so the description reads right. */
const escapeMultiline = (str) => escapeHtml(str).replace(/\r?\n/g, "<br/>");

const row = (label, value) =>
    `<tr><td style="padding:6px 10px;border:1px solid #ddd;background:#fafafa;white-space:nowrap;"><strong>${label}</strong></td><td style="padding:6px 10px;border:1px solid #ddd;">${value}</td></tr>`;

const PostClippyTicket = async (req, res) => {
    try {
        const user = req.user;
        if (!user?.id) {
            return res.status(401).json({ message: "Not signed in." });
        }

        const now = Date.now();
        const last = lastSentByUser.get(user.id) || 0;
        if (now - last < THROTTLE_MS) {
            const wait = Math.ceil((THROTTLE_MS - (now - last)) / 1000);
            return res.status(429).json({
                message: `You just sent one — give IT ${wait}s to read it before sending another.`,
            });
        }

        const problem = clean(req.body?.problem, 4000);
        if (!problem) {
            return res
                .status(400)
                .json({ message: "Please describe what went wrong." });
        }

        const doing = clean(req.body?.doing, 200) || "Not specified";
        const severity = clean(req.body?.severity, 100) || "Not specified";
        const page = clean(req.body?.page, 500) || "Unknown";
        const browser = clean(req.body?.browser, 120) || "Unknown";
        const userAgent = clean(req.body?.userAgent, 500);
        const screen = clean(req.body?.screen, 60) || "Unknown";
        const when = clean(req.body?.when, 80);

        // The headline number. Clamped rather than rejected — a nonsense value
        // must not cost the user their ticket.
        const clickCount = Math.max(
            0,
            Math.min(9999, Math.floor(Number(req.body?.clickCount) || 0))
        );

        // The reply address is the signed-in account's, full stop. The form no
        // longer asks for one — a user who is already authenticated has an
        // address on file, and taking it from the JWT rather than the body
        // removes both a typo and the chance to point a reply at someone else.
        const contactEmail = user.email || "";

        const reporter =
            [user.first_name, user.last_name].filter(Boolean).join(" ") ||
            user.username ||
            user.email ||
            `User #${user.id}`;

        // Awarded before the mail is built so the badges can go ON the ticket.
        // Never throws — it logs and reports a status instead, so a badge write
        // that fails costs the user a joke achievement and not their ticket.
        // `all` is deliberately not destructured: every tier at or below the
        // count is awarded, but the ticket shows only the highest.
        const { top: tier, newly, status: badgeStatus } = await awardBadgesForClicks(
            user.id,
            clickCount
        );

        const badgeNote =
            badgeStatus === "failed"
                ? // Said plainly rather than dressed up: an earlier version
                  // reported a failed write as "already held", which was untrue.
                  '<span style="color:#C8102E;font-weight:600;">not saved — the badge write failed</span>'
                : newly.length
                ? `<span style="color:#2F7D52;font-weight:600;">${newly.length} newly earned</span>`
                : "all already held";

        /**
         * The badge as a real image, embedded from a public URL.
         *
         * ONLY THE HIGHEST TIER. A high click count awards every tier beneath it
         * too, so the full collection would put a row of up to twelve paperclips
         * on a ticket whose subject is "something is broken" — the badge is a
         * garnish, and one of them says everything the reader needs. The whole
         * collection lives in the app, on My Account.
         *
         * An ordinary `<img>` at an https PNG is the only embedding every mail
         * client renders — inline `<svg>` is dropped by Outlook and Gmail,
         * `data:` URIs are blocked by both, and `cid:` needs a raster anyway.
         * The route behind it is unauthenticated because the fetcher is a mail
         * client or Gmail's image proxy, neither of which has a JWT.
         *
         * `alt` carries the badge name, so a client with images turned off still
         * reads which badge it was rather than an empty box.
         */
        const badgeStrip = tier
            ? `<div style="margin-top:18px;">
        <img src="${PUBLIC_BASE_URL}/api/support/badge/${encodeURIComponent(
            tier.key
        )}.png" width="${DISPLAY_WIDTH}" height="${DISPLAY_HEIGHT}" alt="${escapeHtml(
            tier.name
        )}" title="${escapeHtml(tier.name)}" style="vertical-align:bottom;border:0;"/>
    </div>`
            : "";

        const subject = `Rooms support: ${reporter} — ${doing} (${clickCount} clicks)`;

        const html = `
    <p>A user asked Clippy for help in the Rooms app. Their report:</p>
    <blockquote style="margin:12px 0;padding:10px 14px;border-left:4px solid #C8102E;background:#FBF0F2;font-size:14px;">${escapeMultiline(
        problem
    )}</blockquote>
    <table style="border-collapse:collapse;font-size:14px;margin-top:12px;">
        ${row("Reporter", escapeHtml(reporter))}
        ${row(
            "Reply to",
            contactEmail
                ? `<a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(
                      contactEmail
                  )}</a>`
                : "<em>No address on file</em>"
        )}
        ${row("Account", `#${escapeHtml(user.id)} (${escapeHtml(user.email || "no email")})`)}
        ${row("Trying to", escapeHtml(doing))}
        ${row("Severity", escapeHtml(severity))}
        ${row(
            "Clicks before giving up",
            `<strong style="color:#C8102E;">${clickCount}</strong>`
        )}
        ${
            tier
                ? row(
                      "Clippy badge",
                      `<strong>${escapeHtml(
                          tier.name
                      )}</strong> (${badgeNote})<br/><em style="font-size:12px;color:#666;">${escapeHtml(
                          tier.flavour
                      )}</em>`
                  )
                : ""
        }
        ${row("Page", `<code>${escapeHtml(page)}</code>`)}
        ${row("Browser", escapeHtml(browser))}
        ${row("Window size", escapeHtml(screen))}
        ${row("Reported at", escapeHtml(when || new Date().toLocaleString()))}
    </table>
    ${badgeStrip}
    ${
        userAgent
            ? `<p style="font-size:11px;color:#666;margin-top:14px;">User agent: <code>${escapeHtml(
                  userAgent
              )}</code></p>`
            : ""
    }
    <p style="font-size:12px;color:#666;margin-top:16px;">Raised automatically after ${clickCount} rapid clicks were detected. Reply to this email to reach the user directly.</p>
    `;

        const info = await sendGenericEmail({
            to: IT_INBOX,
            subject,
            html,
            replyTo: contactEmail || undefined,
            // No attachment: the badges are embedded as <img> from public URLs.
        });

        // `sendGenericEmail` swallows its own errors and returns undefined when
        // the send failed, so this is the only signal that the mail went out.
        // Telling the user "sent" when it was not is the one outcome this
        // endpoint must never produce.
        if (!info) {
            return res.status(502).json({
                message:
                    "Couldn't reach the mail server. Please email IT directly.",
            });
        }

        lastSentByUser.set(user.id, now);
        console.log(
            `Clippy ticket sent for user ${user.id} (${clickCount} clicks, top badge ${
                tier?.key || "none"
            }, ${newly.length} new, ${badgeStatus}) -> ${IT_INBOX}`
        );
        // Only the NEWLY earned ones, so the client never congratulates someone
        // on badges they already had — or on ones that failed to save.
        return res.status(200).json({ ok: true, newBadges: newly });
    } catch (error) {
        logErrorToFile(error);
        console.error("Error filing Clippy support ticket:", error);
        return res
            .status(500)
            .json({ message: "Something went wrong filing that ticket." });
    }
};

module.exports = { PostClippyTicket };
