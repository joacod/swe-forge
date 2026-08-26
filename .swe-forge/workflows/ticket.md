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
`delivery_mode`, `input_status`, and `consumed_tokens`. With no delivery token,
the parser reports `requested_delivery: DEFAULT` and `delivery_mode: PR`; only
an explicit `guided` token selects `GUIDED`. `COMPLETE` is the only status that
proceeds as a ticket. `EMPTY` and `INCOMPLETE` require the missing ticket. The
parser does not choose automatic topology.

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

### 2. Discover and scope

Perform only enough lightweight, root-owned repository discovery to identify
the ticket's requested outcomes, likely affected surfaces, and whether those
outcomes are coupled. This may inspect relevant entry points, documentation,
tests, and conventions; it must not turn into architecture, decomposition, or
validation planning.

#### Early semantic scope decision

After that lightweight discovery, load and follow
`policies/specification.md` for the one transient root/orchestrator decision:

```text
scope_decision: PROCEED | TOO_BROAD
```

Use this question:

> Can this request reasonably produce one cohesive reviewable PR with one
> primary outcome and a bounded implementation surface?

Choose `PROCEED` when the answer is yes. A substantial implementation, many
changed files, or several ordered implementation steps can still be one
cohesive outcome. Do not use work amount, prompt length, or file count as a
proxy for breadth.

Choose `TOO_BROAD` when the request is effectively an epic, bundles multiple
independently implementable improvements, asks for an open-ended rewrite, or
should obviously be split into multiple tickets. This is a semantic judgment,
not a score, size threshold, topology choice, or delivery choice.

If `TOO_BROAD`, briefly explain why and suggest the major independent chunks
the user should submit separately, then stop before specification,
architecture, decomposition, routing, validation planning, implementation,
review, or delivery. Do not create a working spec, task graph, worker
assignment, review handoff, or delivery artifact for the rejected request.

If `PROCEED`, continue the normal discovery and ticket lifecycle. Automatic
topology selection still happens later, and `PR` remains the normal/default
delivery path.

Before broad discovery, load and follow `policies/execution-routing.md` for its
lightweight discovery-shape assessment. Keep `discovery_strategy` in the
transient working spec or active context; it may select delegated research only
after this gate has passed. This early research strategy is separate from the
final topology decision and does not create durable routing state.

After `PROCEED`, inspect the repository before making architectural claims.
Locate relevant entry points, dependencies, analogous implementations,
conventions, documentation, tests, and quality gates. If the ticket names an
optional skill, load `policies/specialist-skills.md` and evaluate it on demand;
otherwise do not search or load unrelated skills.

For `DELEGATED_RESEARCH`, load `policies/delegation.md`, the bounded researcher
role, and the task/result contracts before assigning a worker. Give each worker
one bounded question, a small allowed read scope, an evidence budget, and a
structured result contract. Workers do not write, make delivery or topology
decisions, pass along full ticket/history, recurse, or orchestrate other
workers. If no native capability is available, record the safe fallback to
root-only discovery. When multiple genuinely independent questions survive the
assessment, submit the useful ready questions together as one small logical
fan-out/fan-in batch, then wait at one root fan-in barrier. The host runtime may
execute those ready items concurrently or sequentially; Forge does not
prescribe an active-worker count. Consume the structured results together and
resolve contradictions in the root. Coupled questions stay root-only or
sequential.

The full evidence-backed topology decision remains in step 6 after
specification, architecture, and useful decomposition. Early research must not
become a second router.

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
artifact. Record its initial `review_focus` with the complete ticket-relevant
criteria, relevant quality concerns and non-goals, alongside the testing
decision, validation plan, and assumptions. Ask only blocking user questions
and record low-risk assumptions. Host context preservation, compaction, retry,
and restoration are runtime concerns, not canonical Forge controls.



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
`PR`, let implementation boundaries emerge from the work; do not create a
separate artifact for commit boundaries or require a particular number or order
of commits.

Parallelize only read-only questions with non-overlapping ownership and
satisfied dependencies. A logical fan-out batch does not prescribe host
scheduling; shared architecture, contracts, schemas, lockfiles, or generated
artifacts require root-owned foundation work first. Writable delegated results
must be materialized into and accepted sequentially against the canonical
delivery candidate.

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
working spec. In `PR`, use targeted checks and, when useful, record a checkpoint
and materializing commit for each coherent implementation slice. A ticket may
naturally result in one commit or several; delivery does not require a
predeclared commit sequence. Use an explicit review-repair checkpoint and
commit for blocking review repairs. In `GUIDED`, stop at
the declared checkpoint. Keep task ownership, scope, and delivery authorization
explicit and stop on a blocking gate.

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
canonical delivery-candidate baseline, validation, and evidence requirements.
If a host executes the worker privately, materialize its bounded change into the
canonical delivery checkout and validate it there before acceptance or any
dependent handoff. Preserve the `GUIDED` checkpoint boundary and keep writable
acceptance sequential.

### 10. Verify

Run the relevant repository quality gates by following the loaded verification
and evidence policies. In `PR`, targeted checks must pass for any implementation
slice before its checkpoint and materializing commit. Once implementation is
complete, run final integrated validation once against the committed candidate.
If a review repair changes the candidate, run the checks affected by that repair
and establish current final evidence for the repaired candidate. `GUIDED` may
report a passing slice while final acceptance remains pending. Report every
check as passed, failed, skipped, unavailable, or not-applicable with its
evidence. Later review, acceptance, and delivery gates consume this evidence;
they do not rerun unchanged validation.

### 11. Review

When the review trigger applies, load `.swe-forge/agents/reviewer.md` and
`.swe-forge/contracts/review.md` before review. In `PR`, run one independent
review from fresh context only after implementation and final validation are
complete, against that same committed candidate.

The root owns the semantic handoff. Load the reviewer role and result contract
as canonical references, but do not paste their methodology into the
assignment or combine it with workflow, state, authorization, delivery, CI,
or generic risk-checklist prose. Do not forward the implementer's transcript.
`review_focus` is the authoritative structured scope; do not add duplicate
"ticket scope" or "check specifically" summaries.

The initial handoff is one concise comprehensive assignment containing:

- candidate identity (`HEAD`, fingerprint, branch, and delivery path), plus the
  read-only/no-tests constraint;
- the original ticket;
- the complete ticket-relevant `review_focus`, including its acceptance
  criteria, relevant architecture decisions and constraints, quality checks,
  and non-goals;
- the final diff and existing validation evidence; and
- references to the reviewer role and canonical result contract.

A `PASS` continues directly to acceptance. A `CHANGES_REQUIRED` result does
not start another reviewer. The root either blocks a fundamental, materially
uncertain, unsafe, or otherwise unrepairable candidate, or derives one focused
repair context containing only the prior finding, repair delta, directly
affected criteria, and affected validation. The root or one bounded repair
worker applies the localized fix, records the review-repair checkpoint and
commit in `PR`, and runs the affected validation. The repaired candidate is
not independently re-reviewed; record that fact in the final report. Do not
replay the initial handoff, unrelated criteria, workflow invariants, or a full
transcript during repair. Unaffected review conclusions remain context for the
root but are not used to justify a second review.

### 12. Repair

Before a `BLOCKED` or `FAILED` recovery path, load and follow
`policies/failure-recovery.md`. A review finding is repaired only when the
finding is concrete, localized, and clearly repairable; otherwise preserve the
candidate and stop. Do not launch another reviewer or create a review/recovery
loop. Ordinary debugging of an unrelated implementation or test failure follows
task recovery instead.

### 13. Final Acceptance

The canonical Acceptance Gate lives in `SWE-FORGE.md`; verification, evidence,
review, delivery, and recovery policies contribute evidence to that gate and do
not define a competing final gate.

Compare the final integrated diff with the original ticket, acceptance criteria,
review focus, and explicit constraints. Verify and consume current local
validation plus either a `PASS` review for the exact candidate or the one
recorded review-repair evidence and affected validation. Do not rerun unchanged
broad validation, request another reviewer, or treat acceptance itself as a new
semantic audit.

### 14. Report

Use the canonical final-report requirements in `SWE-FORGE.md`, including current
validation, review, delivery, receipt, continuity/recovery, and cleanup evidence.
Keep the report separate from private receipt evidence and project-facing PR
content; never include worker transcripts.

## Blocking and Recovery

When a worker or phase is `BLOCKED` or `FAILED`, use the recovery behavior
defined in `policies/failure-recovery.md`; see Procedure -> Repair.
