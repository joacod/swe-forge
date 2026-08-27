# Failure Recovery Policy

Use this policy only after a worker or workflow phase is `BLOCKED` or `FAILED`.
Preserve evidence and use the smallest safe recovery; never turn incomplete
work into success.

## Status and retry

- `DONE`: task contract and assigned evidence are satisfied.
- `BLOCKED`: safe progress needs context, access, a decision, capability, or
  scope change.
- `FAILED`: acceptance was not met or an unresolved failure remains.

Host retries are not Forge task retries. After any retry or recovery, inspect
checkout and evidence before continuing; do not duplicate semantic work. Allow
one Forge retry per task after a changed hypothesis or explicit correction;
stop when the same evidence recurs. More requires explicit guidance or task
authorization.

## Recovery ladder

1. supply missing context or access;
2. clarify the contract and retry once;
3. investigate an uncertain cause with the debugger;
4. serialize conflicting work;
5. reduce scope to the smallest safe unit;
6. fall back to root-owned sequential work; or
7. stop and report the failure.

Keep ownership explicit and never mutate the canonical candidate concurrently.

## Common cases

Classify check failures as implementation, test, environment, or pre-existing;
reproduce where practical and rerun the smallest affected validation. For a
checkout conflict, inspect `HEAD`, branch, diff, and paths, then preserve the
checkout. Isolate shared resources; migrations and shared persistent
environments need separate authorization.

A blocked worker receives missing context once and is retried only after the
blocker is removed. It must report uncommitted changes and exact state. Code
inspection alone cannot produce `DONE`.

A review finding follows `contracts/review.md`. Repair at most one concrete,
localized, clearly repairable blocking finding in a focused context; make one
repair commit in `PR` and rerun affected checks against its new `HEAD`. Do not
launch another reviewer or review/recovery loop. Fundamental, uncertain, unsafe,
or unrepairable findings block. The repaired candidate is not independently
re-reviewed.

## Cleanup handoff

Cleanup follows `policies/delivery.md`; recovery never authorizes destructive
cleanup. If acceptance is impossible, report unmet criteria, failed or
unavailable checks, relevant evidence and attempts, recovery actions, remaining
temporary state, impact, and the safest next action.
