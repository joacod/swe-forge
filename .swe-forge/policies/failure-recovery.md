# Failure Recovery Policy

## Worker Status

Workers return one of:

- `DONE`: acceptance criteria and assigned validation are satisfied, the
  checkout is clean, and the structured result is complete
- `BLOCKED`: safe progress requires context, access, a decision, isolation, or
  a scope change
- `FAILED`: the attempt did not satisfy acceptance criteria or exposed an
  unresolved failure

A provider lifecycle state is scheduling evidence only. It never replaces a
structured result, Git evidence, validation, or central integration.

## Provider retry boundary

Automatic model or provider retries are not SWE Forge task retries. While a
provider is retrying, do not launch duplicate workers, repeat the plan, or make
a second delivery attempt. Once the call settles, inspect the actual checkout
and evidence state before continuing. If the provider still fails, record the
provider failure separately and use at most the normal one Forge retry after a
changed hypothesis or explicit correction.

## Recovery Ladder

Use the smallest recovery action that addresses the evidence:

1. supply missing context or repository access
2. clarify the task contract and retry once
3. run a focused debugger investigation
4. serialize work that exposed an ownership, environment, or ordering conflict
5. reduce the task scope to the smallest safe unit
6. change an unavailable isolated provider from `HERDR` to `NATIVE`, or fall
   back to sequential `SUBAGENTS`/`SOLO` when isolation is not essential
7. escalate capability or assign the work to the orchestrator
8. stop and report the unresolved failure when safe progress is not possible

Do not hide a failure by changing the status to `DONE`. If required isolation
would be lost, return `BLOCKED` rather than placing concurrent writers in one
checkout.

## Retry Limits

- default to one retry per task after an explicit correction
- record each attempt and its reason
- default to at most two review-repair cycles
- stop when the same evidence recurs without a changed hypothesis or approach
- require an explicit orchestrator decision recorded in run state to exceed
  defaults, and set a hard run-specific ceiling before continuing

Retries must not overwrite unrelated user changes, recreate an ambiguous
worktree, or create unbounded worker activity.

## Common Failures

### Scope Conflict

Stop the conflicting writers, preserve both results, and integrate one at a
time. Update ownership or dependencies, serialize the remaining work, and
rerun affected validation. A conflict between tasks classified as independent
is evidence that the decomposition may be wrong.

### Test Failure

Classify the failure as implementation, test, environment, or pre-existing.
Reproduce it, invoke the debugger when root cause is uncertain, and rerun the
smallest affected validation after repair. A worker cannot declare `DONE` from
code inspection alone.

### Blocked Worker

Provide the missing context once, then retry only if the blocker is removed.
Otherwise reassign, serialize, change provider, change topology, or report the
blocker. Preserve the worker's branch and worktree until its changes are
proven integrated or safely preserved.

### Provider Unavailable

If `NATIVE` cannot provide the required isolated-worker capabilities and the
Herdr ownership guard or provider surface fails, do not fabricate a generic
provider. Fall back to sequential `SUBAGENTS` or `SOLO` when safe. If required
isolation would be lost, return `BLOCKED`. Record requested mode, requested
provider, limitation evidence, selected fallback, and the reason.

### Integration Conflict

Stop safely, preserve the source worker branch and worktree, restore the
integration worktree only to its recorded clean checkpoint using the safest
available Git operation, and re-evaluate ownership and dependencies. Serialize
or recreate the affected task from the current integration head. Never silently
resolve a conflict or use force cleanup against ambiguous state.

### Environment Failure

Inspect setup commands and resource state. Treat ports, databases, Docker
projects, temporary paths, migrations, and shared services as explicit
resources. Allocate unique resources or serialize execution. Migrations and
shared persistent environments require separate authorization. Preserve dirty
or unknown resources and report cleanup status.

### Review Finding

Classify the finding using the blocking matrix in
`../contracts/review.md`. Repair blocking findings, rerun affected checks, and
request a focused re-review. Do not loop on nonblocking low-confidence style
opinions.

## Safe Cleanup

After acceptance, remove only run-owned clean worktrees and safely delete only
integrated local worker branches. Never force-remove a worktree, clean an
ambiguous checkout, delete a worker branch with unintegrated changes, or delete
the integration/delivery branch used for the PR. Removing a Herdr worktree does
not delete its branch. Preserve and report dirty, blocked, or unresolved
resources, processes, provider sessions, and environment resources.

## Final Failure Reporting

If acceptance is not possible, report:

- original acceptance criteria that remain unmet
- failed or unavailable checks
- relevant worker, provider, and retry history
- evidence and likely root cause
- attempted recovery actions
- remaining worktrees, branches, processes, and environment resources
- remaining impact and safest next action

An honest incomplete result is preferable to an unsupported success claim.
