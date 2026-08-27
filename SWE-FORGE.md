# SWE Forge Specification

SWE Forge is an explicitly invoked, harness-agnostic workflow for AI coding
harnesses. It takes one coding ticket to one cohesive reviewable PR or guided
delivery outcome and owns one writable delivery checkout. Native workers may assist with bounded
work; worker fleets, external orchestration, and concurrent mutation of the
canonical candidate are outside its scope.

The active harness owns model, provider, runtime, context preservation, and
host scheduling. Adapters expose demonstrated capabilities without redefining
this workflow. Capability or projection coverage is not live harness
validation, and feature parity is not required.

## Activation

Do not activate because a task is difficult, this file exists, or a harness can
create workers. Activation requires an explicit user request, such as:

- `Use SWE Forge` or `Follow SWE Forge`;
- an explicit reference to `SWE-FORGE.md`; or
- a supported `/swe-forge` command (or the harness equivalent).

Without an explicit request, use the harness normally and do not load Forge
roles or workflow instructions. On activation:

1. preserve the raw invocation as the ticket input;
2. read this file and `.swe-forge/workflows/ticket.md`;
3. load only the role, contract, and policy sources required by the ticket.

## Canonical ownership

| Source | Owns |
| --- | --- |
| `SWE-FORGE.md` | activation, lifecycle, Acceptance Gate, and final report |
| `.swe-forge/workflows/` | procedure and load order |
| `.swe-forge/agents/` | role responsibilities |
| `.swe-forge/contracts/` | task, result, review, working-spec, and run-state shapes |
| `.swe-forge/policies/` | specification, routing, delegation, verification, evidence, delivery, recovery, and optional skills |
| `.swe-forge/adapters/` | host syntax, capability observation, and projections |

Owners are normative. Other files link to an owner instead of paraphrasing its
rules. No adapter, command, skill, or vendor-specific instruction is
canonical.

## Invariants

- Keep the ticket's intent, scope, and constraints authoritative.
- Make the early semantic `scope_decision: PROCEED | TOO_BROAD` before broad
  discovery; its rules live in `policies/specification.md`.
- Prefer the smallest topology that provides real coordination or reliability
  value. Prompt length, difficulty, and file count are not routing evidence.
- Keep the root responsible for task ownership, integration, verification,
  review, acceptance, and delivery.
- Use hub-and-spoke delegation with bounded tasks and structured results; never
  open peer channels or pass transcripts as state.
- Keep read-only research separate from writes.
- Writable delegated results are materialized into the canonical delivery
  candidate and validated there before acceptance or dependent work. Never
  mutate that candidate concurrently.
- Treat validation and Git state as stronger than confidence or code inspection;
  make a risk-proportional testing decision for every ticket.
- Inspect commands before execution and separately authorize migrations,
  deployment, publication, production access, and other shared effects.
- Keep specialist skills optional and load them on demand.
- Preserve human checkpoints in `GUIDED`; keep delivery actions separately
  authorized.

## Scope, topology, and delivery

After lightweight root-owned discovery, apply the one semantic scope decision
from `policies/specification.md`. `TOO_BROAD` explains the independent chunks
and stops before specification, decomposition, routing, validation,
implementation, review, and delivery. `PROCEED` continues normally.

The public invocation expresses delivery intent; topology is selected by SWE
Forge after ticket and repository inspection. PR delivery and automatic
routing are the defaults:

```text
/swe-forge <ticket>             # PR + automatic topology
/swe-forge guided <ticket>      # GUIDED + automatic topology
```

`guided` is the only public modifier. `SOLO` and `SUBAGENTS` are internal
routing outcomes, not invocation arguments.

`SOLO` keeps the work in one root flow. `SUBAGENTS` uses demonstrated native
workers only for bounded, independently evaluable work; unavailable capability
falls back to root-owned sequential work. Topology and delivery mode are
orthogonal. `GUIDED` stops at declared human checkpoints. `PR` is the normal
low-touch path: after local gates, it may push one branch and create one PR.
In PR mode, no commit sequence is predeclared. Neither mode merges
automatically. PR uses one independent review when the review trigger applies.
`GUIDED` may finish with a reviewed local diff when delivery actions are not
authorized.

## Lifecycle

The ticket procedure is the executable source for this sequence:

1. parse the invocation once and retain the raw ticket and delivery intent;
2. discover lightly, make the scope decision, then assess discovery shape;
3. define observable acceptance and, for PR, a transient working spec;
4. choose the compatible approach, risks, and ownership;
5. select topology and any bounded delegation;
6. choose proportional testing and validation;
7. load delivery policy before setup or any write, then implement and integrate;
8. validate the current candidate and record evidence;
9. perform one fresh review when the trigger applies;
10. repair at most one concrete, localized, clearly repairable finding;
11. apply the Acceptance Gate and perform only authorized delivery; and
12. report and clean up conservatively.

Stage-specific sources are loaded only when their phase or risk requires them.
The workflow does not create ceremony for a trivial ticket.

## Load map

```text
activation/lifecycle       -> SWE-FORGE.md
procedure                  -> .swe-forge/workflows/ticket.md
scope/specification        -> policies/specification.md
routing/capability         -> policies/execution-routing.md
delegation                 -> policies/delegation.md
verification               -> policies/verification.md
evidence/validation       -> policies/evidence.md
delivery/authorization     -> policies/delivery.md
failure/recovery           -> policies/failure-recovery.md
specialist skills          -> policies/specialist-skills.md
roles                      -> agents/*
data shapes                -> contracts/*
harness integration        -> adapters/*
```

## State and safety

Use the contracts when delegation or a context discontinuity makes state
necessary. The transient working spec is not a repository artifact. Run state
is temporary or ignored, schema-v5 only, and authoritative for continuation;
obsolete or unknown state is rejected rather than migrated. It contains only
the run fence, route, canonical checkout, compact continuation, candidate-bound
validation/review facts, and PR delivery reference needed for recovery. Use the
canonical state helper for schema construction and updates.

Before any writable setup or edit, load `policies/delivery.md`. A normal run
has one delivery branch and one writable delivery checkout. Dirty, detached,
protected, or ambiguous state is preserved and reported, never reset, cleaned,
stashed, overwritten, or delivered.
A host may use a private physical execution environment; it is not Forge state.

SWE Forge does not manage the harness context window. After recovery or a host
context discontinuity, re-read authoritative state and reconcile it with actual
Git and evidence before continuing. Load failure recovery only when its trigger
occurs.

## Acceptance Gate

Declare `ACCEPTED` only when all applicable conditions hold:

- the original acceptance criteria, constraints, and intended scope are
  accounted for;
- the testing decision is recorded and changed behavior has automated or
  focused manual/reproduction evidence, or an evidence-backed
  not-applicable rationale;
- every relevant required check passes for the current candidate, with skipped
  and unavailable checks reported honestly;
- the final integrated diff has been inspected and contains no unintended
  changes;
- when review is required, evidence is one fresh `PASS` for the exact candidate,
  or one recorded focused repair with affected validation;
- A repaired candidate is explicitly not independently re-reviewed; a
  fundamental or uncertain finding blocks;
- PR delivery has a clean committed final candidate, current final validation,
  one push, and one PR; and
- the final harness report truthfully names the delivered candidate and results.

Final acceptance consumes current evidence; it does not rerun unchanged work or
authorize another review. Do not claim a check passed when it was not run.
Use `BLOCKED` when safe continuation needs a decision, authorization, access, or
environment change. Use `FAILED` when attempted work remains incorrect or the
gate cannot be met within recovery limits.

After PR creation, URL recording and the final harness report complete the
synchronous run. Remote GitHub CI is external after PR creation and is not
awaited or polled.

## Final report

The normal final harness result is a concise, user-facing summary. Put the
outcome first and use this shape for a successful PR:

```text
Status: ACCEPTED
PR: <url>
Confidence: HIGH

Validation:
- <meaningful check>: passed

Review:
- PASS

Remaining risk:
- none
```

The report must:

- preserve the deterministic status (`ACCEPTED`, `BLOCKED`, or `FAILED`);
- include a PR URL only after the PR has been created and recorded;
- list the meaningful validation performed against the delivered candidate,
  mentioning skipped or unavailable checks only when they affect the result;
- state the independent review result and any localized repair, including that
  a repaired candidate was not independently re-reviewed; and
- name only meaningful residual risk, or `- none`.

After one allowed localized repair, make the lower confidence and review
boundary explicit:

```text
Status: ACCEPTED
PR: <url>
Confidence: MEDIUM

Validation:
- affected checks passed

Review:
- one localized issue found and repaired
- repaired candidate was not independently re-reviewed

Remaining risk:
- <meaningful residual risk>
```

For a blocked run, keep the result short and explicit:

```text
Status: BLOCKED
Confidence: BLOCKED
No PR created.

Reason:
- <decision, authorization, access, environment, or evidence blocker>
```

A `FAILED` result uses the same concise status-and-reason shape and must not
imply that a PR was delivered. For `GUIDED`, omit the PR line or state that a
PR is not applicable.

### Confidence

`Confidence` is a human-readable summary of the existing evidence, chosen
after the deterministic status. It is not an acceptance criterion, a second
gate, or persisted run state. Derive it from current-candidate validation,
independent review, repair status, bounded uncertainty, and meaningful
residual risk. Do not use percentages, formulas, a confidence ledger, or an
additional reviewer.

Use the smallest useful vocabulary:

- `HIGH`: the accepted candidate's required and applicable validation passed,
  independent review returned `PASS`, and no repair or material unresolved
  uncertainty remains. This is not a guarantee of correctness; list ordinary
  residual risk when it matters.
- `MEDIUM`: the candidate is accepted with a bounded limitation, such as one
  localized repair whose affected checks passed but was not independently
  re-reviewed, a review that was not required, or limited but sufficient
  validation. State the limitation and remaining risk.
- `LOW`: the candidate is accepted only with notable bounded uncertainty or
  residual risk that remains useful for the user to know. Explain it plainly.
- `BLOCKED`: the run is blocked and no PR was created; this is a delivery state,
  not a quality estimate.

### Optional diagnostics

Do not make routine topology or workflow machinery part of the normal result.
Preferred/requested topology, routine fallback details, delivery mode,
continuity or recovery facts, receipts, cleanup state, internal evidence or
ledger bookkeeping, worker/task details, changed-file lists, implementation
approach, and assumptions remain available in internal state or host logs but
are omitted from the default report. Add a short diagnostic note only when one
of these facts is notable, materially affects interpretation, or the user asks
for it. Topology must never lead a successful result.

Keep worker transcripts and workflow metadata out of project-facing PR content.
