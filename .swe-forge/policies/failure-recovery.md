# Failure Recovery Policy

## Worker Status

Workers return one of:

- `DONE`: acceptance criteria and assigned validation are satisfied, the
  delivery checkout evidence is complete, and the structured result is valid;
- `BLOCKED`: safe progress requires context, access, a decision, a capability,
  or a scope change; and
- `FAILED`: the attempt did not satisfy acceptance criteria or exposed an
  unresolved failure.

A host task lifecycle state is scheduling evidence only. It never replaces a
structured result, Git evidence, validation, or root-owned acceptance.

## Host retry boundary

Automatic model or harness retries are not SWE Forge task retries. While a host
is retrying, do not launch duplicate workers, repeat the plan, or make a second
delivery attempt. Once the call settles, inspect the actual checkout and
evidence state before continuing. If the call still fails, record the failure
separately and use at most the normal one Forge retry after a changed hypothesis
or explicit correction.

## Recovery Ladder

Use the smallest recovery action that addresses the evidence:

1. supply missing context or repository access;
2. clarify the task contract and retry once;
3. run a focused debugger investigation;
4. serialize work that exposed an ownership or ordering conflict;
5. reduce the task scope to the smallest safe unit;
6. fall back to root-owned sequential work when native delegation is unavailable;
7. escalate capability or assign the work to the orchestrator; and
8. stop and report the unresolved failure when safe progress is not possible.

Do not hide a failure by changing the status to `DONE`. Never allow concurrent
mutation of the canonical delivery candidate.

## Retry Limits

- default to one retry per task after an explicit correction;
- record each attempt and its reason;
- default to at most two review executions total for one candidate;
- count every fresh reviewer-like pass in that budget, regardless of whether
  it is called independent review, focused review, investigation, debug review,
  or another recovery label;
- do not count ordinary debugging of an unrelated implementation or test
  failure as a review execution;
- after a second `CHANGES_REQUIRED` review, preserve the latest findings and
  evidence, stop automatic repair/review activity, and report the blocker;
- stop when the same evidence recurs without a changed hypothesis or approach;
  and
- require explicit user guidance or another already-explicit task authorization
  recorded in run state to exceed a default, with a hard run-specific ceiling
  before continuing.

The canonical `review.attempts` and `review.retry_ceiling` fields in schema-v4
run state own the review budget. The executable review gate increments attempts
before replacing review evidence and rejects a ceiling-exhausted execution;
changing the source label cannot bypass it.

Retries must not overwrite unrelated user changes or create unbounded worker
activity.

## Common Failures

### Scope Conflict

Stop the conflicting task, preserve its result, update ownership or
 dependencies, serialize the remaining work, and rerun affected validation. A
conflict between tasks classified as independent is evidence that the
decomposition may be wrong.

### Test Failure

Classify the failure as implementation, test, environment, or pre-existing.
Reproduce it, invoke the debugger when root cause is uncertain, and rerun the
smallest affected validation after repair. A worker cannot declare `DONE` from
code inspection alone.

### Blocked Worker

Provide the missing context once, then retry only if the blocker is removed.
Otherwise reassign the bounded task or return the blocker to the root. Preserve
uncommitted changes and report their exact checkout state.

### Checkout Conflict

Stop safely, preserve the current checkout, inspect `HEAD`, diff, branch, and
candidate paths, and re-evaluate ownership and dependencies. Serialize the
affected task from the current safe baseline. Never silently resolve a conflict
or use destructive cleanup against ambiguous state.

### Environment Failure

Inspect setup commands and resource state. Treat ports, databases, temporary
paths, migrations, and shared services as explicit resources. Allocate unique
resources or serialize execution. Migrations and shared persistent environments
require separate authorization. Preserve dirty or unknown resources and report
cleanup status.

### Review Finding

Classify the finding using the blocking matrix in `../contracts/review.md`.
Repair only blocking in-scope findings and rerun the affected checks. In `PR`,
record the explicit review-repair checkpoint and atomic commit; if that commit
changes the candidate, establish the required final evidence for the new `HEAD`
before requesting the focused re-review. Build that re-review from the prior
blocking findings, repair delta, and directly affected `review_focus`; carry
forward unaffected prior `PASS` conclusions rather than replaying the initial
assignment. Other delivery modes use their existing checkpoint semantics. Do
not loop on nonblocking low-confidence style opinions.

## Cleanup Handoff

Cleanup authorization and exact safe-removal rules are owned by
`../policies/delivery.md`. During recovery, preserve dirty, blocked, stale,
conflicting, or ambiguous state and report it; never use recovery as permission
for destructive cleanup.

## Final Failure Reporting

If acceptance is not possible, report:

- original acceptance criteria that remain unmet;
- failed or unavailable checks;
- relevant worker and retry history;
- evidence and likely root cause;
- attempted recovery actions;
- remaining temporary state or processes; and
- remaining impact and safest next action.

An honest incomplete result is preferable to an unsupported success claim.
