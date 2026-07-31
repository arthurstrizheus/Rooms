---
name: context-lean-orchestrator
description: "Use for SUBSTANTIVE work that touches the codebase — a feature across areas, codebase mapping, migrations, audits, reviews, large builds, research, or anything with real discovery in it. Makes the agent work as an ORCHESTRATOR: delegate every read, edit, and verification to subagents (cheap tiers for small work), keep the main thread free of file contents by exchanging FILES (briefs, maps, reports in the scratchpad) instead of pasted content, require subagents to return only decision-relevant summaries, and read back only the sections needed to decide. The main thread holds decisions, never file contents. TRIVIAL work is the explicit exception and is done DIRECTLY in the main thread with no subagent, no brief, no map, no deep dive: a label or copy change, a locale key, a constant, one page action, a small obvious fix — any bounded edit needing no discovery and no design judgment. Direct mode still reads the target file before editing, and then hands the sibling sweep and the narrow check to ONE cheap verifier agent afterwards — because confirming consumers means reading many files. See the Direct-mode section."
---

# Context-Lean Orchestrator

## Purpose

Big tasks die two deaths: the agent drowns its own context reading everything itself, or it serializes work that could run in parallel. Small tasks die a third: they get wrapped in ceremony that costs more than the change. This skill makes the agent operate the way a good tech lead does — **hold decisions, not file contents; and do the two-minute thing yourself instead of writing a ticket for it** (Direct mode, below). The orchestrator designs, dispatches, integrates conclusions, and verifies; subagents do the reading, writing, and testing. Context is managed by moving information through **scratchpad files**, not through prompts and transcripts. The orchestrator and every subagent follow the **operating-discipline** skill — LOAD it now, before Step 0, and fill its templates from its text, not from memory. This skill adds the fleet mechanics on top; state that lives in files and commits survives long sessions and interruptions.

## Direct mode — trivial work is done here, immediately

Delegation exists to keep bulk out of the main thread. A trivial change carries no bulk, so briefing an agent for it costs more context and more wall-clock than doing it. **Trivial work is done directly in the main thread: no subagent, no brief, no map, no scratchpad file, no deep dive. Just make the change.**

**A task is trivial only when ALL of these hold:**

1. **No discovery.** You can already name the file(s) — or one grep finds them — and you know the exact change. If you would have to explore to learn *what* to change, it is not trivial.
2. **Small and bounded** — roughly ≤3 files and a contained edit: a label or copy string, a locale key pair, an icon, a constant, a config value, a prop, a style token, one page action (add / remove / rename / reorder / hide a button, menu item, column, tab, or link), a small obvious fix, a doc line.
3. **No design judgment.** Nothing to choose between; no new component, module, endpoint, or table; no schema change or migration; no new pattern being established.
4. **Nothing in blast-radius tier 1–2** (operating-discipline §3): no auth, permissions, or tenancy; no money or data-integrity path; nothing destructive or irreversible.
5. **"Done" fits in one sentence** you could hand to someone else verbatim.

If any one of the five fails, it is not trivial — use the delegated path below. When it is genuinely borderline, start direct and escalate on the first trip-wire.

### Direct mode skips the process, never the quality bar

The **edit** is inline. The **verification sweep** is not — confirming siblings are fine means reading many files, which is exactly the bulk the main thread must not absorb. So:

1. **Read before you edit** — the one file or region you are changing, never a description of it. One target file in the main thread is the cost of doing the edit; a tour of its neighbours is not.
2. **Make the edit.**
3. **Keep obvious parity as you go**, where it is a known pair and needs no searching — `en.json` + `es.json` together, the doc line that names the string.
4. **Dispatch ONE cheap verifier agent** (`haiku`, or `sonnet` if the surface is wider) — this is the single dispatch direct mode allows, and it comes *after* the edit, not before. Its brief is short and concrete:
   - Here is what changed: `<file:line>`, `<old>` → `<new>`.
   - Grep `<symbol / string / key / prop / route / component>` and open every consumer — handlers, tests, menu or permission registries, locale files, docs, mirrored siblings.
   - Report whether each is still correct, and fix the trivially-broken ones (name which it may touch).
   - Run `<the narrow check>` — the covering test file, the lint/build for the touched area, the real screen or endpoint — and report pass / fail / **not run**.
   - Return ≤10 lines: consumers found, verdict per consumer, what was run, what was not.
5. **Act on its return, then report in a few lines**: what changed, what the verifier confirmed, what ran, what did not.

**Siblings are part of the deliverable, not an optional extra** — direct mode changes *who reads them*, never whether they get checked. If the verifier comes back with breakage beyond a trivial fix, that is a trip-wire: stop and go delegated.

### Trip-wires — abort direct mode the moment one fires

Say so in one line, then switch to the delegated path:

- The verifier reports more consumers than expected, consumers in areas you weren't touching, or breakage beyond a trivial fix.
- The file is not what you assumed, or the change needs a decision you haven't been given.
- The edit is growing past a few files, or it turns out to need a new module, a migration, or a permission change.
- You are about to open a second or third file just to work out *what* to change — that is discovery, and discovery is delegated.

## Delegate real work — the question is then how many agents and which tier

Above the trivial bar, delegation is the default and there is no "I'll just do this one inline": anything with discovery in it, spanning areas, or needing judgment is agent work, differing only in **tier** (operating-discipline §8) and **fan-out**.

- **One `haiku` agent** — a bounded read, a lookup, or a summary that is *feeding a larger task* (a trivial standalone edit is direct mode, not a dispatch).
- **One `sonnet`/`opus` agent** — a single-surface change or a single-file cleanup with a spec.
- **A fleet + integrator** — multi-area work, unbounded reading, or phased work (map → design → build → verify).

Outside direct mode the main thread may only: talk to the user, write briefs and contracts, dispatch and resume agents, read back *summaries or specific sections* of scratchpad files, run `git status`/`git log --oneline`-class one-liners to see what landed, and decide. Anything that would put a large source file, a full brief, or a full report into the main thread belongs in an agent instead.

Pure conversation — answering from what is already in context, with no new reading — needs neither mode.

## Main-thread context hygiene — non-negotiable outside direct mode

These rules govern orchestrated work. Direct mode's one carve-out is reading the single file you are editing — that is the cost of doing the edit, and it is not a violation of anything below. Its sibling sweep is delegated to the verifier agent precisely so this section keeps holding.

1. **Never read a whole source file into the main thread** while orchestrating. Ask an agent what you need to know; it reads, you get the answer.
2. **Never read a full brief, map, or agent REPORT into the main thread.** If a large artifact already exists and you need its gist, dispatch a `haiku` summarizer whose entire job is "read `<path>`, return the decision-relevant points in ≤10 lines". Implementation agents read the full file themselves, directly.
3. **Design every dispatch so its return is already short** — a path plus main points (operating-discipline §7 REPORT). A return that would be long is a file plus a pointer.
4. **Never read a subagent's raw transcript.** Extract its structured result, or summarize it with another cheap agent.
5. When you do need detail, grep for the heading and Read with offset/limit — a section, never the file.
6. If your context is filling with file contents instead of decisions, you have already broken the rule: stop, write what you know to the scratchpad, and dispatch.

## Step 0 — Intake before any dispatch

Direct-mode tasks skip this section entirely: a trivial edit gets a one-sentence goal, not an intake block, an arbiter doc, or a mapper.

1. Write the operating-discipline INTAKE block (goal + observable done-means, constraints VERBATIM, affected areas, knowns, unknowns split blocking vs deferrable, risks) into the arbiter or brief file — never only in your head.
2. **Verify premises.** Any claim the plan depends on — from the user, memory, or an earlier map — is checked against the current tree (a targeted grep, or a mapper agent) before builders are dispatched. A false premise found later invalidates work built on it: stop the affected agents, headline the finding to the user, re-plan.
3. **Blocking unknowns get mapper/research agents BEFORE any builder.** Criterion: if the unknown would change what a builder writes, it is blocking — map first, never build-then-discover.
4. Write the arbiter doc before build agents start: each decision, one-line why, and the rejected alternative (operating-discipline DECISION lines).

## Core Rules

1. **Delegate everything above the trivial bar.** Once a task is orchestrated, the orchestrator's own tool calls are: writing briefs/contracts, dispatching agents, targeted reads of summaries/sections, decisions, and user communication. If the orchestrator is reading source files or writing code during orchestrated work, it is doing an agent's job with the architect's context. The sole exception is Direct mode above — a trivial edit is made inline and its sweep delegated to one verifier — and a task that fails any of the five trivial tests never enters it.
2. **Exchange files, not pasted content.** Write task briefs, design contracts, and shared context to the session scratchpad; agent prompts stay short and POINT at those files ("Read X first"). One brief file serves many agents and survives interruptions. Never paste large file contents or prior agent output into a prompt when a path reference works.
3. **Subagents return only what the orchestrator needs to decide next** — the Return shape of the operating-discipline §8 brief — and write full detail (inventories, payload shapes, evidence) to scratchpad files that *later agents* read directly. Tell every mapper/researcher explicitly: "the reader of your report will NOT have the files — be exhaustive in the file, minimal in the return."
4. **Scratchpad is working memory.** Large outputs (codebase maps, specs, findings, fixture data) become named files: briefs (`*-brief.md`), maps (`map-*.md`), contracts (one ARBITER doc that wins all conflicts), reports (`*-REPORT.md`), staged fragments. Split oversized results into per-topic files so consumers read only their slice.
5. **Deviations from the arbiter are never silently absorbed.** Agents report them in their return's Surprises & deviations field; the orchestrator surfaces every one to the user in its next message with the reason. Mid-work choices the orchestrator can own: pick one, state why in one line, note the runner-up, proceed — never an options menu for decidable things, never deciding what the user explicitly owns.
6. **Read sections, not files.** Before reading anything large, locate what's needed: grep for headings/symbols, then Read with offset/limit. Read summaries and conclusions; skip detail sections until a decision requires them. Never re-read unchanged files; never read a subagent's raw transcript (extract its structured result instead).
7. **Fan out with disjoint ownership.** Partition parallel agents by directory/file ownership and state the boundary in every brief ("you own X; never touch Y — another agent owns it"). Shared invariants that span two agents become an explicit two-sided contract written into BOTH briefs (each side implements its half to the stated contract).
8. **Git discipline for fleets.** **NEVER create a git branch — all work and every commit go directly on `main`; branch ONLY if the user explicitly asks for one in that same message.** No agent, integrator, or worktree step creates or switches to a branch on its own. Agents stage ONLY their owned paths explicitly — `git add -A` is forbidden in shared trees; retry transient index.lock; either one committer per tree at a time, or workers leave changes uncommitted and a single **integrator** commits on `main`.
9. **Integrator pattern.** When many workers produce parts of one surface (components, sections, resources), workers do not wire or commit; one integrator reconciles collisions, wires registries/mounts/manifests, runs every gate (the enumerated battery defined in Verification fleets step 4) plus the STOP checklist below, fixes or drops broken parts (recorded), and commits. Workers' returns include a `notes_for_integrator` field.
10. **Shared hot files are never edited in parallel.** Locale dictionaries, registries, barrel files, lockfiles: parallel agents stage per-agent *fragment* files in the scratchpad; a dedicated merge step composes the real file once, with parity checks. Interim code carries safe defaults (e.g. defaultMessage) so the tree stays green before the merge.
11. **Recursive delegation — this skill applies to subagents too.** An agent that finds itself orchestrating (multiple independent sub-parts, unbounded reading, or a phase boundary inside its own work) delegates exactly as the main thread does: children return minimal, it integrates, it owns its boundary, and every brief passes the operating-discipline requirement and a model tier down. An agent already scoped to one bounded piece of work does that work itself rather than re-dispatching it — the always-delegate rule protects the MAIN thread's context; it is not a mandate for infinite nesting. Never nest more than one additional level without surfacing the reason to the orchestrator.
12. **Recovery over restart.** When an agent is interrupted or stalls waiting on dead children: resume it with a message that says re-orient first (git status/log, inspect the tree and scratchpad), do not redo committed work, do not wait for notifications — verify children's artifacts directly. Design every pipeline for this: each agent's output is durably checkpointed — files written, commits made, a line appended to a result journal — BEFORE the next stage depends on it, so committed work + scratchpad files ARE the checkpoint and any agent can die without losing progress. On interruption, RESUME the pipeline, never restart it: the completed prefix replays from its checkpoints; only the **tail agents** — the not-yet-finished stages at the end of the pipeline — run again. "Tail agent" names a pipeline POSITION, not a different kind of agent: tail agents are ordinary subagents that happen to be the ones still unfinished. Resume procedure:
    1. List the expected checkpoint artifacts of every completed stage and verify each actually exists on disk / in git — never trust a journal entry or a memory of completion without its artifact.
    2. Mark verified stages done and never re-run them.
    3. Re-dispatch only the unfinished tail, pointing its briefs at the verified checkpoint files.
13. **Every dispatch names a model tier, and the cheapest capable tier wins.** Fan-out width is not a licence to spend the top model on file reading, summarizing, or one-line edits — see "Model tier per dispatch" below. The tier is written into the brief, so a resumed or re-dispatched agent inherits it.

## Model tier per dispatch — cheap by default

Follow the Model tier table of operating-discipline §8 (single copy — do not restate it here). Fleet mapping:

- **`haiku`** — readers, summarizers, and mechanical hands: "read X and report the exported symbols", "summarize this REPORT into 5 lines", "list every call site of `foo` from this grep", "change this label / add this locale key / apply these plan.md lines". Also the tier for checkpoint checks ("does `map-api.md` exist and cover routes?").
- **`sonnet`** — one-surface workers with a spec already written: a single component, a single route mirroring a sibling, a stated find-and-replace across a directory.
- **`opus`** — builders and fixers implementing against the arbiter/contract. This is the default for the Build shape.
- **session default** — the orchestrator itself, design/spec synthesizers, finders and refuters, and the integrator/final-gate agent. Never cheapen the gate: a cheap gate that says "pass" costs more than it saves.

A fleet is usually mixed-tier. Fanning out ten `opus` agents where eight of them read files and summarize is the common waste; so is a `haiku` agent sent to "figure out how X works", which comes back confidently vague and has to be redone. When a cheap agent returns ambiguity, re-dispatch one tier up with the missing facts (operating-discipline §8 rule 2) rather than re-prompting it.

## Brief template — every dispatch instantiates this into a scratchpad file

Instantiate the BRIEF template of operating-discipline §8 verbatim (goal + done-means, constraints VERBATIM, ownership boundary — including paths the USER owns, not only other agents — contracts/arbiter path, discipline line, model tier, required return shape). Do not restate or improvise the template; that section is the single copy. Fleet addition: when an integrator exists, the return also carries `notes_for_integrator`.

The agent's prompt points at the brief file; it does not restate it.

## Verification fleets — numbered procedure

This procedure is the orchestrated form of operating-discipline §6's critique pass — distinct critic lenses, concrete failure scenarios required, fix then re-check.

1. **Find:** parallel finder agents with distinct lenses (security/tenancy, data & money, correctness, compatibility, UX), each finding delivered in the operating-discipline FINDING shape: claim / evidence file:line / failure scenario / severity tier / proposed fix.
2. **Refute:** each finding goes to an independent refuter; default-refute unless the concrete failure scenario holds against the real code. Refuters return exactly: `verdict: CONFIRMED | REFUTED / counter-evidence: <file:line> / basis: <what I read or executed>`. A refutation without file:line counter-evidence is itself discarded and the finding stands as PLAUSIBLE for the fix step — a hunch cannot kill an evidenced finding. No inputs/state → wrong-outcome scenario in the original finding means it is a hunch — discard.
3. **Fix:** confirmed findings clustered by file ownership into fix agents that verify-before-fixing and may skip with written reasons.
4. **Gate:** ONE final gate agent runs the full battery on the combined tree and returns pass / fail / not-run per item. The battery = the project CLAUDE.md definition of done PLUS the union of every brief's verify items; the gate brief enumerates them item-by-item — an unenumerated "run the battery" is not a gate, because the gate agent cannot report not-run items it never knew existed.

## Integrator / final-gate STOP checklist

Run before accepting any fleet's output; on a hit, stop and act:

1. A return says "should work" / "likely fixed" without an executed check → send that agent back to execute it.
2. `git status` shows files outside every brief's ownership boundary → identify the author agent; revert or justify each file before integrating.
3. A finding lacks a concrete failure scenario → discard as a hunch.
4. A return is missing its Not run or Surprises & deviations fields → treat all its checks as not run until the agent restates them.

## The Standard Shapes

- **Map:** parallel readers (`haiku` when the areas and questions are named; `sonnet` when the reader has to find its own way in) over subsystems → structured maps to scratchpad → orchestrator reads summaries/conventions/gotchas only; detail sections stay on disk for builders.
- **Design:** competing proposals from distinct lenses → adversarial judges score → one synthesizer writes the final spec file; orchestrator reconciles it against the arbiter contract (arbiter wins, deltas surfaced to the user).
- **Build:** briefs reference contracts by path → phase leads with disjoint ownership (may sub-delegate) → verify-as-you-go → logical commits per phase.
- **Fleet + integrator:** N workers on partitioned units, no commits → integrator wires, gates, commits.
- **Review:** the four-step verification fleet above.
- **Merge phase:** staged fragments → one merger with parity/quality checks → tooling updated to recognize any new reference patterns so checkers stay accurate.

## Orchestrator's report to the user

Use the operating-discipline REPORT shape: **Outcome first** / Key facts / Surprises & deviations from the arbiter (never buried) / **Not run:** every gate or battery item that did not execute — never state or imply a check passed that did not run / Paths. Skipped gates are listed, not implied green.

## Anti-Patterns — STOP and re-check if you catch yourself

- Orchestrator reading source files during orchestrated work: that is a `haiku` agent's job, and the answer comes back as a few lines (the direct-mode edit target is the one exception)
- **Ceremony on a trivial task** — spawning agents, writing a brief or intake block, or mapping the codebase to change one label, one constant, or one page action: make the edit, then send one verifier
- **Direct mode with no verifier** — editing inline and calling it done without the sibling sweep and the narrow check; or doing that sweep by hand in the main thread, file after file
- Stretching direct mode past the five trivial tests — a feature, a migration, a permission change, or anything needing discovery is delegated no matter how small the diff looks
- Reading a full brief, map, or agent REPORT into the main thread instead of dispatching a summarizer
- Pasting file contents or a previous agent's full report into a new agent's prompt instead of a path
- A subagent returning a transcript-sized dump to the orchestrator instead of writing a file and returning the pointer + summary
- Reading a subagent's raw transcript/output file into the orchestrator's context
- Two agents editing the same file concurrently; any fleet member running `git add -A` or creating a git branch (all commits land on `main`)
- Dispatching a builder while a blocking unknown is still open
- Spawning a FLEET for a single lookup (one cheap agent is the right size), or an agent for a one-line edit you could have made while writing its brief — or conversely, hand-implementing a feature in the main thread
- Dispatching the top-tier model to read a file, summarize a report, rename a constant, or change a label — that is `haiku` work with an exact-paths brief
- Cheapening a gate, refuter, or security lens to save tokens; or sending a `haiku` agent on open-ended "figure out how X works" discovery
- Re-running a whole fleet after an interruption instead of checking what already landed on disk/in commits
- Verification theater: findings with no concrete failure scenario, or fixers that "fix" without first confirming against the real code

## Final Rule

Match the machinery to the job. Trivial work: make the edit, send one verifier, report in three lines. Everything else: the orchestrator holds the plan, the contracts, and the decisions, and everything else lives in files and subagents — if your context is filling with file contents instead of conclusions, you have stopped orchestrating, so write it to the scratchpad, brief an agent, and read back only what you need to decide.
