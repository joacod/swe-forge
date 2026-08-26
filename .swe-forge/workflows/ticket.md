# General Ticket Workflow

This is the operational workflow for a general software ticket. Read it only
after the user explicitly invokes SWE Forge.

## Inputs

The workflow accepts:

- the original ticket or problem description;
- explicit user constraints;
- repository instructions and available tooling; and
- optional harness or native subagent preferences.

The original ticket remains authoritative. Do not silently replace it with a
worker's interpretation.

## Artifact Rule

Use the smallest amount of persistent state that preserves correctness.

For `SOLO`, planning and results may remain in active context unless the ticket
benefits from a written artifact. For delegated work, create bounded task
packages using `.swe-forge/contracts/task.md` and consume structured results
using `.swe-forge/contracts/result.md`. For independent review, use
`.swe-forge/contracts/review.md`.

Keep temporary run state outside the repository or under an ignored
`.swe-forge/runs/` directory. Do not commit transcripts, generated logs,
credentials, or ticket-specific state.

Before writing repository-local state, verify the exact path is ignored, for
example with `git check-ignore`. If it is not ignored, use a restricted
external temporary directory or stop for explicit setup; do not silently modify
the repository's ignore rules.

## Procedure

### 1. Ingest

Read the ticket without designing the solution immediately. Preserve the raw
invocation arguments as the immutable ticket input, including reserved command
tokens before parsing. Record the parsed remainder separately; the remainder
must not replace the original input.

Before ingesting the ticket, use the canonical
`.swe-forge/tools/swe-forge-invocation` parser/bootstrap primitive exactly once.
A host runtime may supply its normalized result before the agent starts;
otherwise the bootstrap invokes the same executable with the complete raw
argument string as one value. Do not mentally parse, re-tokenize, substring
match, or normalize the command in workflow prose.

Consume the parser's machine-readable result as the invocation facts:
`raw_arguments`, `parsed_ticket`, `requested_mode`, `requested_delivery`,
`delivery_mode`, `input_status`, and `consumed_tokens`. `COMPLETE` is the only
status that proceeds as a ticket. `EMPTY` and `INCOMPLETE` require the missing
ticket. The parser does not choose automatic topology.

When initializing canonical run state, pass `requested_mode`,
`requested_delivery`, and `delivery_mode` from this normalized result unchanged
to `swe-forge-state init`. The state helper owns the schema-v4 shell and
serialization. Human-readable reserved forms remain documented in the
specification without duplicating parser rules here.

Preserve any user-supplied specialist-skill names, paths, or URLs as ticket
input; do not treat them as permission to install or execute external code.

Record requested behavior, explicit constraints, affected users or systems,
non-goals, and requested validation. Preserve important wording from the
original ticket. Record whether the user wants review checkpoints or low-touch
PR delivery; do not treat delivery preference as permission to merge.

### 2. Discover

Before broad discovery, load and follow `policies/execution-routing.md` for its
lightweight discovery-shape assessment. Keep `discovery_strategy` in the
transient working spec or active context, using `ROOT_ONLY` unless there are
clearly independent, read-only questions whose answers can return concise
evidence and materially reduce root coordination. This is an early research
strategy, not the final topology decision or durable routing state.


For `DELEGATED_RESEARCH`, load `policies/delegation.md`, the bounded researcher
role, and the task/result contracts before assigning a worker.
Give each worker one bounded question, a small allowed read scope, an evidence
budget, and a structured result contract. Workers do not write, make delivery
or topology decisions, pass along full ticket/history, recurse, or orchestrate
other workers. If no native capability is available, record the safe fallback
to root-only discovery. When multiple genuinely independent questions survive
the assessment, launch the useful ready questions together as one small bounded
fan-out/fan-in batch, wait at one root fan-in barrier, consume the structured
results together, and resolve contradictions in the root. Coupled questions
stay root-only or sequential.

The full evidence-backed topology decision remains in step 6 after
specification, architecture, and useful decomposition. Early research must not
become a second router.

Inspect the repository before making architectural claims. Locate relevant
entry points, dependencies, analogous implementations, conventions,
documentation, tests, and quality gates. If the ticket names an optional skill,
load `policies/specialist-skills.md` and evaluate it on demand; otherwise do
not search or load unrelated skills.

Use read-only research only when it reduces time or root coordination. All
research must return evidence with file, symbol, command, or documentation
references.


### 3. Specify

Before specification or clarification behavior is needed, load and follow
`policies/specification.md`. In `PR`, also load
`contracts/working-spec.md` before building the transient working spec.

Translate the ticket into observable acceptance criteria and separate facts,
assumptions, compatibility constraints, and blocking decisions. In `PR`, make
the working spec ready before writable work without creating a repository
artifact. Record its review focus, non-goals, testing decision, validation plan,
and assumptions. Ask only blocking user questions and record low-risk
assumptions. Host context preservation, compaction, retry, and restoration are
runtime concerns, not canonical Forge controls.



### 4. Architect

Choose the smallest compatible implementation approach. Identify impacted
components, interfaces, data flow, compatibility concerns, and risks. Do not
edit code during architecture analysis. Do not introduce an abstraction unless
the ticket and repository evidence justify it.

### 5. Decompose

When delegation or independent review is useful, first load
`policies/delegation.md`, the relevant task/result/review contracts, and the

Create bounded tasks only where the loaded delegation policy and contracts
provide useful independence. Keep each task's ownership and validation
explicit. For `GUIDED`, divide broad work into cohesive review slices. For
`PR`, record an ordered commit plan in the working spec even in `SOLO`.

Parallelize only read-only questions with non-overlapping ownership and
satisfied dependencies. Shared architecture, contracts, schemas, lockfiles,
or generated artifacts require root-owned foundation work first. Writable
delegation is sequential in the one delivery checkout.

Before launching a worker, write transient `worker-brief-input/v1` records from
the semantic task, current run-state facts, current routing facts, and any
root-selected dependency digest. Invoke `.swe-forge/tools/swe-forge-worker-brief
render`, validate the generated output with the same tool, and pass it unchanged
with the applicable role and result/review contract. Do not forward the root
transcript, unrelated ticket history, full specification, or pasted repository
contents.

### 6. Route

Before making the final automatic or explicit topology decision, load and
follow `policies/execution-routing.md`. Choose the smallest safe topology,
recording `routing.preferred`, `routing.current`, the concise reason, and any
fallback evidence. Explicit selections do not bypass safety, validation, scope,
or delivery authorization.

When an optional native `SUBAGENTS` capability is used, the adapter carries the
validated `worker_briefing/v1` projection, not complete root task or run state.
Before launch, persist matching active schema-v4 state with
`routing.current: SUBAGENTS`, then validate the state and renegotiate the
capability. A worker briefing cannot establish routing authority. If state is
missing, stale, or unmatchable, preserve the `SOLO`/sequential fallback.

### 7. Test Strategy

Before selecting or executing validation, load and follow
`policies/verification.md`. When executable gate evidence, candidate
fingerprints, freshness, or receipts are used, load `policies/evidence.md`.

Before implementation, record the testing decision in the transient working
spec or run state. Identify the observable behavior, seam, existing coverage,
smallest useful approach, development mode, rationale, and residual risk.
Register expected checks before running them. Classify each as required,
conditional with an observable condition, or informational.

For any host context discontinuity or recovery event, do not trust conversational
memory alone. Re-read authoritative run state, inspect actual Git and evidence
state where relevant, reconcile before continuing, and do not repeat completed
semantic actions. Host retries remain distinct from SWE Forge retries.


### 8. Implement

Before the first writable checkout/setup operation, first edit, or any
commit/push/PR-related decision, load and follow `policies/delivery.md`. It is
the sole detailed owner of checkout and branch ownership, commits, pushes,
pull requests, synchronization, and cleanup.

Implement only the bounded dependency waves selected by the architecture and
working spec. In `PR`, validate and commit each planned step before beginning
the next. In `GUIDED`, stop at the declared checkpoint. Keep task ownership,
scope, and delivery authorization explicit and stop on a blocking gate.

Before writing, classify the checkout, record the pre-edit baseline, and use
one permitted task/delivery branch. Preserve dirty, detached, protected, or
ambiguous state instead of resetting, stashing, cleaning, or overwriting it.

Delegated workers receive only the validated renderer output and the applicable
canonical role/result contract. When a dependency completes, record its
accepted result reference in the root-owned task graph and derive future digests
at the next launch; do not persist per-ticket handoff files. Workers return the
loaded structured result contract and cannot claim success from code inspection
alone.

### 9. Integrate

For delegated work, load and follow the relevant task/result contracts before
accepting a worker result. Read-only research uses `READ_ONLY` evidence; normal
shared-checkout writing uses `WRITABLE` Git/change/validation evidence; review
uses `contracts/review.md`.

The orchestrator owns acceptance. Consume only results that satisfy scope,
checkout baseline, validation, and evidence requirements. Preserve the `GUIDED`
checkpoint boundary and keep all writes sequential in the one delivery
checkout.

### 10. Verify

Run the relevant repository quality gates after implementation by following the
loaded verification and evidence policies. In `PR`, all applicable slice and
final checks must pass before authorized commit, push, and PR actions. In
`GUIDED`, a checkpoint may report a passing slice while final acceptance remains
pending. Report every check as passed, failed, skipped, unavailable, or
not-applicable with its evidence.

### 11. Review

When the review trigger applies, load `.swe-forge/agents/reviewer.md` and
`.swe-forge/contracts/review.md` before review. Use a fresh context when
delegation, multi-component scope, or medium-or-higher risk makes it useful.
Provide the original ticket, `review_focus`, acceptance criteria, architecture
decisions, final diff, and validation evidence. The reviewer role and contract
define review behavior, relevant findings, and blocking status.

### 12. Repair

Before a `BLOCKED` or `FAILED` recovery path, load and follow
`policies/failure-recovery.md`. Repair only relevant findings within the
original scope and rerun affected validation. Use the policy's retry ceilings,
failure classification, debugger escalation, and preservation rules.

### 13. Final Acceptance

The canonical Acceptance Gate lives in `SWE-FORGE.md`; verification, evidence,
review, delivery, and recovery policies contribute evidence to that gate and do
not define a competing final gate.

Compare the final integrated diff with the original ticket, acceptance criteria,
review focus, and explicit constraints. Do not substitute worker summaries or
passing partial checks for final integrated evidence.

### 14. Report

Use the canonical final-report requirements in `SWE-FORGE.md`, including current
validation, review, delivery, receipt, continuity/recovery, and cleanup evidence.
Keep the report separate from private receipt evidence and project-facing PR
content; never include worker transcripts.

## Blocking and Recovery

When a worker or phase is `BLOCKED` or `FAILED`, use the recovery behavior
defined in `policies/failure-recovery.md`; see Procedure -> Repair.
