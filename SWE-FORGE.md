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
| `.swe-forge/contracts/` | task, result, review, receipt, working-spec, and run-state shapes |
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
- Treat validation and Git/evidence state as stronger than confidence or code
  inspection; make a risk-proportional testing decision for every ticket.
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
orthogonal. `GUIDED` stops at declared checkpoints. `PR` is the normal low-touch
path: after local gates, it may push one branch and create one PR.
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
evidence/checkpoints       -> policies/evidence.md
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
is temporary or ignored, schema-v4 only, and authoritative for continuation;
obsolete state is rejected rather than migrated. Use the canonical state helper
for schema construction and updates.

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
- PR delivery has the required checkpoint/commit evidence, current final
  validation, one push, and one PR; and
- any receipt is generated from that evidence and reports the same status.

Final acceptance consumes current evidence; it does not rerun unchanged work or
authorize another review. Do not claim a check passed when it was not run.
Use `BLOCKED` when safe continuation needs a decision, authorization, access, or
environment change. Use `FAILED` when attempted work remains incorrect or the
gate cannot be met within recovery limits.

After PR creation, local receipt and reporting complete the synchronous run.
Remote GitHub CI is external after PR creation and is not awaited or polled.

## Final report

Begin with a short plain human `Work summary`, then report:

- final status and preferred/effective topology and delivery mode;
- approach, changed files, assumptions, risks, and continuity/recovery facts;
- testing decision, exact validation results, review/repair result, and any
  skipped or unavailable checks; and
- delivery, PR/receipt, cleanup, and remaining temporary-state status.

Keep worker transcripts, private receipts, and workflow metadata out of
project-facing PR content.
