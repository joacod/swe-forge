# Execution Routing Policy

## Objective

Select the smallest execution topology that provides a meaningful reliability
benefit for the ticket. More agents are not evidence of better engineering.

Automatic routing is the default for `/swe-forge <ticket>`. Explicit command
forms may request `solo`, `subagents`, or `herdr`; no separate routing worker is
required because the orchestrator already owns discovery and topology choice.

Every run records topology and delivery independently:

```text
requested_mode: AUTO | SOLO | SUBAGENTS | HERDR
execution_mode: SOLO | SUBAGENTS | HERDR
requested_delivery: DEFAULT | GUIDED | PR
delivery_mode: GUIDED | PR
reason: <specific evidence for the topology choice>
fallback_used: no | <requested mode -> selected mode and reason>
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
- delivery mode and whether human checkpoints or uninterrupted execution are
  useful
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

1. Record the requested mode; use `AUTO` when no explicit mode was supplied.
2. Identify the smallest unit that can be solved and verified together.
3. For `AUTO`, estimate whether independent reasoning or ownership is real, not
   imagined, and select the smallest useful topology.
4. For an explicit request, use that topology when available without treating
   it as permission to bypass safety, scope, validation, or delivery
   authorization.
5. Reject parallelization when writable scopes overlap dangerously.
6. Prefer native subagents when they satisfy the independence requirement.
7. Select Herdr automatically only when process or checkout isolation is the
   requirement.
8. Record the topology, delivery mode, reason, worker limit, and fallback
   plan.
9. Re-evaluate the mode if evidence shows the topology is causing conflicts or
   unnecessary overhead. Delivery mode may change checkpoint behavior, but it
   does not make unsafe parallelism acceptable.

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
For an unavailable explicit mode, use the same order and make the fallback
visible. If required isolation would be lost, or the user prohibited fallback,
block instead of selecting an unsafe or unwanted topology.

## Examples

```text
execution_mode: SOLO
delivery_mode: GUIDED
reason: Single localized behavior change with tightly coupled implementation and test.
```

```text
execution_mode: SUBAGENTS
delivery_mode: PR
reason: Read-only repository research and fresh review are independent of the bounded implementation; uninterrupted delivery was explicitly requested.
```

```text
execution_mode: HERDR
delivery_mode: GUIDED
reason: Two services require concurrent writable worktrees and independent development processes.
```
