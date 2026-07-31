---
name: operating-discipline
description: "The shared operating method behind every other skill. Use at the start of any non-trivial coding, analysis, review, or multi-step task — anything beyond a one-line answer or a single mechanical edit — and whenever a domain skill says 'per operating-discipline'. Provides the intake block, premise verification, the ordered blast-radius scan, prioritization rules, decision records, claim/verification standards, the report and delegation-brief templates, and the red-flag STOP list. Not a substitute for domain skills — it is the procedure layer they all share."
---

# Operating Discipline

Weaker models do not infer unstated judgment — they follow explicit text and fill templates. This skill IS that text: execute its procedures literally and fill its templates verbatim. Domain skills add domain rules on top; on domain content the domain skill wins, on operating method this skill wins. Portable: project facts (ports, paths, commands) come from the project's CLAUDE.md, never from here.

## 1. Intake — before any edit or dispatch

Write this block into your working notes (a scratchpad file for multi-step work). It is a deliverable, not a mental note:

```
INTAKE
Goal: <one sentence, ending with what "done" observably means — a command that exits 0, a screen that renders X, a report delivered>
Constraints (VERBATIM): <quote the user's exact constraint sentences — paraphrase loses requirements>
Affected surfaces: <file:line for every call site, consumer, and dependent — grep-driven, rule 1 below>
Knowns: <facts verified, each with file:line or command evidence>
Unknowns — BLOCKING: <would change what you build — resolve BEFORE building>
Unknowns — deferrable: <note and continue>
Risks: <top items from the blast-radius scan, section 3>
```

1. **The affected-surfaces inventory is grep-driven and written down BEFORE the first edit.** Grep every symbol, endpoint, table, event name, and route the change touches; list each consumer/reader/writer with file:line. If you cannot name who else reads or writes a thing you are about to change, intake is not finished.
2. **Resolve blocking unknowns first** — map → design → build, never build-then-discover. Criterion: if the answer would change what you'd write, the unknown is blocking.
3. Scale intake to the task; do not skip it because the work "looks small." A mechanical single-file edit gets a four-line block. A **trivial** task (context-lean-orchestrator's Direct mode: no discovery, ≤3 files, no design judgment, nothing in tiers 1–2, "done" in one sentence) gets that one sentence and nothing more — no affected-surfaces inventory up front, because its verifier agent produces that inventory afterwards by grepping the consumers. Anything that fails a trivial test gets the full block.

## 2. Premise verification

- Every claim about how the system works — from the user, docs, memory files, a plan file, an earlier report, or your own assumption — gets checked against the current code (targeted grep/read, or run the thing) before work builds on it.
- The user's description of a bug or behavior is also a premise. If reality differs (different trigger, different scope, not actually broken), that difference IS the finding.
- **A discovered false premise is the headline of your very next message, never a footnote** — it invalidates everything built on top of it. Stop dependent work until the decision-holder re-confirms direction.

## 3. Blast-radius scan — ordered; higher tiers block lower ones

Run at intake and again at every change point. Check and fix in this order; NEVER ship a lower-tier item while a higher-tier item is open, and never polish before correctness:

1. **Security / tenancy** — authentication, permissions, tenant scoping on every query and broadcast, data egress, injection, secrets in logs.
2. **Data integrity & money** — money is never float/double (DECIMAL or integer minor units); transactionality; state after partial failure; idempotency; anything irreversible.
3. **Correctness** — the change does what was asked, including the failure path (invalid input, failed request).
4. **Compatibility / migration** — existing consumers, schemas, stored data, public contracts. Prefer additive and backward-compatible on live systems; destructive or irreversible operations (drop/rename/mass-update/delete) require an explicit gate: dry-run first, then user sign-off. A dry-run means showing the decision-holder the exact statements/files that would change plus the affected-surfaces inventory for them; the sign-off must reference that output — sign-off on a one-line intent ("I will rename the table") is not the gate.
5. **UX** — loading/empty/error states, responsiveness, live updates.
6. **Polish** — naming, dedupe, style.

At each change point answer, in writing when non-trivial: who else reads/writes this? What races? What happens on partial failure? What breaks on rename/reorder/retire? What does this do to live production data?

## 4. Prioritization

- De-risk before you invest: blocking unknowns and highest-tier blast-radius items first; cheap-and-certain before expensive-and-uncertain.
- **Right-size the machinery before starting.** Trivial work — no discovery, ≤3 files, no design judgment, nothing in blast-radius tiers 1–2 — is done directly, right now, with no agents and no exploration, and then swept by one cheap verifier (context-lean-orchestrator's Direct mode). Ceremony on a two-minute change is its own failure mode: the user waits longer for the same edit.
- **Above that bar the question is never "agent or do it myself" — it is which tier and how many.** A main thread that reads and edits files across a real task spends the most expensive context it has on the cheapest work there is. One `haiku` agent handles a lookup, a read, or a summary feeding a larger task; a fleet handles multi-area work. State the shape you chose when it isn't obvious. (Fleet mechanics and main-thread hygiene: the context-lean-orchestrator skill.)

## 5. Decisions

- **Record before the work**: what was decided, one-line why, and the rejected runner-up. Multi-area work gets ONE arbiter document that wins all conflicts **while the task is in flight**; at task end its decisions are reconciled into the project's `plan.md`, which is the arbiter ACROSS sessions (project-plan-maintenance).
- Mid-work choice you can own: pick one, state why in one line, note the runner-up, proceed. Never present an options menu for something you can decide; never decide something the user explicitly owns (scope, destructive operations, public/cross-repo contracts, spending).
- **Deviations are surfaced, never silently absorbed**: any departure from the arbiter, the record, or the approved plan is reported to the decision-holder with a reason — in the report's Surprises & deviations line, and immediately if it threatens a standing decision.

```
DECISION: <what> | why: <one line> | rejected: <runner-up + one-line why not>
```

## 6. Claims & verification

A reported issue COUNTS only in this shape; anything less is labeled a **hunch**, never a finding:

```
FINDING
Claim: <one sentence — the defect>
Evidence: <file:line>
Failure scenario: <these inputs / this state → this wrong outcome>
Severity: <tier number from section 3>
Proposed fix: <one line>
```

- Verify by **executing the real path** — run the test, hit the endpoint, boot the app, click the flow — never by re-reading code you just wrote. Exercise the failure path, not only the happy path.
- **Never state or imply a check passed that did not run.** Every verification item reports pass / fail / not run + why. If a probe lacks a fixture (second tenant, unprivileged user, second browser), first try to create the fixture and run it; only if genuinely impossible does it go under `Not run:` — it never appears in the passed list.
- **Critique pass — after producing any substantial artifact, BEFORE declaring it done.** Substantial = a spec/design doc, a sizable diff, a migration, or a user-facing deliverable. Procedure: critique the artifact from independent perspectives with DISTINCT lenses, picking the lenses that fit it (correctness, security/tenancy, consistency-with-sources, migration/rollout safety); each critique must state a concrete failure scenario (these inputs / this state → this wrong outcome) or it does not count; fix confirmed issues, then re-check the fixed artifact against the same lenses. An agent working alone on its own deliverable: self-critique against those lenses, written into its working notes. Orchestrated work: independent critic agents per context-lean-orchestrator's verification-fleet procedure — follow it there, do not improvise a variant.

## 7. Reporting

Every report — to the user or to a calling agent — uses this shape, in this order:

```
REPORT
Outcome: <what happened / what was found — always first>
Key facts: <minimal decision-relevant list, file:line cited>
Surprises & deviations: <false premises, arbiter deviations, latent bugs discovered — NEVER buried; "none" if none>
Not run: <every check skipped or impossible, with why — "none" if all ran>
Paths: <files holding the exhaustive detail>
```

- Exhaustive detail (inventories, evidence, payload shapes) goes in FILES; the reader of your return does not have your context, so each file must stand alone. The return itself stays minimal.
- Complete sentences; technical terms spelled out; no invented shorthand or codenames; file:line for every factual claim.
- A latent bug discovered mid-task is reported under Surprises — not silently fixed and not silently dropped.

## 8. Delegation brief

Work above the trivial bar is handed to subagents by default — every read, edit, and verification (context-lean-orchestrator). Trivial work is the exception: it is done directly and only its verification sweep is dispatched, as a few concrete lines rather than a brief file. Each real hand-off instantiates this template into a brief file the agent is pointed at; for a one-shot cheap dispatch the brief may be four lines, but the fields are still filled (fleet mechanics, ownership partitioning, and integrators: the context-lean-orchestrator skill):

```
BRIEF: <task name>
Goal + done-means: <one sentence, observable>
Constraints (VERBATIM): <the user's exact words>
You own: <paths>   You must NOT touch: <paths — another agent or the user owns them>
Contracts: <path to the arbiter doc; shared invariants are written into BOTH sides' briefs>
Discipline: follow the operating-discipline skill — write your own INTAKE block, verify premises, run the STOP list, report pass/fail/not-run honestly
Return exactly: the REPORT template of operating-discipline section 7 (+ notes_for_integrator when an integrator exists)
Model: <tier from the table below — every dispatch names one>
```

### Model tier — dispatch the cheapest model that can do the job

The default is NOT the strongest model. It is the cheapest tier whose output you would not have to redo. Pick per dispatch, from the work, never per project:

| Tier | Dispatch it when | Typical tasks |
| --- | --- | --- |
| `haiku` | The work is mechanical and needs **zero discovery** — you can name the exact file and the exact change or question in the brief | read a file/section and report what is in it; **sweep the consumers of a change you just made and run its narrow check** (the direct-mode verifier); summarize a brief, report, or diff; list call sites from a grep pattern you supply; change a label, copy string, icon, constant, or config value *as part of a larger task*; add a translation key to `en.json` + `es.json`; apply a supplied `plan.md`/docs edit; confirm a file exists or a command exits 0 |
| `sonnet` | One surface, a clear spec, no design judgment | add a field to an existing form; drop an existing component onto a page; add a column to an existing table; add a route that mirrors a named sibling; write tests for a specified function; apply a stated find-and-replace across files |
| `opus` | Implementation against a written contract — the **builder default** | multi-file features, refactors, migrations, fixers applying confirmed findings, doc writers working from a spec |
| session default (strongest) | Judgment is the product | orchestration, design/spec writing, adversarial critics and refuters, integrator and final-gate agents, security/tenancy review, diagnosing a failure whose cause is unknown |

0. **A standalone trivial edit is not a dispatch at all** — make it yourself (context-lean-orchestrator's Direct mode) and spend the `haiku` dispatch on verifying it instead. The tiers below apply once the work is real.
1. **The brief pays for the cheap tier.** A `haiku` brief carries exact paths, exact strings, and no question that requires searching. If you cannot name the file and the change, it is not a `haiku` task — map first or move it up a tier.
2. **Escalate, never nag.** A cheap agent that returns "couldn't find it", "ambiguous", or "this touches more files than the brief said" gets re-dispatched one tier up with the missing facts — not a second attempt at the same tier.
3. **Never downgrade** for: security, tenancy, or permission work; destructive/irreversible operations; migrations; verification gates and refuters; or any output that will be believed without being re-checked.
4. **Never dispatch `fable`** — use Opus 5 (the `opus` tier) in its place, including for cyber-security work. Ordinary work picks from the four rows above; `fable` is not one of the options.
5. Cheap tiers are not exempt from discipline — they still return the section 7 REPORT shape and still report `Not run` honestly.
6. In Workflow scripts the same tiers go on `opts.model`; mechanical stages also take `effort: 'low'`. Omit the override only when the session default is genuinely the right tier.

## 9. STOP list — halt mid-keystroke and re-check when you catch yourself

1. Writing "should work" / "likely fixed" instead of demonstrating it works.
2. Editing a file you have not read this session; trusting a description of code over the code itself.
3. Matching or joining on a NAME/string where an id exists (a rename becomes a silent unlink).
4. Float/double for money; an unbounded/unpaginated query; fetch-all-then-filter in application code.
5. An empty catch, an ignored rejected promise, or an auth/permission error path that fails open; a "temporary" hack with no written removal path.
6. Copy-paste-adapting a sibling whose shape you cannot explain in one line — read it end-to-end first.
7. Testing only the happy path; skipping the failure path.
8. `git status` / the diff showing files the task does not implicate — revert or justify each before continuing.
9. About to mark an item done whose verification you did not execute — move it to `Not run:` instead.
10. About to run `git branch` / `git checkout -b` / `git switch -c` (or any worktree that forks a new branch) — STOP: work and commit directly on `main`; NEVER create a branch unless the user explicitly asked for one in that same message.
11. In the main thread on **orchestrated** work, about to Read a source file, edit code, or open a full brief/report/agent output — STOP: dispatch an agent (cheapest capable tier) and take back the answer, not the contents. "It's only one line" does not turn a real task into a trivial one.
12. On a **trivial** task, about to spawn agents, write a brief or intake block, map the codebase, or explore beyond the file named — STOP: make the edit, then send one verifier (context-lean-orchestrator's Direct mode). Process the user did not need is a cost, not a safeguard.
13. Direct-mode edit made and about to call it done with no consumer sweep and no executed check — STOP: that is rule 1 wearing a different hat. Send the verifier.

On any trigger: stop, re-check against the relevant section above, fix or surface, then continue.

## Final Rule

Intake before edits, premises before plans, tiers before polish, evidence before claims, honesty before green checkmarks. If you cannot show the filled template, the step did not happen.
