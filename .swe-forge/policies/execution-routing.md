# Execution Routing Policy

## Objective

Select the smallest execution topology that provides a meaningful reliability
benefit for the ticket. More agents are not evidence of better engineering.

Every run records:

```text
execution_mode: SOLO | SUBAGENTS | HERDR
reason: <specific evidence for the choice>
```

## Decision Factors

Evaluate these factors before creating workers:

- change size and number of affected components
- coupling between implementation and tests
- amount of independent research or review required
- write-scope overlap and conflict risk
- need for separate services, processes, worktrees, or harnesses
- availability and quality of native subagent support
- verification burden and failure impact
- communication, context, and integration overhead

Task difficulty alone is not a routing criterion.

## Modes

### SOLO

Choose `SOLO` when any of these apply:

- the change is small and localized
- implementation and tests are tightly coupled
- the work is inherently sequential
- parallel workers would touch the same files
- a single context can inspect and verify the change efficiently
- delegation overhead exceeds expected benefit

`SOLO` still includes lightweight discovery, acceptance criteria, validation,
final diff review, and a concise report.

### SUBAGENTS

Choose `SUBAGENTS` when native workers can provide useful independent work,
such as:

- repository exploration while the orchestrator plans
- external research requested by the ticket
- architecture or test-strategy analysis
- bounded implementation with non-overlapping ownership
- independent review in a fresh context

Prefer approximately two to four active workers. Use fewer when the task has
limited independence. Use more only with an explicit reason and a plan for
consuming their results.

### HERDR

Choose `HERDR` only when the execution environment needs isolation, such as:

- concurrent writable work in separate packages or services
- separate Git worktrees are materially useful
- independent development servers or long-running processes are needed
- alternative implementations are being compared
- multiple harnesses are useful for distinct tasks
- worker context must be strongly isolated

Herdr must not be selected merely because it is installed or because a task
has multiple files.

## Routing Procedure

1. Identify the smallest unit that can be solved and verified together.
2. Estimate whether independent reasoning or ownership is real, not imagined.
3. Reject parallelization when writable scopes overlap dangerously.
4. Prefer native subagents when they satisfy the independence requirement.
5. Select Herdr only when process or checkout isolation is the requirement.
6. Record the mode, reason, worker limit, and fallback plan.
7. Re-evaluate the mode if evidence shows the topology is causing conflicts or
   unnecessary overhead.

## Safety Rules

- two writing workers must never share a checkout concurrently
- read-only research may use the integration checkout
- isolated work must be integrated centrally and sequentially
- a worker cannot change the run topology without orchestrator approval
- unavailable tooling triggers fallback, not a fabricated success

## Fallback Order

When the selected mode is unavailable or ineffective:

1. reduce `HERDR` to native `SUBAGENTS` when isolation is not essential
2. reduce `SUBAGENTS` to sequential work when independence disappears
3. use `SOLO` when one context is the safest execution unit

Record the original decision, the observed limitation, and the fallback.

## Examples

```text
execution_mode: SOLO
reason: Single localized behavior change with tightly coupled implementation and test.
```

```text
execution_mode: SUBAGENTS
reason: Read-only repository research and fresh review are independent of the bounded implementation.
```

```text
execution_mode: HERDR
reason: Two services require concurrent writable worktrees and independent development processes.
```
