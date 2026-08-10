# General Ticket Workflow

This is the V1 operational workflow for a general software ticket. Read it
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

## Procedure

### 1. Ingest

Read the ticket without designing the solution immediately.

For harness commands, parse the raw arguments before ingesting the ticket:

- if the first whitespace-delimited token is lowercase `solo`, `subagents`, or
  `herdr`, record the corresponding explicit `requested_mode` and use the
  non-empty remainder as the ticket
- otherwise preserve all arguments as the ticket and record
  `requested_mode: AUTO`
- a mode token without a ticket is incomplete input; ask for the missing ticket

The lowercase mode words are reserved only as the first command token. Natural
language activation without a command may state a mode preference directly.

Record the requested behavior, explicit constraints, affected users or
systems, non-goals, and any requested validation. Preserve important wording
from the original ticket.

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

Ask the user only when ambiguity genuinely blocks safe implementation. If a
reasonable, low-risk assumption is possible, record it and continue.

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
result.

Parallelize only when dependencies are satisfied, ownership is non-overlapping,
and outputs can be independently evaluated. Otherwise use sequential waves or
`SOLO`.

### 6. Route

Record exactly one execution mode and its reason:

```text
requested_mode: AUTO | SOLO | SUBAGENTS | HERDR
execution_mode: SOLO | SUBAGENTS | HERDR
reason: ...
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

### 8. Implement

Execute dependency waves while preserving bounded scope. A worker owns only
the task it received and must report scope expansion or blocking issues
immediately.

Two writing workers must never edit the same checkout concurrently. Read-only
workers may inspect the integration checkout. Herdr writing workers require
separate worktrees.

Before the first edit, confirm that writable work is on a dedicated,
non-protected branch or worktree. Protected branches include repository-declared
protected branches, the locally known remote default branch, `main`, and
`master`. Do not write when the checkout is protected, detached, or cannot be
classified safely. Ask the user to provide a suitable checkout or authorize
creating one; that authorization does not grant permission to commit or
publish.

Workers must run assigned validation, report files touched, and return a
structured result. They must not claim success from code inspection alone.

### 9. Integrate

The orchestrator owns integration. Review each result against its task contract
before combining it with other work.

For isolated worktrees, integrate commits or patches sequentially in a central
checkout, resolve conflicts centrally, and rerun affected validation. Do not
commit, push, create a pull request, or merge unless the user explicitly
authorized the applicable action. Task contracts may carry user-granted
authorization but cannot create it.

### 10. Verify

Run the relevant repository quality gates after integration. These may include
targeted tests, the complete test suite, typecheck, lint, build, static
analysis, packaging, or repository-specific checks.

Report every check as passed, failed, skipped, or unavailable. Explain why a
check was not applicable or could not run.

### 11. Review

Use a fresh context for independent review whenever the task is more than a
trivial localized change or when risk warrants it. Provide the original ticket,
acceptance criteria, architecture decisions, final diff, and validation
evidence. Do not provide the implementer's entire conversational history.

Review correctness, missing requirements, regressions, abstractions, scope,
error handling, compatibility, concurrency, security, performance, tests, and
unrelated changes. Return findings using `.swe-forge/contracts/review.md`.

Low-confidence stylistic opinions should not block completion. Critical and
high-confidence correctness findings normally require repair.

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

### 14. Report

Return only the decision-relevant result:

- execution mode and reason
- approach and important decisions
- files changed
- tests and other validation with results
- independent review status
- assumptions
- remaining risks or follow-ups

Do not include internal worker transcripts.

Normal completion stops with the reviewed diff and validation evidence for
human approval. A separate explicit instruction to continue through pull-request
creation may authorize committing the reviewed diff, pushing its non-protected
branch, and creating the pull request. It never authorizes merge; merging needs
a separate explicit instruction outside the normal lifecycle.

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
