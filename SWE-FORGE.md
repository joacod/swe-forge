# SWE Forge Specification

SWE Forge is an explicitly invoked, portable software-engineering workflow for
AI coding harnesses. It sits above the harness and chooses how much process is
useful for the current ticket. Execution topology (`SOLO`, `SUBAGENTS`, or
`HERDR`) is independent from delivery mode (`GUIDED` or `PR`), so delegation
and human-control preferences can be combined without weakening safety.

## Activation Contract

SWE Forge must not activate because a task is difficult, because the
repository contains this file, or because a harness can create subagents.

Activation requires an explicit user request. Recognized forms include:

- `Use SWE Forge`
- `Follow SWE Forge`
- an explicit reference to `SWE-FORGE.md`
- a supported command such as `/swe-forge`

If the user has not explicitly invoked SWE Forge, use the harness normally and
do not load this specification or its specialist roles as workflow
instructions.

When the user explicitly invokes SWE Forge:

1. Treat the user's ticket as the workflow input.
2. Read this file completely enough to follow the activation and acceptance
   rules.
3. Read `.swe-forge/workflows/ticket.md` for the ticket procedure.
4. Read only the role, contract, and policy files needed by the selected
   topology and task risks.

## Canonical Sources

The source of truth is deliberately separated:

- `SWE-FORGE.md` defines activation, principles, lifecycle, and acceptance.
- `.swe-forge/workflows/` defines executable workflow procedures.
- `.swe-forge/agents/` defines harness-neutral role responsibilities.
- `.swe-forge/contracts/` defines structured task, result, review, and state
  formats.
- `.swe-forge/policies/` defines routing, delegation, model, specification,
  delivery, verification, and recovery rules.
- `.swe-forge/adapters/` exposes those definitions through harness-native
  features without redefining them.

No adapter, skill, command, or vendor-specific instruction is canonical.

## Operating Principles

- Choose the smallest execution topology that can solve the ticket reliably.
- Prefer a strong single agent over pointless delegation.
- Prefer native subagents over external orchestration when they are sufficient.
- Use Herdr only when isolated execution environments provide real value.
- Use hub-and-spoke coordination through one orchestrator.
- Give workers bounded tasks with explicit ownership and acceptance criteria.
- Consume structured worker results rather than relying on conversational memory.
- Keep read-only research separate from writable implementation.
- Never allow concurrent writing workers to edit the same checkout.
- Treat verification evidence as stronger than confidence or code inspection.
- Inspect validation commands before execution and require explicit authorization
  for migrations, deploys, publication, production access, or other external or
  shared-environment effects.
- Do not expand scope through opportunistic refactoring.
- Keep a transient working spec proportional to the ticket; never create
  ticket-specific planning documents in the repository just to coordinate one
  session.
- Preserve a human checkpoint in `GUIDED` mode and keep delivery actions
  separately authorized.
- Keep commits, pushes, publication, and global configuration changes separately
  authorized. `PR` mode authorizes its documented per-slice commits, push, and PR
  creation; `go` authorizes only the current guided slice's local commit. Never
  infer merge authorization.

## Execution Topology

`/swe-forge <ticket>` uses automatic routing by default. The orchestrator
discovers enough repository evidence to choose the smallest useful topology;
it does not need a separate decision agent.

Harness commands may also accept an explicit topology as the first argument:

```text
/swe-forge solo <ticket>
/swe-forge subagents <ticket>
/swe-forge herdr <ticket>
```

Execution topology and delivery mode are orthogonal. The default delivery
mode is `GUIDED`; use `pr` only when the user wants the run to continue through
pull-request creation:

```text
/swe-forge <ticket>                 # GUIDED, automatic topology
/swe-forge pr <ticket>              # PR delivery, automatic topology
/swe-forge solo pr <ticket>         # explicit topology plus PR delivery
/swe-forge subagents <ticket>       # GUIDED, explicit topology
```

The parser accepts a delivery token before or after an explicit topology. Lower-
case `pr` and `guided` are reserved in those positions; other ticket text is
preserved. A missing ticket after either token is incomplete input.

Every run must record the request, selected modes, and reasons:

```text
requested_mode: AUTO | SOLO | SUBAGENTS | HERDR
execution_mode: SOLO | SUBAGENTS | HERDR
requested_delivery: DEFAULT | GUIDED | PR
delivery_mode: GUIDED | PR
reason: <why this is the smallest useful topology>
fallback_used: no | <requested mode -> selected mode and reason>
```

An explicit topology overrides topology preference, not safety, validation,
scope, or delivery authorization. An explicit `pr` delivery token requests
low-touch delivery but does not bypass safety, validation, scope, or review.
Apply the fallback policy when the requested topology is unavailable and report
the fallback. Block instead when falling back would make required isolation
unsafe or the user prohibited fallback.

### SOLO

Use `SOLO` when the work is small, tightly coupled, sequential, or easier to
verify in one context. The current agent acts as orchestrator and implementer.

Even in `SOLO`, perform lightweight discovery, specify acceptance criteria,
plan the change, run relevant validation, inspect the final diff, and report
evidence. Do not create artificial workers.

### SUBAGENTS

Use `SUBAGENTS` when the current harness provides native subagents and
independent research, architecture analysis, test strategy, bounded
implementation, or fresh review will materially improve the result.

Use approximately two to four active workers unless evidence justifies a
different limit. Keep the orchestrator responsible for task dependencies,
shared state, integration, and acceptance. Workers must not recursively create
arbitrary workers unless the task contract explicitly authorizes it.

If native subagents are unavailable, execute the work sequentially or choose
`SOLO`; do not simulate subagents with unnecessary operating-system processes.

### HERDR

Use `HERDR` only when execution environments themselves need isolation. Valid
reasons include independent writable worktrees, concurrent service or dev
server processes, multiple harnesses, alternative implementations, or strong
context isolation.

Two writing workers must never share a checkout. Give each concurrent writing
worker a separate worktree and integrate changes centrally, one at a time.

Herdr is optional. If it is unavailable or cannot provide useful isolation,
fall back to native subagents or sequential execution and record the fallback.

## Delivery Modes

### GUIDED (default)

`GUIDED` keeps the user in the loop without forcing one large review. From a
clean protected default branch, it automatically creates one dedicated task
branch and reuses that branch for the whole run. The orchestrator plans
cohesive implementation slices, validates each slice, and stops at a checkpoint
with the diff boundary, evidence, risks, and next step.

The user may reply `continue` to proceed without delivery, `revise: ...` to
reshape the slice, or `go` to commit the reviewed slice with a generated,
repository-appropriate message and continue. `commit and continue` remains the
long form of `go`. A guided run never pushes, creates a PR, or merges merely
because a slice was approved; `go` authorizes only its local commit.

### PR

`PR` is the opt-in low-touch path. It runs the lightweight specification policy
when the ticket needs clarification, keeps the working spec outside the
repository, and proceeds through implementation without interactive checkpoints.
It creates one local commit after each validated slice, then runs final
verification and fresh review before pushing and creating a pull request. The
commits remain separate so the PR shows the implementation steps. It ends with
a concise PR URL and never merges. It does not skip automated checks or
independent review.

Use the atomic delivery actions described by `.swe-forge/policies/delivery.md`
for guided follow-up: `git-commit`, `git-push`, `git-pr`, and `git-sync`. Pushing
must never unexpectedly create a PR. After a human merges a PR, say `merged` in
the active run or invoke `git-sync`; Forge verifies the PR state before
returning to the remote default branch and fast-forwarding it.

## Model Routing

The canonical workflow uses capability classes, not provider names or model
identifiers:

```yaml
orchestrator: strongest-reasoning
architect: strongest-reasoning
researcher: fast-capable
implementer: strong-coding
refactor-specialist: strong-coding
test-engineer: strong-coding
reviewer: strong-independent-reasoning
debugger: strongest-reasoning
security-reviewer: strongest-reasoning
performance-reviewer: strongest-reasoning
```

Harness adapters may map capabilities to user-selected models and harnesses.
Different models for implementation and review are optional, not required.

## Ticket Lifecycle

Follow the detailed procedure in `.swe-forge/workflows/ticket.md`. The
lifecycle is:

1. Ingest the ticket, topology token, delivery token, and constraints.
2. Discover relevant repository evidence.
3. Specify observable acceptance criteria and blocking ambiguity; in `PR` mode,
   create a transient working spec and run the brief alignment interview only
   when the ticket is underspecified.
4. Architect the smallest compatible approach.
5. Decompose only where useful and define bounded task ownership or guided
   review slices.
6. Route explicitly to `SOLO`, `SUBAGENTS`, or `HERDR`.
7. Select an appropriate test and validation strategy.
8. Implement dependency waves within task scope, stopping at guided
   checkpoints when `delivery_mode` is `GUIDED`.
9. Integrate isolated work centrally.
10. Verify with relevant repository quality gates.
11. Review from fresh context using evidence, not implementation chatter.
12. Repair relevant findings and rerun affected validation.
13. Compare the final diff against the original ticket and acceptance criteria.
14. Perform only the delivery actions authorized by the selected mode or a
   later explicit user instruction.
15. Report the result concisely.

The workflow must adapt its depth. A typo does not require an architect,
security reviewer, Herdr workspace, or ceremonial test plan.

## State and Contracts

Use the contracts under `.swe-forge/contracts/` when tasks are delegated or
state must survive context changes. In `PR` mode, the working-spec contract
provides a short behavior-first brief; it is temporary and is not a repository
artifact. A run state is temporary by default and should live outside the
repository, for example:

```text
$TMPDIR/swe-forge/<run-id>/run-state.yaml
```

If repository-local state is necessary, use an ignored path such as
`.swe-forge/runs/`. Never commit ticket-specific state, worker transcripts,
credentials, or generated logs.

## Checkout And Delivery Safety

Before writable implementation, classify the checkout and record the
baseline. Treat repository-declared protected branches, the locally known
remote default branch, and conventional `main` and `master` as protected. If a
clean checkout is currently on a protected default branch, the normal workflow
automatically creates one safe, dedicated non-protected task branch. If it is
already on a suitable non-protected branch or worktree, reuse that same branch
for every slice. Never create another branch during the run.

If the checkout is dirty, detached, or cannot be classified safely, stop and ask
the user to resolve it; do not reset, clean, stash, overwrite, or include
pre-existing user changes. Do not edit or commit on a protected branch. If the
requested branch name already belongs to another task, use a safe run suffix or
ask rather than silently reusing it. A user-provided branch or worktree
preference may replace the default when it passes the same gates.

Record a pre-edit baseline containing the checkout path, HEAD, branch,
remote-default evidence, and staged, unstaged, and untracked files. Automatic
branch setup is workflow authorization only. Normal `GUIDED` invocation
authorizes implementation and this one-branch setup, not commits, pushes,
pull requests, or merges. `go` explicitly authorizes only the current local
slice commit. An explicit `PR` delivery token authorizes its per-slice commits,
final push, and pull-request creation after the required gates. Merging always
requires a separate explicit instruction and is not part of the ticket
lifecycle.

## Failure Handling

Workers may return `DONE`, `BLOCKED`, or `FAILED`. A blocked worker does not
automatically terminate the run. The orchestrator may provide missing context,
retry once, invoke a debugger, serialize conflicting work, change strategy,
escalate capability, or complete the task itself.

Track retries and avoid infinite retry or review loops. Preserve the evidence
for unresolved failures in the final report.

## Acceptance Gate

Declare success only when all applicable conditions are met:

- original acceptance criteria are accounted for
- relevant tests pass
- relevant typecheck, lint, build, and repository checks pass
- no blocking review finding under `.swe-forge/contracts/review.md` remains
- no unintended changes remain
- the final integrated diff has been inspected
- when `delivery_mode: PR`, the authorized commit, push, and pull-request
  actions complete or the run is reported `BLOCKED`; `GUIDED` may finish with a
  reviewed local diff and delivery actions not authorized

Do not claim a check passed when it was not run. Distinguish skipped checks,
unavailable tooling, and failures from successful validation.

Final status is deterministic: use `ACCEPTED` only when this gate passes, use
`BLOCKED` when a user decision, authorization, access, or environment change
can enable safe continuation, and use `FAILED` when attempted work remains
incorrect or the gate cannot be met within the ticket and recovery limits.

## Final Report

Return a concise report containing:

- final status: `ACCEPTED`, `BLOCKED`, or `FAILED`
- selected execution and delivery modes with reasons and any fallback
- implementation approach and important decisions
- files changed
- tests and validation performed with results
- reviewer result and repaired findings
- assumptions and remaining risks
- delivery result (checkpoint, commit, push, PR URL, or explicit not-authorized
  status)
- cleanup status and remaining resources when temporary state, processes, or
  worktrees were used

Do not dump internal agent conversations. Report structured evidence and
decision-relevant summaries.
