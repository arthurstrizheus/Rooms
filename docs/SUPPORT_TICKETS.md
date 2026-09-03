# Help desk (FreshService) integration

Users raise IT tickets from inside the app. The ticket is filed against the
signed-in user so the help desk's reply reaches the person who asked.

## Configuration

| Env var | Required | Notes |
|---|---|---|
| `FRESHSERVICE_DOMAIN` | yes | e.g. `sealtd.freshservice.com`. Quotes in `.env` are stripped — see below. |
| `FRESHSERVICE_API_KEY` | yes | Used as the basic-auth **username**; the password is ignored. |
| `FRESHSERVICE_REQUESTER_EMAIL` | no | **Not read by any code.** Requesters are the signed-in user. Left in place only because it predates this integration; safe to delete. |

Both required vars must be set. A domain with no key produces a 401 per attempt,
which is worse than being switched off, so `isEnabled()` requires both.

**When it is off, it is invisible.** `GET /api/support/status` reports `enabled:
false`, and every entry point in the UI hides itself. Nobody is shown a button
whose only possible outcome is an error.

`.env` values here are quoted (`FRESHSERVICE_DOMAIN='sealtd.freshservice.com'`)
and dotenv keeps the quotes when a value has surrounding whitespace. The client
strips them — an unstripped quote produces `https://'sealtd...'`, which fails DNS
resolution with a message that looks nothing like a config error. This is the
same trap that `ldapConfig.js` already guards against.

## Shape

```
src/Views/Components/Support/SupportContext.js   provider + useSupport(), mounted once in the shell
src/Views/Components/Support/SupportDialog.js    the form
backend/routes/support.js                        GET /status, POST /ticket — both behind auth
backend/controllers/supportController.js         validation, throttle, description assembly
backend/services/freshservice.js                 the API client — ticket creation only
```

Any component calls `openSupport()` from `useSupport()`. Two entry points today:

- **Sidebar → account menu → "Get help"** — a general request.
- **Equipment detail page → "Report a problem"** — carries `equipmentId`, so the
  ticket names the asset, its asset/serial number, location and current status.

## Rules the implementation holds to

**The requester comes from `req.user` and nowhere else.** The browser can put
anything in the body; a client-supplied email would let one person file tickets
as another, and the reply would go to that person.

**Equipment is resolved server-side from `equipmentId`.** A client-supplied
equipment name is never trusted into the ticket.

**Every interpolated value is escaped** with the same `escapeHtml` the mailer
uses — exported from `mailController` rather than copied, so the two can't drift.

**Field lengths are capped, not rejected** (subject 150, details 4000). A long
paste still files a ticket instead of bouncing the user back to a form they'd
have to trim by hand.

**One request per user per minute**, returning `429` with the remaining seconds.
The clock only starts on a request that actually landed, so a failure doesn't
lock the user out. This is in-process: it exists to stop a frustrated user filing
the same ticket six times, not to defend against an attacker — the endpoint
already requires a session. It resets on restart and is per-instance.

**`createTicket` never throws** — a help desk being unreachable must not take
down a page. It returns `{ ok, id?, error? }`, and the controller returns `502`
when `ok` is false. Answering "sent" for a request that went nowhere is the one
outcome this endpoint must never produce, so the return value is always checked.

**Secrets never reach a log.** The API key is the basic-auth username, so an
unsanitised request dump would leak it. Error bodies are truncated to 300 chars
before logging — FreshService echoes the submitted payload back in validation
errors, which would otherwise put the user's own text in the log twice.

**Requests time out at 8s** via `AbortSignal`, so a hanging help desk doesn't
hold an Express worker.

## Priority

`equipment-issue` files at priority 3 (high) — field work stops when a tool is
unusable. Everything else is priority 2. Categories are duplicated between
`supportController.CATEGORIES` and the dialog; an unknown value server-side falls
back to `other`, so the two drifting apart degrades quietly rather than failing.

## Deliberately not built

- **No ticket reading, updating or closing.** FreshService is the help desk's
  system of record, not ours. This app writes and forgets.
- **No unauthenticated endpoint.** The meeting-room app exposes an
  unauthenticated `/api/zscaler` route that proxies an arbitrary request body
  straight to the FreshService ticket API. That is not reproduced here.
- **No local ticket table.** Nothing to keep in sync, nothing to go stale.
