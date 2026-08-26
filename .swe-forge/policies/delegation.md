# Delegation Policy

Use hub-and-spoke coordination:

```text
root -> bounded workers -> structured results -> root
```

The root owns the task graph, dependencies, shared state, canonical delivery
checkout, integration, and acceptance. Workers do not communicate as peers or
become a second source of truth.

## When to delegate

Delegate only a distinct task whose result can be checked independently and
whose concise evidence materially reduces root coordination. Useful tasks
include bounded research, architecture analysis, test strategy, one scoped
implementation, or the single fresh review. Keep coupled work in `SOLO`.
Native capability is optional and never chooses topology by itself.

`DELEGATED_RESEARCH` is read-only: one question, bounded reads, an evidence
budget, and an observable acceptance condition. If capability is unavailable,
research in the root or sequentially without claiming delegation.

When two or more questions are genuinely independent, submit one small logical
fan-out before consuming results and wait at one fan-in barrier. The host may
schedule ready items concurrently or sequentially. Coupled questions stay
root-owned or follow their actual dependency.

## Task and ownership rules

Before launch, create `contracts/task.md`. Give each task one objective, owner,
non-overlapping scope, dependencies, acceptance, assigned validation, risk,
and action authorization. Descendant delegation is disabled unless explicitly
bounded. One writing task owns a path or symbol set at a time; concurrent
mutation of the canonical delivery candidate is forbidden.

A worker may run in a host-private environment, but its bounded writable result
must be materialized into and validated against the canonical delivery
checkout before root acceptance or dependent work. Workers never push, create a
PR, merge, publish, deploy, reroute, or expand scope without explicit task
authorization. Dependencies normally flow from research/architecture to
bounded writes, verification, one review, and an optional repair; collapse the
waves for small work.

## Launch and handoff

Immediately before launch, render and validate `worker-brief-input/v1` with
`../tools/swe-forge-worker-brief`. Pass the unchanged projection with the
selected role and result/review contract. The task and run state remain
root-owned; do not pass transcripts, full history, full diffs, or unrelated
policy prose.

After task A is accepted, the root may derive a concise B-specific
`dependency_digest` in B's existing briefing. It may contain only accepted
B-relevant decisions, facts, interfaces, paths/symbols, assumptions, validation
facts, risks, and source references. It cannot change B's scope, permissions,
authority, or dependencies.

## Results and recovery

Use `contracts/result.md` for `READ_ONLY` and `WRITABLE` results and
`contracts/review.md` for review. Validate identity, profile, scope, evidence,
and assigned checks before accepting a result; do not fill missing fields from
memory. Incomplete or mismatched results are `BLOCKED`.

Use `policies/failure-recovery.md` for worker failures and retry limits. A
review repair is a focused writable task, not another review or worker chain.
