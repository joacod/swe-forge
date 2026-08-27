# Delegation Policy

Use hub-and-spoke coordination:

```text
root -> bounded workers -> structured results -> root
```

The root owns the task graph, dependencies, shared state, canonical checkout,
integration, and acceptance. Workers are not peers or a second source of truth.

## When to delegate

Delegate one distinct task whose result is independently checkable and whose
concise evidence reduces root coordination: bounded research, architecture,
test strategy, scoped implementation, or the single fresh review. Keep coupled
work in `SOLO`.

`DELEGATED_RESEARCH` is read-only: one question, bounded reads, an evidence
budget, and an observable acceptance condition. If unavailable, work in the
root or sequentially without claiming delegation. Batch genuinely independent
questions once, then fan in at the root; preserve actual dependencies.

## Ownership and launch

Before launch, create `contracts/task.md`. Give each task one objective, owner,
non-overlapping scope, dependencies, acceptance, assigned validation, risk, and
action authorization. Descendant delegation is disabled unless explicitly
bounded. One writer owns a path or symbol set at a time; concurrent mutation of
the canonical candidate is forbidden.

A worker may run in a private host environment, but writable results must be
materialized and validated in the canonical checkout before acceptance or
dependent work. Workers do not push, create a PR, merge, publish, deploy,
reroute, or expand scope without explicit bounded authorization.

Immediately before launch, create and validate one canonical JSON worker brief:

```text
../tools/swe-forge-worker-brief validate --brief FILE
```

Pass the unchanged brief with the selected role and result/review contract. Do
not pass transcripts, full run state, full history, full diffs, or unrelated
policy prose. After task A is accepted, a B brief may contain only a concise,
B-specific `dependency_digest` of accepted facts; it cannot change B's scope,
permissions, authority, or dependencies.

## Results and recovery

Use `contracts/result.md` for ordinary workers and `contracts/review.md` for
review. Validate task identity, profile, scope, candidate evidence, assigned
checks, and blockers; reject incomplete or mismatched results as `BLOCKED`.

Use `policies/failure-recovery.md` for failures and retry limits. A review repair
is one focused writable task, not another review or worker chain.
