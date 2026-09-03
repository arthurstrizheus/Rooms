# Reservation approvals

Equipment can be marked **requires approval**. When it is, an admin names who
approves it — specific people, Active Directory groups, or both — and
reservations of that equipment are created `pending` until one of them acts.

## Model

`Equipment-Items.requires_approval` turns the gate on. `Equipment-Approvers`
says who holds the key: one row per approver, each either a person (`user_id`)
or a group (`ad_group_dn` + `ad_group_name`).

A `CHECK` constraint enforces exactly one of the two per row — in the database,
not only in the controller, because a half-populated row would silently drop
that approver from every future lookup. Filtered unique indexes stop the same
person or group being added twice to one piece of equipment.

**Groups are stored, not expanded.** Membership is resolved from AD at the
moment it's needed, so adding someone to the group makes them an approver
immediately and removing them revokes it, with nothing here to re-sync.

## Rules

**Any one approver is enough.** Not all of them — all-of would deadlock the
first time someone went on leave.

**No approvers named = administrators approve.** Turning the flag on without
picking anyone must never strand a reservation with nobody able to act on it.
The picker says so rather than leaving it implicit.

**Approvers are authorization, not just notification.** Being named is what
grants the right to approve; it is not a mailing list bolted onto an
admin-only action.

**Turning `requires_approval` off keeps the rows.** Turning it back on should
not silently lose the configuration.

**AD failures fail closed.** An LDAP outage denies group-derived approval
rights rather than granting them. Failures are not cached, so a transient
outage doesn't lock a legitimate approver out for the length of the TTL.

**Group membership is cached for 5 minutes.** A directory round trip per
authorization check would make the queue crawl; caching for hours would mean
someone removed from a group keeps approving. Five minutes is the compromise,
and it is the number to change if that balance is wrong.

## What this replaced

The approval path had no meaningful access control at all. Specifically:

- `GET /api/checkouts/pending-approvals` had **no scoping and no role check**
  — no reference to `req.user` anywhere in it. Every authenticated user
  received every pending reservation in the system. Since the same response
  drives the sidebar badge and the nav guard, everyone also saw a badge
  counting other people's requests. Scoping that one endpoint fixes all three.
- `PUT /api/checkouts/:id/approve` had **no authorization check**, and read
  `approved_by_user_id` **from the request body** — so any signed-in user could
  approve any reservation and attribute the decision to somebody else.
- `PUT /api/checkouts/:id`, which is what the approval queue actually uses,
  allowed non-admins to set `status` to `cancelled`. Declining *is* setting
  cancelled, so **any user could decline anyone's reservation**. It also
  *silently dropped* a disallowed status instead of refusing, so the queue
  reported "N reservations approved" when nothing had happened.
- `/approve` had **no route guard** in `Routes.js`, unlike every other
  privileged page. Typing the URL was enough.
- `equipment_office_admin` was excluded from the approve check while being
  shown the page — office admins saw a queue they couldn't act on.

Three notification emails — `sendCheckoutApprovalRequestEmail`,
`sendCheckoutApprovedEmail`, `sendCheckoutDeclinedEmail` — had been written,
exported, and **never called from anywhere**. A reservation could sit pending
with nobody told it existed, and be decided with nobody told the outcome.

## Notifications

| Event | Who is told |
|---|---|
| Reservation created on approval-gated equipment | that equipment's approvers |
| Approved | the requester |
| Declined | the requester, with the reason |

Approval mail goes to the equipment's approvers — not to every administrator,
and not to the `Equipment-Alerts` subscribers, who are *watching* the equipment
rather than gatekeeping it.

All of it is fire-and-forget after the response, matching the rest of the
controller: a slow mail server must not hold the HTTP response, and a dead one
must not fail a decision that has already been written. If no approver can be
resolved, that is logged rather than passed over in silence — it means a
reservation is sitting in a queue nobody is looking at.

A cancellation counts as a **decline** only when the reservation was still
`pending` and someone other than the requester cancelled it. "Your reservation
was cancelled" reads as an administrative accident; a decline needs its own
wording.

## Gotcha for anyone extending this

`Rooms-Users.equipment_office_admin` holds an **office id** (integer).
`Equipment-Items.location` holds an office **Alias** (string). They are not
comparable. `mailController.js` compares them directly and therefore matches
nothing — do not copy that pattern; resolve through the `Office` model.
