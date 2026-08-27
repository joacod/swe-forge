# SWE Forge Specification

SWE Forge is an explicit, harness-agnostic workflow for coding harnesses. One
run takes one focused ticket to one cohesive reviewable PR or guided outcome
and owns one writable delivery checkout.

The active harness owns the model, provider, runtime, context, and scheduling.
Adapters expose demonstrated capabilities and translate host mechanics; they do
not redefine Forge semantics. Projection coverage is not live harness
validation. Feature parity is not required.

## Activation

Do not activate because this file exists, a task is difficult, or a harness can
spawn workers. Activation requires an explicit user request:

- `Use SWE Forge` or `Follow SWE Forge`;
- a reference to `SWE-FORGE.md`; or
- `/swe-forge` or a supported harness equivalent.

On activation:

1. preserve the raw invocation as the ticket input;
2. read `.swe-forge/workflows/ticket.md`; and
3. load only the role, contract, and policy sources required by the ticket.

## Canonical ownership

| Source | Owns |
| --- | --- |
| `SWE-FORGE.md` | activation, invariants, Acceptance Gate, final report |
| `.swe-forge/workflows/` | procedure and load order |
| `.swe-forge/agents/` | role responsibilities |
| `.swe-forge/contracts/` | task, result, review, working-spec, and run-state shapes |
| `.swe-forge/policies/` | specification, routing, delegation, verification, evidence, delivery, recovery, and optional skills |
| `.swe-forge/adapters/` | host syntax, capability observation, and projections |

Owners are normative. Other files link to the owner instead of restating its
rules. No adapter, command, skill, or vendor instruction is canonical.

## Invariants

- The ticket, user decisions, scope, and constraints remain authoritative.
- After lightweight discovery, make one `scope_decision: PROCEED | TOO_BROAD`;
  its rules live in `policies/specification.md`.
- Choose the smallest topology with real coordination or reliability value.
  Prompt length, difficulty, and file count are not routing evidence.
- The root owns task ownership, integration, Git, validation, review, acceptance,
  delivery, and cleanup.
- Use hub-and-spoke delegation with bounded tasks and structured results. No
  peer channels, transcript state, or worker authority.
- Keep read-only research separate from writes. Materialize writable results in
  the canonical candidate and validate them before acceptance or dependent work.
  Never mutate that candidate concurrently.
- Treat validation and Git state as stronger than confidence or inspection.
  Choose risk-proportional evidence for every ticket.
- Inspect commands before execution. Separately authorize migrations,
  deployment, publication, production access, and other shared effects.
- Specialist skills are optional and loaded on demand.
- Preserve human checkpoints in `GUIDED`; authorize delivery actions separately.

## Routing and delivery

The public invocation expresses delivery intent. Topology is selected after
ticket and repository inspection:

```text
/swe-forge <ticket>             # PR + automatic topology
/swe-forge guided <ticket>      # GUIDED + automatic topology
```

`guided` is the only public modifier. `SOLO` and `SUBAGENTS` are internal
routing outcomes.

`SOLO` keeps work in the root. `SUBAGENTS` uses demonstrated native workers
only for bounded, independently evaluable work; missing capability falls back
to root-owned sequential work. Topology and delivery mode are independent.
`GUIDED` stops at declared human checkpoints and may finish with a reviewed
local diff when delivery is not authorized. `PR` is the default low-touch mode:
after local gates it may push one branch and create one PR. Neither mode merges
automatically. PR uses one independent review when its trigger applies.

## State and safety

Run state is temporary or ignored, schema-v5 only, and authoritative for
continuation. Reject obsolete or unknown state; never migrate it. It contains
only the run fence, route, canonical checkout, compact continuation,
candidate-bound validation/review facts, and PR delivery reference needed for
recovery.

Before the first write, load `policies/delivery.md`. A run owns one delivery
branch and one writable delivery checkout. Preserve dirty, detached, protected,
or ambiguous state; never reset, clean, stash, overwrite, or deliver against
it. A host-private worker environment is not Forge state. After a context
discontinuity, re-read state and reconcile it with actual Git and evidence.

## Procedure

`.swe-forge/workflows/ticket.md` owns ticket order and stage-triggered loading.
It covers intake, scope, specification, routing, implementation, validation,
review, recovery, acceptance, delivery, and reporting. Do not duplicate that
procedure here.

## Acceptance Gate

Declare `ACCEPTED` only when all applicable conditions hold:

- ticket acceptance, constraints, and intended scope are accounted for;
- the testing decision is recorded and changed behavior has automated, focused
  manual, or evidence-backed not-applicable support;
- every applicable required check passes for the current candidate; a skipped or
  unavailable required or applicable conditional check is reported honestly and
  blocks acceptance;
- the final integrated diff has no unintended changes;
- required review is one fresh `PASS` for the exact candidate, or one focused
  repair with affected validation; the repaired candidate is not independently
  re-reviewed;
- PR delivery has a clean committed candidate, current final validation, one
  push, and one PR; and
- the final report names the candidate and results truthfully.

Final acceptance consumes current evidence. It does not rerun unchanged work or
authorize another review. Use `BLOCKED` when continuation needs a decision,
authorization, access, or environment change. Use `FAILED` when attempted work
remains incorrect or recovery limits prevent the gate.

After PR creation, recording the URL and producing the report completes the
synchronous run. Remote CI is external evidence; do not await or poll it.

## Final report

Put the outcome first. Successful PR:

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

For a localized repair, use `Confidence: MEDIUM`, name the affected checks,
and state that the repaired candidate was not independently re-reviewed. For
`GUIDED`, omit the PR line or state that a PR is not applicable.

The report must preserve the deterministic status, include a PR URL only after
creation, name meaningful validation and material skipped/unavailable checks,
state review and repair boundaries, and list only meaningful residual risk.

`Confidence` is a human-readable summary, not a gate or run-state field. Use
no percentages or formulas:

- `HIGH`: required validation passed, fresh review passed, and no repair or
  material uncertainty remains;
- `MEDIUM`: accepted with limited validation, no required review, or one
  localized repair not independently re-reviewed;
- `LOW`: accepted with notable bounded uncertainty or residual risk; and
- `BLOCKED`: blocked with no PR, not a quality estimate.

Keep topology, harness/model metadata, continuity, task details, transcripts,
internal evidence, implementation details, and routine fallback facts out of
the normal report. Add a short diagnostic only when notable or requested.
