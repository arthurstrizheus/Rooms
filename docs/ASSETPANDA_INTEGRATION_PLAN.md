# Asset Panda integration — plan

**Status: plan only. Nothing here is implemented.**

Scope: reuse MatterManager V3's equipment data, importer and usage reporting in
this app; keep scheduling here; mirror reservations and cancellations out to
Asset Panda; keep notifications here. The whole integration sits behind one
setting toggle.

Sources: `C:\Code\MatterManager\V3\SEAMatterManager` (referred to below as MM3)
and this repo.

---

## 1. What already exists

### MM3 has the read side, solved and live-validated

- `equipment_assets` (Postgres `mm3`) mirrors Asset Panda: `asset_panda_id`
  (unique), `name`, `serial_number`, `cost_code`, `rate_per_hour`,
  `rate_currency`, `rate_effective_start`, `office_name`, `display_name` (the
  Asset Panda asset number), `panda_fields` (raw JSONB), `active`,
  `last_synced_at`.
- `backend/services/assetPanda.js` — v3 API client. Session-token auth
  (`POST /session/token`, credentials in `ASSET_PANDA_EMAIL` /
  `ASSET_PANDA_PASSWORD`), in-process token cache, one re-auth + retry on 401.
- `backend/services/equipmentService.js#syncAssets()` — the importer.
- `backend/functions/threeE.js` — read-only MSSQL into `TE_3E_PROD`.
- Live-validated 2026-07-24: group "Assets" id `147456`, 2,945 assets, 394
  carrying a 3E soft-cost code, 284 rate-stamped.

**The client is read-only by design and says so as an invariant. No Asset Panda
write endpoint has ever been called from either system.** That is the single
biggest unknown in this plan — see §2.

### MM3 has no scheduling at all

No reservation model, no booking table, no calendar, no check-in/check-out. It
only *reads* Asset Panda's `action_objects` as a pre-selection hint when
creating an archive. So scheduling belonging to this system isn't a migration —
there is nothing to move.

### This app has the scheduling and none of the plumbing

- `Equipment-Items`, `Equipment-Checkouts`, `Equipment-CheckoutRecurrences`
  (MSSQL, Sequelize).
- **No join key to an external asset master.** `asset_number` and
  `serial_number` are nullable strings with no unique constraint and no index.
- **No outbound HTTP at all** in the backend. No queue, no retry, no outbox, no
  idempotency keys. Async side effects are bare fire-and-forget IIFEs whose
  failures are `console.error`'d and lost.
- **No migration framework.** Schema is `Model.sync({alter: false})` at boot,
  which will not add columns to existing tables, plus hand-written idempotent
  `.sql` run through `migrations/runMigration.js`.
- One `node-cron` job (`jobs/calibrationAlerts.js`, daily 08:00), in-process,
  no locking — it double-fires if the app is ever scaled out.

### What 3E actually supplies

One thing, for equipment: **the hourly rate**, reached by
`CostType.Code → Rate → RateTypeDate.DefaultRate` from the asset's normalized
soft-cost code. Verified live (Borescope Charlotte → code 505 → $300.00/hr USD).

3E does **not** supply matter/job assignment for an asset, client, cost centre,
GL code or custody. Those reach equipment only indirectly through an archive's
matter, which is an MM3 concept with no equivalent here.

> **The prize.** MM3 has the rate but explicitly cannot cost anything — it has
> no duration data at all. This app has the hours. Joining them is the first
> time either system can report equipment *cost*, not just *use*.

---

## 2. Phase 0 — the blocking spike: can we write to Asset Panda?

Everything in §7 depends on this and none of it should be built first.

Answer these, timeboxed:

1. Does the v3 API expose create / update / delete for `action_objects`
   (reservations and check-outs), or only the `GET` MM3 uses?
2. Does the service account have write permission, or is it read-scoped?
3. Can a reservation carry an external reference (a custom field, a note) that
   we can key on? **Without a stable external key there is no safe mirror** —
   only blind appends.
4. What does the per-asset "Checkout Eligible for Reservations" flag gate?
5. Is there any rate limit worth designing around?

**Fallback if reservation writes aren't available:** write a per-asset custom
field instead — "Reserved", "Reserved Until", "Reserved By". Coarser (no
history, no overlapping bookings) but field updates are far more likely to be
permitted. This changes §7 substantially, which is why it's a gate.

---

## 3. Phase 1 — data foundation

Add to `Equipment-Items`:

| Column | Type | Purpose |
|---|---|---|
| `asset_panda_id` | `NVARCHAR(64)` null | the join key; unique filtered index |
| `cost_code` | `NVARCHAR(32)` null | normalized 3E soft-cost digits |
| `rate_per_hour` | `NVARCHAR(32)` null | **string, never numeric — see below** |
| `rate_currency` | `NVARCHAR(8)` null | |
| `rate_effective_start` | `DATE` null | |
| `external_office_name` | `NVARCHAR(128)` null | Asset Panda's office string |
| `external_asset_number` | `NVARCHAR(64)` null | Asset Panda `display_name` |
| `panda_fields` | `NVARCHAR(MAX)` null | raw field map, for re-derivation |
| `last_synced_at` | `DATETIME2` null | |

`rate_per_hour` is a **string end to end**. MM3 deliberately casts
`DefaultRate` to `varchar(32)` in SQL so money never touches a float, and
formats by string manipulation. Match that. Do not `parseFloat` it.

Keep the existing `billing_rate` untouched and separate, so a manually entered
rate is never silently overwritten by a synced one.

**Adoption pass.** Existing equipment rows have no `asset_panda_id`. Match
candidates by serial → asset number → normalized name, then put them in front of
an admin for confirmation. Never auto-link on a fuzzy match; an equipment row
wrongly bound to an Asset Panda asset will mirror reservations onto the wrong
physical item.

**Migration mechanics.** Hand-written idempotent `.sql` through the existing
`runMigration.js`, matching `add-user-equipment-admin-columns.sql`. Don't
introduce a migration framework as a side quest of this project.

---

## 4. Phase 2 — the toggle

One switch, and it has to actually mean one switch.

New table `Equipment-AppSettings` (key + JSON value), mirroring MM3's
`App_Settings` pattern. One row, `assetPanda`:

```jsonc
{
  "enabled": false,          // the switch
  "source": "mm3",           // or "direct" — see §5
  "groupId": "147456",
  "fieldMap": { "name": "...", "serialNumber": "...", "costCode": "...", "office": "..." },
  "lastSync":   { "at": null, "ok": null, "count": 0, "error": null },
  "lastMirror": { "at": null, "ok": null, "pending": 0, "failed": 0 }
}
```

### Semantics — decided up front, not discovered later

- **Off is the default and the safe state.** No import runs, no outbound call is
  made, no mirror is attempted, the Asset Panda columns are hidden in the UI,
  and the app behaves exactly as it does today.
- **Off does not delete anything.** Previously mirrored data and previously
  synced columns are retained. Turning the switch off is not a destructive act.
- **Turning it on runs a connection check first** and refuses to enable if
  authentication fails, so the switch can't be left in a lying state.
- **Turning it off with work queued** stops the dispatcher and marks queued rows
  `paused`. It does **not** try to unwind reservations already written to Asset
  Panda — a switch that silently deletes remote data is a trap. Show the admin
  the stranded count instead.
- **Enforced at exactly two places**: the scheduler tick and the outbound
  dispatcher. One `assetPandaEnabled()` check each. If the gate ever needs to be
  repeated inside a controller, the design has drifted.

### Surface

There is no settings page in this app today and no entry in
`Views/Components/Shell/navConfig.js`. Add one, admin-only: the switch,
connection status, last sync result, last mirror result, the dead-letter list,
and a "Sync now" button.

---

## 5. Phase 3 — import

### Where the data comes from — recommendation

**Read through MM3, not straight from Asset Panda.**

| | via MM3 API | direct to Asset Panda |
|---|---|---|
| Asset Panda credentials | one set, already live | a second set to manage |
| Pollers hitting the account | one | two, racing |
| 3E rates | already stamped, free | needs a second MSSQL link to `TE_3E_PROD` |
| Field mapping | already resolved live | re-detect and re-validate |
| Availability | depends on MM3 being up | independent |

MM3 already exposes `GET /api/equipment/assets`. This app keeps its own mirror
table, so MM3 being down costs staleness, not function. The `source` setting
keeps the direct path open if that coupling proves wrong.

Note this is read-only. **Writes in §7 go straight to Asset Panda regardless** —
MM3 has no write path and shouldn't grow one for us.

### Importer semantics — copy MM3's, they're the valuable part

Not the code (different engine, different dialect) — the rules:

- **Abort without side effects.** Any failed page aborts the whole sync with
  zero writes; only the error is recorded. A half-applied asset list is worse
  than a stale one.
- **Deactivate, never delete.** Missing upstream ⇒ `active = false`.
- **A zero-asset or cap-tripped pull deactivates nothing.** Warn only. This is
  what stops one bad pull from emptying the catalog.
- **One transaction** for the whole write phase.
- **Overlap guard** — a second sync while one is in flight returns immediately.
- **`lastSync` merged under a row lock**, so bookkeeping can't clobber a
  concurrent settings save.
- Join key `asset_panda_id`, dedup within a pull via a seen-set.

Cadence: max age 24h, hourly tick, plus an unthrottled manual "Sync now" — same
as MM3. Reuse the existing `node-cron` scheduler, but add a DB lock row, because
that scheduler has no locking today.

---

## 6. Phase 4 — usage reporting

### Fix what's already wrong first

Mirroring a broken number just spreads it. In `usageReportController.js`:

- **Recurring reservations are never expanded.** Only the stored head row is
  counted, so a weekly series for a year reports as one reservation and one
  occurrence's hours. `generateRecurringCheckouts()`
  (`checkoutRecurrenceController.js:154`) already does the expansion.
- **The status filter is wrong at both ends** (`usageReportController.js:125`).
  It includes `checked_out` and `returned`, which are not in the ENUM and never
  exist in the data, and excludes `reserved`, which does.
- `groupBy=week` is documented but unimplemented and falls through to a 400.

### Then adopt MM3's reporting contract

Three detail levels — `summary` (one row per asset), `monthly` (asset × month,
dense, zero-filled), `uses` (one row per record) — plus its field catalog and
CSV filename convention, so the two apps' exports can sit in the same
spreadsheet.

Add the column MM3 cannot have: **cost = hours × `rate_per_hour`**, decimal-safe.

### Do not merge the two definitions of "usage"

- MM3: one *use* = one asset recorded on one archive. No duration exists.
- Here: one *reservation*, measured in wall-clock booked hours.

They answer different questions. Report them side by side and label them.
Averaging them produces a number that means nothing.

---

## 7. Phase 5 — the mirror

### Reconcile state; do not emit events

The naive design — "on save, push" — breaks immediately on this schema, because
one user edit can restructure a series into three database rows:

| Edit | What actually happens | `checkoutController.js` |
|---|---|---|
| `this` | old recurrence truncated, a **new single** checkout created, and a **new recurrence + new head** created for the remainder — one row becomes three | `:860`, `:863`, `:944`, `:986` |
| `following` | old recurrence truncated, new recurrence + new head from this occurrence forward | `:1059`, `:1062`, `:1083` |
| `all` | head mutated in place, recurrence updated in place | `:1232`, `:1256` |
| create | | `:604` |
| approve | | `:1490` |
| cancel | soft — status set to `cancelled`, never deleted | `:1610` (DELETE), `:1437` (PUT) |

An event-per-write mirror leaves orphans in Asset Panda every time someone edits
one occurrence of a weekly booking. Instead: for a given equipment + series,
**compute the desired set of remote reservations and diff it against what's
there**, keyed by a stable external id. Idempotent, and self-healing after any
missed message.

**Stable key:** `rooms-checkout-{id}` (plus `-{occurrenceIndex}` if occurrences
are written individually). This system already has this identity scheme — the
ICS UID `equipment-checkout-{id}@equipment.sealimited.com` with `SEQUENCE` from
the update count (`utils/icsUtils.js:68`, `:75`). Reuse it so the calendar
invite and the Asset Panda record agree on what a reservation *is*.

**Recurrence:** Asset Panda almost certainly has no RRULE. Either write a
bounded horizon of expanded occurrences (say 90 days, re-extended nightly) or
one span covering the series. Recommend the horizon — it degrades gracefully and
`generateRecurringCheckouts()` already produces exactly that. `icsUtils.js:86`
already builds a real RRULE if the span approach turns out to be supported.

### The outbox — non-negotiable

This app has no outbound infrastructure. A lost cancel means a piece of
equipment stays marked reserved in Asset Panda indefinitely, and nobody finds
out. Fire-and-forget is not adequate for this.

New table `Equipment-AssetPandaOutbox`: `id`, `checkout_id`, `equipment_id`,
`external_key`, `operation` (`upsert` | `cancel`), `payload`, `status`
(`pending` | `inflight` | `done` | `failed` | `paused`), `attempts`,
`next_attempt_at`, `last_error`, timestamps.

- Controllers only **INSERT into the outbox, in the same transaction as the
  checkout write.** They never call Asset Panda.
- One dispatcher on the existing cron: claim, send, exponential backoff, capped
  attempts, dead-letter. Idempotent by `external_key`.
- The dispatcher is the single choke point where the toggle is read.

Cancel is a soft status change here, so its mirror op is "reconcile this key to
empty" — safe to retry, safe to run twice, correct if it runs late.

### Direction is one-way

This system writes reservations to Asset Panda. It never accepts reservation
edits made *in* Asset Panda. Say so in the settings UI, or people will assume
two-way and schedule things in the wrong place.

---

## 8. Phase 6 — notifications

Notifications stay here. This app already owns the SMTP/ICS/socket stack and the
recipient lists (`Equipment-Alerts` subscriptions), which MM3 knows nothing
about — so its notification service is the wrong home for these.

Gaps to close, since the ask is "notifications from this system":

- **There is no approval-request email and no approval-decision email today.**
  `sendCheckoutApprovalRequestEmail`, `sendCheckoutApprovedEmail` and
  `sendCheckoutDeclinedEmail` are all written and **never called from
  anywhere**. Worse, the Approval Queue UI doesn't call the `Approve` controller
  at all — it PUTs `{status: "auto-approved"}` to `/api/checkouts/:id`
  (`ApprovalQueue.js:176`), bypassing `:1473` entirely, so even the socket event
  is skipped.
- **Add a mirror-failure alert to admins** on dead-lettered outbox rows.
  Otherwise the mirror fails in silence, which is the failure mode that makes
  people stop trusting an integration.

---

## 9. Risks and open decisions

1. **Asset Panda write capability is unproven.** Blocking. §2.
2. **Two live bugs sit on the code paths this touches.** `Op.iLike` is Postgres
   syntax running on an MSSQL connection at `checkoutController.js:703-705` and
   `:1591-1592` — both throw today. That breaks the scheduled-on-behalf-of email
   and the on-behalf-of delete authorization. Fix before layering mirroring on
   the same paths.
3. **No unique key on equipment today**, so §3 has to land before anything else.
4. **Asset Panda service-account permissions** — writing needs a different grant
   than reading; confirm before the spike, not during.
5. **Read via MM3 or direct?** Recommendation in §5; it's a coupling call, and
   the `source` setting keeps it reversible.
6. **The two "usage" definitions must stay separate.** §6.
7. **The cron scheduler has no locking** and will double-fire if this app is
   ever run on more than one instance. Add the lock row with the importer.

## 10. Suggested order

```
Phase 0  spike: can we write?                    ← gate, do this first
Phase 1  columns + unique index + adoption pass
Phase 2  settings table, toggle, settings page   ← before any outbound code
Phase 3  importer (read via MM3)
Phase 4  usage report fixes, then rate + cost
Phase 5  outbox + reconciling mirror             ← depends on Phase 0
Phase 6  approval + mirror-failure notifications
```

Phases 1–4 are useful on their own even if Phase 0 comes back negative: the
catalog stops being hand-maintained, and the usage report gains real rates and
correct recurring numbers. Only Phase 5 is truly gated.
