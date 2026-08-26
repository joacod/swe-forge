# Failure Recovery Policy

Use this policy only after a worker or workflow phase is `BLOCKED` or
`FAILED`. Preserve evidence and use the smallest safe recovery; never turn an
incomplete result into success.

## Status and retry boundary

- `DONE` means the task contract and assigned evidence are satisfied.
- `BLOCKED` means safe progress needs context, access, a decision, capability,
  or scope change.
- `FAILED` means the attempt did not satisfy acceptance or exposed an
  unresolved failure.

Host retries are not Forge task retries. After a host retry or recovery, inspect
the actual checkout and evidence before continuing and do not duplicate semantic
work. Allow one Forge retry per task after a changed hypothesis or explicit
correction; stop when the same evidence recurs. Exceeding that limit needs
explicit guidance or task authorization.

## Recovery ladder

1. supply missing context or access;
2. clarify the contract and retry once;
3. investigate with the debugger when the cause is uncertain;
4. serialize conflicting work;
5. reduce scope to the smallest safe unit;
6. fall back to root-owned sequential work; or
7. stop and report the unresolved failure.

Keep ownership explicit and never allow concurrent mutation of the canonical
delivery candidate.

## Common cases

Classify test failures as implementation, test, environment, or pre-existing;
reproduce where practical and rerun the smallest affected validation. For a
checkout conflict, stop, inspect `HEAD`, branch, diff, and paths, and preserve
the checkout. For shared resources, isolate or serialize them; migrations and
shared persistent environments need separate authorization.

A blocked worker receives missing context once, then is retried only if the
blocker is removed. It must report uncommitted changes and exact state. A worker
cannot declare `DONE` from code inspection alone.

A review finding follows `contracts/review.md`. Repair only one concrete,
localized, clearly repairable blocking finding, in a focused context; record its
repair checkpoint/commit in PR mode and rerun affected checks. The repaired
candidate is not independently re-reviewed. Fundamental, materially uncertain,
unsafe, or unrepairable findings block; do not launch another reviewer or a
review/recovery loop.

## Cleanup Handoff

Cleanup rules live in `policies/delivery.md`; recovery never authorizes
destructive cleanup. If acceptance is impossible, report unmet criteria,
failed or unavailable checks, relevant attempts and evidence, recovery actions,
remaining temporary state/processes, impact, and the safest next action.
