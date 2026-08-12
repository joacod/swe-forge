# General Ticket Workflow

This is the operational workflow for a general software ticket. Read it
only after the user explicitly invokes SWE Forge.

## Inputs

The workflow accepts:

- the original ticket or problem description
- explicit user constraints
- repository instructions and available tooling
- optional harness, model, or isolation preferences

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
example with `git check-ignore`. If it is not ignored, use a permission-restricted
external temporary directory or stop for explicit setup; do not silently modify
the repository's ignore rules. Clean external state at run completion and
report any cleanup failure.

## Procedure

### 1. Ingest

Read the ticket without designing the solution immediately.

For harness commands, parse the raw arguments before ingesting the ticket:

- inspect the first token: if it is lowercase `solo`, `subagents`, or `herdr`,
  record `requested_mode` and remove it as the explicit topology
- inspect the first remaining token (or the original first token): if it is
  lowercase `guided` or `pr`, record `requested_delivery` and remove it as the
  delivery token; this supports either `solo pr <ticket>` or `pr solo <ticket>`
- if a delivery token was consumed before a topology token, inspect the next
  token for lowercase `solo`, `subagents`, or `herdr` and record it as the
  explicit topology
- if no delivery token is present, record `requested_delivery: DEFAULT` and
  resolve `delivery_mode: GUIDED`
- if no delivery token is present, record `requested_delivery: DEFAULT` and
  resolve `delivery_mode: GUIDED`
- if no topology token was consumed, record `requested_mode: AUTO`
- preserve the non-empty remainder as the original ticket
- a topology or delivery token without a ticket is incomplete input; ask for the
  missing ticket
- if the first token is not one of the reserved lowercase tokens, preserve it
  as ticket text and record `requested_mode: AUTO`

The lowercase topology words remain reserved only in the canonical topology
position. The delivery shorthand is intentionally explicit: `pr` selects the
low-touch pull-request path, while `guided` makes the default visible. Natural
language activation without a command may state a mode preference directly.

Record the requested behavior, explicit constraints, affected users or
systems, non-goals, and any requested validation. Preserve important wording
from the original ticket. Record whether the user wants review checkpoints or
low-touch PR delivery; do not treat a delivery preference as permission to
merge.

### 2. Discover

Inspect the repository before making architectural claims. Locate relevant
entry points, dependencies, analogous implementations, conventions,
documentation, tests, and quality gates.

Use parallel read-only research only when it reduces time or context load. All
research must return evidence with file, symbol, command, or documentation
references.

### 3. Specify

Translate the ticket into observable acceptance criteria. Separate facts from
assumptions and identify compatibility constraints.

In `GUIDED`, ask only blocking questions and keep the plan in the active
context unless a durable run artifact is needed. In `PR`, follow
`.swe-forge/policies/specification.md`: inspect repository facts first, run at
most a short high-leverage interview when the ticket is underspecified, and
build the transient artifact described by
`.swe-forge/contracts/working-spec.md`. Do not write ticket-specific specs to
the repository. A reasonable, low-risk assumption may be recorded and used;
a blocking user decision must be asked rather than guessed.

### 4. Architect

Choose the smallest compatible implementation approach. Identify impacted
components, interfaces, data flow, migration or compatibility concerns, and
risks.

Do not edit code during architecture analysis. Do not introduce an abstraction
unless the ticket and repository evidence justify it.

### 5. Decompose

Create bounded tasks only where decomposition provides useful independence.
Each writable task must state its objective, reason, dependencies, allowed
scope, forbidden scope, acceptance criteria, validation, risk, and expected
result. For `GUIDED`, also divide broad work into cohesive review slices with a
small observable boundary and an explicit checkpoint. For `PR`, keep the
transient working spec and task graph sufficient for one uninterrupted
implementation.

Parallelize only when dependencies are satisfied, ownership is non-overlapping,
and outputs can be independently evaluated. Otherwise use sequential waves or
`SOLO`.

### 6. Route

Record exactly one execution topology and delivery mode with their reasons:

```text
requested_mode: AUTO | SOLO | SUBAGENTS | HERDR
execution_mode: SOLO | SUBAGENTS | HERDR
requested_delivery: DEFAULT | GUIDED | PR
delivery_mode: GUIDED | PR
reason: <why this is the smallest useful topology>
fallback_used: no | <requested mode -> selected mode and reason>
```

Use `SOLO` for small or tightly coupled work. Use `SUBAGENTS` for useful
native parallel research, implementation, testing, or review. Use `HERDR` only
when separate worktrees, processes, harnesses, or contexts materially improve
execution.

Never choose a mode merely because the task is difficult or a tool is
available.

For `AUTO`, apply the routing policy after discovery. An explicit mode bypasses
topology preference but not safety or validation. Use the policy fallback when
the requested mode is unavailable, report it, and block if fallback would
remove isolation required for safe execution or the user prohibited fallback.

### 7. Test Strategy

Select validation proportional to risk and behavior:

- reproduce a bug and add a regression test first when practical
- use test-first development when it provides useful signal
- establish a green baseline before behavior-preserving refactors
- use characterization tests when existing behavior needs protection
- use targeted tests and repository quality gates for straightforward work
- avoid ceremonial tests for changes with no meaningful test surface

Record what will be run before implementation when the task is delegated.
Classify each check as `required`, `conditional`, or `informational`; every
conditional check must include its observable condition. Inspect
commands before execution for filesystem mutation, credentials, networking,
migrations, deployment, publication, production access, or shared-environment
effects. Classify delivery commands separately: local commit, branch push, PR
creation, and post-merge sync are external or checkout-changing effects. A
normal guided invocation authorizes local validation and one safe task-branch
setup from a clean protected default branch, but not delivery. `go` authorizes
the current guided slice's local commit; `PR` mode authorizes per-slice commits,
the final push, and PR creation after their applicable gates. Merge always needs
a separate instruction.

### 8. Implement

Execute dependency waves while preserving bounded scope. A worker owns only
the task it received and must report scope expansion or blocking issues
immediately. In `GUIDED`, complete and validate one review slice at a time,
then stop at a checkpoint with the diff boundary and next slice. Resume after
`continue` or a revision; `go` (or `commit and continue`) first creates a local
commit for the reviewed slice with a concise generated message, then resumes.
In `PR`, do not pause for slice approval after the working spec is ready. Create
one local commit after each slice's required validation, retain the separate
history, and stop only for a blocking decision or failed gate.

Two writing workers must never edit the same checkout concurrently. Read-only
workers may inspect the integration checkout. Herdr writing workers require
separate worktrees.

Before the first edit, confirm that writable work is on a dedicated,
non-protected branch or worktree. Protected branches include repository-declared
protected branches, the locally known remote default branch, `main`, and
`master`. From a clean protected default branch, automatically create one safe
non-protected task branch and reuse it for the entire run. If a suitable
non-protected branch already exists, reuse it; never create another branch for a
later slice. Do not write when the checkout is dirty, detached, or cannot be
classified safely. Stop and ask the user to resolve those conditions rather
than moving or overwriting work.

Record a pre-edit baseline with the absolute checkout path, HEAD, branch,
remote-default evidence, branch setup strategy, and staged, unstaged, and
untracked files. Compare task scope to that inventory. Block on overlapping
pre-existing changes until the user resolves ownership; preserve unrelated
changes and do not reset, clean, stash, or overwrite them. Use the baseline
again during final diff inspection so untracked files and user changes are not
misattributed to the run.

Workers must run assigned validation, report files touched, and return a
structured result. They must not claim success from code inspection alone.

### 9. Integrate

The orchestrator owns integration. Review each result against its task contract
before combining it with other work. Preserve the checkpoint boundary in
`GUIDED`; the user reviews the integrated slice before the next writable wave.
For isolated worktrees, integrate only after the worker result and scope have
been independently checked.

For isolated worktrees, integrate commits or patches sequentially in a central
checkout, resolve conflicts centrally, and rerun affected validation. Keep all
slices for one task on its one task branch. Do not push, create a pull request,
or merge unless the user explicitly authorized the applicable action. `go` and
`PR` mode provide only the local commit authorization described above; task
contracts may transmit authorization but cannot create it.

### 10. Verify

Run the relevant repository quality gates after integration. In `PR` mode,
each slice's required targeted checks must pass before its local commit, and
final verification and fresh review must pass before push or PR creation. In
`GUIDED`, a checkpoint may report a passing slice while the final acceptance
gate remains pending. These may include
targeted tests, the complete test suite, typecheck, lint, build, static
analysis, packaging, or repository-specific checks.

Report every check as passed, failed, skipped, or unavailable. Explain why a
check was not applicable or could not run.

Every required check must pass. A conditional check must pass when its condition
applies or have a recorded evidence-backed determination that it does not apply.
Informational
checks never substitute for required evidence. Changing or substituting a
delegated check requires a revised task contract.

### 11. Review

Use a fresh context for independent review whenever implementation was
delegated, the change spans components, risk is medium or higher, or security,
data integrity, compatibility, concurrency, or external effects are relevant.
For a trivial localized `SOLO` change, the orchestrator may perform final diff
review in the active context and record `review: skipped` with the reason.
Provide the original ticket,
acceptance criteria, architecture decisions, final diff, and validation
evidence. Do not provide the implementer's entire conversational history.

Review correctness, missing requirements, regressions, abstractions, scope,
error handling, compatibility, concurrency, security, performance, tests, and
unrelated changes. Return findings using `.swe-forge/contracts/review.md`.

Apply the blocking matrix in `.swe-forge/contracts/review.md`. Low-confidence
stylistic opinions do not block completion by themselves.

### 12. Repair

Repair relevant findings within the original scope. Re-run affected tests and
quality gates. Escalate to a debugger only when root cause is uncertain or a
failure remains unexplained.

Limit review and repair cycles. If a finding cannot be safely resolved, report
the evidence, impact, and remaining risk instead of looping indefinitely.

### 13. Final Acceptance

Compare the final integrated diff to the original ticket, acceptance criteria,
and explicit constraints. Check for missing functionality, accidental changes,
scope creep, unresolved failures, and unreviewed generated files.

Success requires the acceptance gate in `SWE-FORGE.md`. Do not substitute a
worker's summary for final inspection.

Map the run to `ACCEPTED` only when the gate passes, `BLOCKED` when a decision,
authorization, access, or environment change can enable safe continuation, and
`FAILED` when attempted work remains incorrect or recovery limits are exhausted.

### 14. Report

Return only the decision-relevant result:

- final status: `ACCEPTED`, `BLOCKED`, or `FAILED`
- requested and selected execution topology
- requested and selected delivery mode
- execution mode and reason
- approach and important decisions
- files changed
- tests and other validation with results
- independent review status
- assumptions
- remaining risks or follow-ups
- cleanup status and remaining resources when applicable

Do not include internal worker transcripts.

Normal `GUIDED` completion stops with the reviewed diff and validation evidence
for human approval. The user can say `go` at a checkpoint to commit that slice
and continue, or use the separate `git-commit`, `git-push`, and `git-pr` actions.
`PR` completion may create separate local slice commits, then push and create a
pull request after the final quality gates and reports the URL. It never
authorizes merge. After a human merge, the user can say `merged` or invoke
`git-sync`; the sync action must verify the PR state before switching and
fast-forwarding the default branch.

## Blocking and Recovery

When a worker is `BLOCKED` or `FAILED`, the orchestrator should preserve the
task graph and choose the smallest recovery action:

1. supply missing context
2. retry once with an explicit correction
3. invoke a debugger for evidence gathering
4. serialize conflicting work
5. change execution topology
6. escalate capability
7. complete the task directly

Track retries in temporary run state. Do not retry indefinitely or conceal a
failure in the final report.
