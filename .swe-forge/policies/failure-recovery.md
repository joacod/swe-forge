# Failure Recovery Policy

## Worker Status

Workers return one of:

- `DONE`: acceptance criteria and assigned validation are satisfied
- `BLOCKED`: safe progress requires context, access, a decision, or a scope
  change
- `FAILED`: the attempt did not satisfy acceptance criteria or exposed an
  unresolved failure

The orchestrator records status and evidence in temporary run state. A worker
status does not replace final acceptance.

## Recovery Ladder

Use the smallest recovery action that addresses the evidence:

1. supply missing context or repository access
2. clarify the task contract and retry once
3. run a focused debugger investigation
4. serialize work that exposed an ownership or ordering conflict
5. reduce the task scope to the smallest safe unit
6. change from `HERDR` to native subagents or sequential execution when
   isolation is unavailable
7. escalate capability or assign the work to the orchestrator
8. stop and report the unresolved failure when safe progress is not possible

Do not hide a failure by changing the status to `DONE`.

## Retry Limits

- default to one retry per task after an explicit correction
- record each attempt and its reason
- default to at most two review-repair cycles
- stop when the same evidence recurs without a changed hypothesis or approach
- require an explicit orchestrator decision recorded in run state to exceed
  defaults, and set a hard run-specific ceiling before continuing

Retries must not overwrite unrelated user changes or create unbounded worker
activity.

## Common Failures

### Scope Conflict

Stop the conflicting writers, preserve both results, and integrate one at a
time. Update ownership or serialize the remaining work. Never merge blindly.

### Test Failure

Classify the failure as implementation, test, environment, or pre-existing.
Reproduce it, invoke the debugger when root cause is uncertain, and rerun the
smallest affected validation after repair.

### Blocked Worker

Provide the missing context once, then retry only if the blocker is removed.
Otherwise reassign, serialize, change topology, or report the blocker.

### Herdr Unavailable

Fall back to native subagents when isolation is not essential. If separate
worktrees are essential but unavailable, execute sequentially rather than
allowing concurrent writers in one checkout.

### Review Finding

Classify the finding using the blocking matrix in `../contracts/review.md`.
Repair blocking findings, rerun affected checks, and request a focused
re-review. Do not loop on nonblocking low-confidence style opinions.

## Final Failure Reporting

If acceptance is not possible, report:

- original acceptance criteria that remain unmet
- failed or unavailable checks
- relevant worker and retry history
- evidence and likely root cause
- attempted recovery actions
- remaining impact and safest next action

An honest incomplete result is preferable to an unsupported success claim.
