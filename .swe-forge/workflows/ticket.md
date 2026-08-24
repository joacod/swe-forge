# General Ticket Workflow

This is the operational workflow for a general software ticket. Read it only
after the user explicitly invokes SWE Forge.

## Inputs

The workflow accepts:

- the original ticket or problem description
- explicit user constraints
- repository instructions and available tooling
- optional harness, model, execution-provider, or isolation preferences

The original ticket remains authoritative. Do not silently replace it with a
worker's interpretation.

## Artifact Rule

Use the smallest amount of persistent state that preserves correctness.

For `SOLO`, planning and results may remain in the active context unless the
ticket benefits from a written artifact. For delegated work, create bounded
task packages using `.swe-forge/contracts/task.md` and consume structured
results using `.swe-forge/contracts/result.md`. For independent review, use
`.swe-forge/contracts/review.md`.

Keep temporary run state outside the repository or under an ignored
`.swe-forge/runs/` directory. Do not commit transcripts, generated logs,
credentials, or ticket-specific state.

Before writing repository-local state, verify the exact path is ignored, for
example with `git check-ignore`. If it is not ignored, use a permission-
restricted external temporary directory or stop for explicit setup; do not
silently modify the repository's ignore rules. Clean external state at run
completion and report any cleanup failure.

## Procedure

### 1. Ingest

Read the ticket without designing the solution immediately. Preserve the raw
invocation arguments as the immutable ticket input, including reserved command
tokens before parsing. Record the parsed remainder separately; the remainder
must not replace the original input.

For harness commands, parse the raw arguments before ingesting the ticket:

- inspect the first token: if it is lowercase `solo`, `subagents`, or
  `isolated`, record `requested_mode` and remove it as the explicit topology
- inspect the first remaining token (or the original first token): if it is
  lowercase `guided` or `pr`, record `requested_delivery` and remove it as the
  delivery token; this supports either `solo pr <ticket>`, `isolated pr
  <ticket>`, or `pr isolated <ticket>`
- if a delivery token was consumed before a topology token, inspect the next
  token for lowercase `solo`, `subagents`, or `isolated` and record it as the
  explicit topology
- if the first token is lowercase `herdr`, do not record a Herdr topology and
  do not silently treat it as a ticket. Return clear migration guidance:
  "The `herdr` topology token was removed. Use `isolated` and request Herdr as
  an execution-provider preference if it is wanted." Ask the user to resubmit
  the corrected invocation, while preserving the original raw arguments in run
  state.
- record a separate `requested_provider` when the user explicitly asks for
  `NATIVE`, `HERDR`, or `NONE` as an execution-provider preference. Provider
  preference is a natural-language decision (for example, "use Herdr as the
  provider for isolated execution") rather than a topology token; a harness
  may expose a separate provider-preference field only when it documents that
  syntax. Provider preference never changes `requested_mode` and the word
  `herdr` is not a topology alias
- if no delivery token is consumed, record `requested_delivery: DEFAULT` and
  resolve `delivery_mode: GUIDED`
- if no topology token is consumed, record `requested_mode: AUTO`
- preserve the non-empty remainder as the parsed ticket while retaining the
  complete raw invocation as the original ticket reference
- preserve any user-supplied specialist-skill names, paths, or URLs as ticket
  input; do not treat them as permission to install or execute external code
- a topology or delivery token without a ticket is incomplete input; ask for the
  missing ticket
- if the first token is not one of the reserved lowercase tokens, preserve it
  as ticket text and record `requested_mode: AUTO`

The lowercase topology words remain reserved only in the canonical topology
position. The delivery shorthand is intentionally explicit: `pr` selects the
low-touch pull-request path, while `guided` makes the default visible. Natural
language activation without a command may state a mode or provider preference
directly. The supported explicit isolated forms are:

```text
/swe-forge isolated <ticket>
/swe-forge isolated pr <ticket>
/swe-forge pr isolated <ticket>
```

A natural-language request such as "use Herdr as the provider for this
isolated run" records `requested_provider: HERDR` without changing the
reserved topology grammar. Never advertise a removed provider name as an
execution mode. Migration
handling must point users to `isolated` and a separate Herdr provider
preference.

Record the requested behavior, explicit constraints, affected users or systems,
non-goals, and any requested validation. Preserve important wording from the
original ticket. Record whether the user wants review checkpoints or low-touch
PR delivery; do not treat a delivery preference as permission to merge. Preserve
context-management concerns as ticket constraints rather than assuming that a
model or harness will compact at the desired time.

### 2. Discover

Before broad discovery, load and follow `policies/execution-routing.md` for
its lightweight discovery-shape assessment. This early load does not select a
topology or load provider/isolated machinery. Record
`discovery_strategy.mode` as
`ROOT_ONLY` unless there are clearly independent, read-only questions whose
answers can return concise evidence and materially reduce root-context growth.
This is an early research strategy, not the final topology decision: do not
route delivery, create isolated work, or duplicate the full routing phase here.

For `DELEGATED_RESEARCH`, load `policies/delegation.md`, the bounded researcher
role, the task/result contracts, and model-routing before assigning a worker.
Give each worker one bounded question, a small allowed read scope, an evidence
budget, and a structured result contract. Workers do not write, make delivery
or topology decisions, pass along the full ticket/history, recurse, or
orchestrate other workers. Use the existing shared-write `SUBAGENTS` semantics
only when a read-only backend is proven; otherwise record the safe fallback to
root-only discovery. When multiple genuinely independent questions survive the
assessment, launch the useful ready questions together as one small bounded
fan-out/fan-in batch, before consuming any result. Wait at one root fan-in
barrier, consume the structured results together, and resolve contradictions in
the root before continuing. Do not ask for follow-up research unless a result
is `BLOCKED` because a required fact is missing; workers stop once their
acceptance evidence is sufficient. Coupled questions stay root-only or
sequential when a real dependency requires it, and no writable work is created
for this phase.

The full evidence-backed topology decision remains in step 6 after
specification, architecture, and useful decomposition. Early research must not
become a second router.

Inspect the repository before making architectural claims. Locate relevant entry
points, dependencies, analogous implementations, conventions, documentation,
tests, and quality gates. If the ticket names an optional specialist skill, or
an already available skill has a clearly declared match, read
`.swe-forge/policies/specialist-skills.md` and evaluate it on demand; otherwise
do not search or load unrelated skills.

Use parallel read-only research only when it reduces time or context load. All
research must return evidence with file, symbol, command, or documentation
references.

Check available harness and provider capabilities without claiming them from
installation alone. In particular, an installed provider is not evidence that
it can safely create isolated writable worktrees, collect structured results,
or preserve central integration. For a context-risk ticket, inspect whether
the active host exposes usage telemetry, a known context window, proactive
compaction, overflow classification/retry, and a persistent session. Record
unknown capabilities explicitly; there is no universal cross-harness context
API.

### 3. Specify

Before specification or clarification behavior is needed, load and follow
`.swe-forge/policies/specification.md`. In `PR`, also load
`.swe-forge/contracts/working-spec.md` before building the transient working
spec.

Translate the ticket into observable acceptance criteria and separate facts,
assumptions, compatibility constraints, and blocking decisions. The loaded
specification policy owns repository fact gathering and clarification; in `PR`,
the working-spec contract owns the transient shape. In `PR`, make that spec ready
before writable work without creating a repository artifact. Record its review
focus, non-goals, specialist-skill decision, and context strategy when
applicable. Ask only blocking user questions and record low-risk assumptions.

### 4. Architect

Choose the smallest compatible implementation approach. Identify impacted
components, interfaces, data flow, migration or compatibility concerns, and
risks.

Do not edit code during architecture analysis. Do not introduce an abstraction
unless the ticket and repository evidence justify it. If isolated execution is
being considered, identify the shared foundation, stable interfaces, task
ownership, shared-artifact owners, environment resources, and integration order
before creating workers.

### 5. Decompose

When delegation or an independent review is useful, first load
`.swe-forge/policies/delegation.md`, the relevant task/result/review contracts,
and the relevant role files. Load `.swe-forge/policies/model-routing.md` before
assigning a model capability class.

Create bounded tasks only where the loaded delegation policy and contracts
provide useful independence. Keep each task's ownership and validation
explicit; isolated task fields come from the loaded contracts and workflow.

For `GUIDED`, divide broad work into cohesive review slices. For `PR`, record
an ordered commit plan in the working spec even in `SOLO`; keep steps cohesive
and independently reviewable without ceremonial boundaries.

Parallelize only when dependencies are satisfied and ownership is
non-overlapping. Otherwise use sequential waves or `SOLO`; unsettled shared
architecture, contracts, schemas, lockfiles, or generated artifacts require
foundation work first.

Before launching any worker, render the compact `worker_briefing` projection
from the canonical task contract and current run-state facts using
`.swe-forge/contracts/worker-brief.md`. If a task has completed dependencies,
first accept each dependency's structured result and derive only the
B-relevant `dependency_digest` entries for `dependencies.completed`; do not
forward the dependency's complete result. Pass only that projection, the
applicable canonical role, relevant repository-instruction references, and the
result/review contract. Do not forward the root transcript, unrelated ticket
history, the full SWE Forge specification, or pasted repository contents. A
digest is transient launch context and does not expand the worker contract or
create a peer communication channel.

### 6. Route

Before making the final automatic or explicit topology decision, load and
follow `.swe-forge/policies/execution-routing.md`. If `ISOLATED` is selected,
load `.swe-forge/policies/provider-selection.md` and prove its capabilities
before worker execution; then load
`.swe-forge/workflows/isolated-execution.md` after the foundation and provider
decision. Before worker execution, also load
`.swe-forge/contracts/task.md`, `.swe-forge/contracts/result.md`,
`.swe-forge/contracts/result-bundle.md`, `.swe-forge/contracts/run-state.md`,
the selected provider runbook under `.swe-forge/providers/`, and
`.swe-forge/tools/swe-forge-isolated-gate`. Do not load isolated-provider
machinery for a non-isolated run.

Record the routing fields and reasons defined by the loaded execution-routing
policy, including nested `routing.preferred` and `routing.current`,
`delegation_backend`, `write_isolation`, `context_value`, runtime capability
profile, and any revision history. Choose the smallest safe topology; explicit
requests do not bypass hard eligibility, provider capability, validation, scope,
or delivery authorization. A large prompt is not delegation evidence. For
non-isolated execution, record `execution_provider: NONE`,
`parallel_strategy: NONE`, and `integration_strategy: NONE`; a read-only
`SUBAGENTS` run may still use `delegation_backend: NATIVE` or `HERDR`. When
`ISOLATED` is selected, follow the loaded provider-selection policy and
isolated workflow before creating workers or resources.

When an optional native `SUBAGENTS` backend is being used, the selected
adapter or provider carries the rendered `worker_briefing/v1` projection, not
the complete root task/run state. A capability probe may occur before a
run-state snapshot exists, but that probe only discovers the backend and does
not select a topology. Before any worker launch, load
`.swe-forge/contracts/run-state.md` and use `swe-forge-state init` with the
semantic routing/provider inputs and actual matching checkout facts. Supply the
bounded continuation values through `swe-forge-state set-continuation`, so the
helper owns schema structure, `updated_at`, validation, and the delivery
projection. The resulting discoverable state must have `workflow: swe-forge`, a
non-terminal status, matching `invocation_checkout.path`/`delivery_checkout.path`,
`continuation.workflow_active: true`, and `routing.current: SUBAGENTS`. Then
repeat backend capability negotiation so it is bound to the new run. A worker
briefing or prompt is not a substitute for canonical persisted routing state;
if the state is missing, stale, or unmatchable, preserve the SOLO/sequential
fallback rather than delegating.

### 7. Test Strategy

Before selecting or executing the validation strategy, load and follow
`.swe-forge/policies/verification.md`. When executable gate evidence, candidate
fingerprints, freshness, or receipts are used, load
`.swe-forge/policies/evidence.md` before planning or collecting that evidence.

Before implementation, record the testing decision required by
`policies/verification.md` in the transient working spec or run state. Keep it
behavior-first: identify the observable behavior, seam, existing coverage,
smallest useful approach, development mode, rationale, and residual risk. The
verification policy owns regression, characterization, test-first, manual, and
not-applicable guidance; do not reproduce that decision tree here.

Register expected checks before running them. Classify each check as required,
conditional with an observable condition, or informational. For executable
validation, candidate fingerprints, freshness, checkpoints, or receipts, use
`policies/evidence.md` and keep its ledger outside the repository. Load task and
result contracts for delegated work; load the isolated workflow only when
routing selects `ISOLATED`.

### Context continuity gate

For a long-running or context-risk ticket, or when the host reports a
near-limit or overflow condition, load and follow
`.swe-forge/policies/context.md` before continuing. Record the host capability
signal, durable-state reference, recovery status, safe boundary, expected next
action headroom, and Git/evidence recheck in the transient state. The
run-state `continuation` block is authoritative after compaction; do not rely
on a generated conversation summary to recover PR phase or user shorthand.
At `agent_settled` or an equivalent host boundary, update continuation through
`swe-forge-state set-continuation` before requesting proactive compaction and
re-read it after `session_compact` or host recovery. Ordinary tickets do not
load this lazy policy and report
`not-observed` when no context limit is reached.

### 8. Implement

Before the first writable checkout/setup operation, first edit, or any
commit/push/PR-related decision, load and follow
`.swe-forge/policies/delivery.md`. It is the sole detailed owner of local
resource authorization, checkout and branch ownership, commits, pushes, pull
requests, synchronization, integration, and cleanup. Its repository-aware
convention resolution runs only at the branch, commit, or PR artifact boundary
that needs it; PR template retrieval occurs immediately before composition.

Implement only the bounded dependency waves selected by the architecture and
working spec. In `PR`, validate and commit each planned step before beginning
the next; at each step boundary call `swe-forge-state set-continuation` with the
semantic continuation values and deliberately reconsider context
value/topology without constant churn. In `GUIDED`, stop at the declared
checkpoint. Keep task ownership, scope, and delivery authorization explicit
and stop on a blocking gate.

Keep concurrent writable work out of one checkout. If routing selects
`ISOLATED`, follow the loaded isolated workflow and provider contracts; otherwise
use one selected writable checkout.

Before writing, apply the loaded delivery policy to classify the checkout,
record the pre-edit baseline, and use the one permitted task or integration
branch. Preserve dirty, detached, protected, or ambiguous state instead of
resetting, stashing, cleaning, or overwriting it.

Delegated workers receive only the rendered worker briefing and the
applicable canonical role/result contract. When a dependency completes, record
its accepted result reference in the root-owned run-state task graph and derive
future digests at the next launch; do not persist a per-ticket handoff file.
Workers return the loaded structured result contract and cannot claim success
from code inspection alone. A digest never changes their allowed scope or
permissions. The isolated guard remains the executable eligibility check for
isolated results.

### 9. Integrate

For delegated work, load and follow the relevant task/result contracts before
accepting or transferring a worker result. Consume the profile selected by
`contracts/result.md`: read-only research uses `READ_ONLY` evidence without
invented Git or delivery sections, normal shared-checkout writing uses
`WRITABLE` Git/change/validation evidence, isolated writing uses the complete
`result-bundle.md` and isolated gate, and review uses `contracts/review.md`.
For `ISOLATED`, also load and follow the isolated workflow. Integrate only after
scope, base, cleanliness, validation, and evidence requirements pass.

The orchestrator owns integration and accepts only results that satisfy the
loaded contracts and evidence policy. Do not treat empty irrelevant sections as
missing evidence or fill them from memory. Preserve the `GUIDED` checkpoint
boundary and use the isolated workflow for central transfer, validation,
ordering, and conflict handling when that topology is selected.

### 10. Verify

Run the relevant repository quality gates after integration by following the
loaded verification and evidence policies. In `PR`, all applicable slice and
final checks must pass before the authorized commit, push, and PR actions. In
`GUIDED`, a checkpoint may report a passing slice while final acceptance remains
pending. Report every check as passed, failed, skipped, unavailable, or
not-applicable with its evidence; do not substitute provider status or code
inspection for validation. If `ISOLATED` is selected, the isolated workflow
adds its worker, integrated-state, wave, and central-build checks.

### 11. Review

When the review trigger applies, load
`.swe-forge/agents/reviewer.md` and `.swe-forge/contracts/review.md` before
review. The reviewer owns review behavior; the contract owns the result shape and
blocking matrix.

Use a fresh context for independent review when delegation, multi-component
scope, or medium-or-higher risk makes it useful.
Provide the original ticket, `review_focus`, acceptance criteria, architecture
decisions, final diff, and validation evidence. The loaded reviewer role and
review contract define review behavior, relevant findings, and blocking status.

### 12. Repair

Before a `BLOCKED` or `FAILED` recovery path, load and follow
`.swe-forge/policies/failure-recovery.md`. It owns the recovery ladder, retry
ceilings, failure classification, and conservative cleanup.

Repair only relevant findings within the original scope and rerun affected
validation. Use the loaded failure-recovery policy for retry ceilings,
debugger escalation, unresolved findings, and isolated-resource preservation.

### 13. Final Acceptance

The canonical Acceptance Gate lives in `SWE-FORGE.md`; verification, evidence,
review, delivery, and recovery policies contribute evidence to that gate and
do not define a competing final gate.

Compare the final integrated diff with the original ticket, acceptance
criteria, review focus, and explicit constraints, then apply the canonical gate
in `SWE-FORGE.md`. Do not substitute worker summaries, provider lifecycle
status, or passing partial checks for final integrated evidence.

### 14. Report

Use the canonical final-report requirements in `SWE-FORGE.md`, including current
validation, review, delivery, receipt, context, and cleanup evidence. Keep the
report separate from private receipt evidence and project-facing PR content;
never include worker transcripts.

## Blocking and Recovery

When a worker or phase is `BLOCKED` or `FAILED`, use the recovery behavior
defined in `.swe-forge/policies/failure-recovery.md`; see Procedure → Repair.
