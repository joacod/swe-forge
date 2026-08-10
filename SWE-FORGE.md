# SWE Forge Specification

Version: 1

SWE Forge is an explicitly invoked, portable software-engineering workflow for
AI coding harnesses. It sits above the harness and chooses how much process is
useful for the current ticket.

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
3. Read `.swe-forge/workflows/ticket.md` for the V1 ticket procedure.
4. Read only the role, contract, and policy files needed by the selected
   topology and task risks.

## Canonical Sources

The source of truth is deliberately separated:

- `SWE-FORGE.md` defines activation, principles, lifecycle, and acceptance.
- `.swe-forge/workflows/` defines executable workflow procedures.
- `.swe-forge/agents/` defines harness-neutral role responsibilities.
- `.swe-forge/contracts/` defines structured task, result, review, and state
  formats.
- `.swe-forge/policies/` defines routing, delegation, model, verification, and
  recovery rules.
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
- Do not create commits, push, publish, or modify global configuration unless the
  user explicitly authorizes it; a task contract may only transmit that
  authorization.

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

Every run must record the request, selected mode, and reason:

```text
requested_mode: AUTO | SOLO | SUBAGENTS | HERDR
execution_mode: SOLO | SUBAGENTS | HERDR
reason: <why this is the smallest useful topology>
```

An explicit mode overrides topology preference, not safety, validation, scope,
or delivery authorization. Apply the fallback policy when the requested
topology is unavailable and report the fallback. Block instead when falling
back would make required isolation unsafe or the user prohibited fallback.

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

## V1 Ticket Lifecycle

Follow the detailed procedure in `.swe-forge/workflows/ticket.md`. The
lifecycle is:

1. Ingest the ticket and constraints.
2. Discover relevant repository evidence.
3. Specify observable acceptance criteria and blocking ambiguity.
4. Architect the smallest compatible approach.
5. Decompose only where useful and define bounded task ownership.
6. Route explicitly to `SOLO`, `SUBAGENTS`, or `HERDR`.
7. Select an appropriate test and validation strategy.
8. Implement dependency waves within task scope.
9. Integrate isolated work centrally.
10. Verify with relevant repository quality gates.
11. Review from fresh context using evidence, not implementation chatter.
12. Repair relevant findings and rerun affected validation.
13. Compare the final diff against the original ticket and acceptance criteria.
14. Report the result concisely.

The workflow must adapt its depth. A typo does not require an architect,
security reviewer, Herdr workspace, or ceremonial test plan.

## State and Contracts

Use the contracts under `.swe-forge/contracts/` when tasks are delegated or
state must survive context changes. A run state is temporary by default and
should live outside the repository, for example:

```text
$TMPDIR/swe-forge/<run-id>/run-state.yaml
```

If repository-local state is necessary, use an ignored path such as
`.swe-forge/runs/`. Never commit ticket-specific state, worker transcripts,
credentials, or generated logs.

## Checkout And Delivery Safety

Before writable implementation, confirm that the checkout is on a dedicated,
non-protected branch or worktree. Treat repository-declared protected branches,
the locally known remote default branch, and conventional `main` and `master`
as protected. If the checkout is protected, detached, or cannot be classified
safely, ask the user to provide a suitable checkout or authorize creating one.
Do not edit or commit on a protected branch.

Also record a pre-edit baseline containing the checkout path, HEAD, branch,
remote-default evidence, and staged, unstaged, and untracked files. Do not edit
an in-scope path with pre-existing changes until ownership is resolved. Never
reset, clean, stash, overwrite, or include pre-existing user changes in delivery
without explicit authorization.

Normal SWE Forge invocation authorizes implementation in the suitable checkout,
not delivery actions. Unless the user explicitly authorizes each applicable
action, do not commit, push, create a pull request, or merge. Authorization to
create a branch or worktree grants only that setup action. Authorization to
continue through pull-request creation may cover commit, branch push, and pull
request creation after verification and review; it never authorizes merge.
Merging requires a separate explicit instruction and is not part of the normal
ticket lifecycle.

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

Do not claim a check passed when it was not run. Distinguish skipped checks,
unavailable tooling, and failures from successful validation.

Final status is deterministic: use `ACCEPTED` only when this gate passes, use
`BLOCKED` when a user decision, authorization, access, or environment change
can enable safe continuation, and use `FAILED` when attempted work remains
incorrect or the gate cannot be met within the ticket and recovery limits.

## Final Report

Return a concise report containing:

- final status: `ACCEPTED`, `BLOCKED`, or `FAILED`
- selected execution mode and reason
- implementation approach and important decisions
- files changed
- tests and validation performed with results
- reviewer result and repaired findings
- assumptions and remaining risks
- cleanup status and remaining resources when temporary state, processes, or
  worktrees were used

Do not dump internal agent conversations. Report structured evidence and
decision-relevant summaries.
