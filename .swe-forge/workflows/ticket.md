# General Ticket Workflow

Read this procedure after an explicit SWE Forge invocation. It defines order
and stage-triggered loading; the linked policies and contracts own the details.

## Artifact boundary

Use only the state needed for the current ticket. Keep a PR working spec and
worker briefs in restricted temporary storage or active context; never commit
them. Keep run state and validation evidence outside the repository or under an
already ignored `.swe-forge/runs/` path. Delegated work uses
`contracts/task.md` and `contracts/result.md`; an independent review uses
`contracts/review.md`.

## Procedure

### 1. Ingest

Invoke `.swe-forge/tools/swe-forge-invocation` exactly once with the complete
raw argument string, unless the host already supplied its normalized result.
Keep the raw invocation immutable and consume these facts without reparsing:
`raw_arguments`, `parsed_ticket`, `delivery_mode`, and `input_status`.

`COMPLETE` proceeds. `EMPTY` and `INCOMPLETE` ask for the missing ticket; do
not initialize a run. Pass the selected internal routing and `delivery_mode`
unchanged to state initialization. Preserve user-supplied skill references as
input, not as permission to install or execute code.

Record the requested behavior, constraints, non-goals, affected surfaces,
requested validation, and any delivery/checkpoint preference. The ticket
remains authoritative.

### 2. Discover and scope

Perform only lightweight, root-owned discovery first: identify the requested
outcome, likely surfaces, and whether the work is coupled.

#### Early semantic scope decision

After that discovery, load and follow `policies/specification.md` for the one
`scope_decision: PROCEED | TOO_BROAD`. If `TOO_BROAD`, explain the independent
chunks, suggest separate tickets, and stop before downstream workflow
machinery. If `PROCEED`, continue.

Before broad discovery, load `policies/execution-routing.md` for its separate
discovery-shape assessment. This is not the final topology decision. Use
`DELEGATED_RESEARCH` only for bounded, independent, read-only questions with
concise evidence; keep coupled questions in the root. A logical batch has one
root fan-in barrier, while the host may schedule ready work concurrently or
sequentially. Do not use this assessment as the final topology decision.

After `PROCEED`, inspect relevant entry points, dependencies, analogous code,
tests, conventions, and quality gates. Load `policies/specialist-skills.md`
only when the ticket names a skill or an already available skill clearly fits.

### 3. Specify

Before specification or clarification behavior is needed, load
`policies/specification.md`. In `PR`, also load
`contracts/working-spec.md` before building the transient spec.

Translate the ticket into observable acceptance, bounded scope/non-goals, an
approach, meaningful risks, and validation. Ask only blocking user questions;
record low-risk assumptions. A PR spec is ready when those fields and its
initial ticket-relevant `review_focus` are clear. Do not create a repository
specification artifact.

### 4. Architect

Choose the smallest compatible approach from repository evidence. Identify
affected interfaces, data flow, compatibility concerns, and risks. Do not edit
during architecture analysis or add speculative abstractions.

### 5. Decompose

Use delegation only when a distinct task can be evaluated independently and
will reduce root coordination. Load `policies/delegation.md`, the relevant
role, and task/result/review contracts before assigning work. Keep ownership
non-overlapping and writes sequential in the canonical delivery candidate.

For each delegated task, create the bounded task contract. At launch, render
and validate a transient `worker-brief-input/v1` record with
`.swe-forge/tools/swe-forge-worker-brief`, then pass the validated projection
unchanged with the canonical role and result contract. The projection, not a
transcript or full run state, is the worker context.

### 6. Route

Before making the final topology decision, load
`policies/execution-routing.md`. Choose `SOLO` unless bounded delegation has a
real benefit and the native capability is fresh and compatible. Record the
preferred/effective choice and concise reason; preserve the safe sequential
fallback when capability is unavailable. Topology selection does not bypass
scope, safety, validation, or delivery authorization.

### 7. Test strategy

Before selecting or executing validation, load `policies/verification.md`.
When recording executable validation evidence or relying on Git candidate
identity, also load `policies/evidence.md`.

Before implementation, record a concise testing decision: observable behavior,
test seam, existing coverage, smallest useful approach, and rationale. Classify
checks as required, conditional, or informational and inspect their side
effects. Reconcile actual Git and evidence state after any context
discontinuity or recovery; do not repeat completed semantic work from memory.

### 8. Implement

Before the first writable checkout/setup operation, load
`policies/delivery.md`. It owns checkout, branch, commit, push, PR, and cleanup
rules. Implement only the bounded approach and selected dependency waves.

Preserve dirty, detached, protected, or ambiguous state. Delegated writes are
materialized, validated, and accepted sequentially in the canonical delivery
checkout. Workers return structured evidence and cannot authorize delivery.
Use ordinary Git commits as the work requires; no implementation checkpoint,
predeclared commit slice, or process proof is required in PR mode.

### 9. Integrate

The root consumes each result through its selected contract. Check task
identity, scope, canonical candidate evidence, assigned validation, and
blockers. After accepting dependency A, derive only a concise B-relevant
`dependency_digest` in B's next briefing. Do not create peer messages or
per-ticket handoff files.

### 10. Verify

Select the smallest final validation groups covering the changed surfaces and
run them once against the completed clean committed candidate. Record each
result against its full Git `HEAD`. A review repair reruns only affected checks
against the new committed `HEAD`; it establishes current evidence but does not
start another review. Report passed, failed, skipped, unavailable, and
not-applicable checks distinctly. Later review, acceptance, and delivery gates
consume this evidence; they do not rerun unchanged validation.

### 11. Review

When the review trigger applies, load the reviewer role and
`contracts/review.md`. In PR mode, review the final validated candidate from
fresh read-only context. The initial handoff contains the Git `HEAD`, original
ticket, complete initial `review_focus`, final diff, and validation evidence—one
concise **initial handoff**, not workflow prose or a transcript.

A `CHANGES_REQUIRED` result permits one **focused repair context** only when
the finding is concrete, localized, and clearly repairable. Commit the repair,
rerun only affected validation, and mark the review repaired in run state. The
repaired candidate is not independently re-reviewed; fundamental or uncertain
findings block delivery.

### 12. Recover

Before a `BLOCKED` or `FAILED` recovery path, load
`policies/failure-recovery.md`. Apply its bounded retry and preservation rules.
A fundamental, uncertain, unsafe, or unrepairable review finding blocks
delivery rather than starting a review/recovery loop.

### 13. Final acceptance and delivery

The canonical Acceptance Gate is in `SWE-FORGE.md`; policies and contracts
supply evidence but do not define competing gates. Compare the final integrated
diff with the original ticket, acceptance, review focus, and constraints. Use
the current validation and allowed review/repair evidence for the exact Git
`HEAD`, then perform only authorized delivery actions.

### 14. Report

Use the final-report requirements in `SWE-FORGE.md`. Keep the report separate
from worker results and project-facing PR content.

## Blocking

On an unmet gate, preserve the candidate and report the missing acceptance,
evidence, authorization, or environment condition. Never change a status to
`DONE` or `ACCEPTED` without its required evidence.
