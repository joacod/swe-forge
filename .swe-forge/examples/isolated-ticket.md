# Example: Isolated Ticket With a Provider

This example shows a ticket where isolated worktrees are justified. The
provider is optional and must be selected only after hard eligibility and
capability proof. Replace provider commands with the installed provider's
current documented operations.

## Ticket

```text
Add an order-cancellation flow to the storefront.

The API must expose cancellation with authorization and state validation. The
web application must add the customer action, confirmation UI, and refresh
behavior. API and web work can proceed independently after the cancellation
contract is agreed. Both packages have separate development servers.
```

## Discovery and routing

Evidence shows separate API and web ownership, independent focused checks, a
stable cancellation contract foundation, unique runtime resources, and one
central integrator. The hard eligibility gate passes and parallel value is
beneficial.

```text
requested_mode: AUTO
execution_mode: ISOLATED
requested_provider: HERDR
execution_provider: HERDR
provider_reason: Herdr capability proof covers dedicated worktrees, exact bases, structured results, lifecycle control, and central integration for this run.
parallel_strategy: COMPOSE
integration_strategy: CHERRY_PICK
requested_delivery: DEFAULT
delivery_mode: GUIDED
isolated_eligibility: status: eligible; evidence_ref: routing-plan; blockers: []
parallel_value: status: beneficial; rationale: API and web servers reduce critical path; overridden_by_user: false
fallback_used: no
```

If any hard condition or mandatory provider capability is missing, do not launch
concurrent writers. Fall back safely to sequential `SUBAGENTS`/`SOLO` or return
`BLOCKED` when required isolation would be lost.

## Setup checkpoint

Before creating multiple writable resources, the guided checkpoint shows:

```text
integration branch/worktree: feat/order-cancellation / <absolute path>
checkout_baseline:
  path: <absolute integration worktree path>
  head: <exact worker base SHA>
  branch_setup: auto-created
provider and capability evidence: HERDR / <evidence references>
worker count: 2
worker branches/worktrees: worker/cancel-order-api, worker/cancel-order-web / <paths>
current wave: 1
ownership: services/orders/** and apps/storefront/**
shared artifacts: cancellation contract and root exports -> orchestrator
worker base SHA: <one exact foundation SHA>
integration order: cancel-order-api, then cancel-order-web
runtime resources: unique API/UI ports and temporary test databases
cleanup: clean mapped workers only; preserve ambiguity
```

`continue` authorizes only this exact setup. A material change needs another
checkpoint. `go` authorizes one reviewed central commit. Neither authorizes
push, PR creation, publication, deployment, or merge. In `PR`, the accepted
plan authorizes bounded setup, worker-local transfer commits, validated central
commits, one final push, and one final PR; it never authorizes worker pushes,
publication, deployment, or merge.

## Machine-valid worker result

Each writable worker returns the fixed bundle:

```text
result/meta.tsv
result/commits.txt
result/files.txt
result/validations.tsv
result/scope-exceptions.txt
result/staged.txt
result/unstaged.txt
result/untracked.txt
result/resources.tsv
```

`meta.tsv` includes schema version, task, status, provider, branch, worktree,
full base/head SHAs, and candidate fingerprint. The isolated Git/evidence guard
rejects missing/repeated/malformed fields, unsupported control characters,
undeclared commits/files, wrong base or worktree identity, dirty state, scope
violations, missing worker checks, unavailable required checks, stale
fingerprints, and unauthorized worker remote refs. Provider completion alone is
not eligibility.

## Central integration

Workers may complete in either order. The orchestrator waits for the wave,
then integrates API before web because that is the recorded order. The guard
rejects B while A is next. For each unit, the orchestrator records a clean
checkpoint, applies `cherry-pick --no-commit`, runs integrated-state validation,
creates the central commit, and records a full source-to-integration mapping.

On conflict or interruption, the guard records the pre-apply checkpoint,
preserves worker resources, aborts only the operation it can prove it started,
and returns `BLOCKED` if restoration cannot be proven. It never hard-resets or
force-removes ambiguous state.

## Verification and cleanup

Run worker checks, integrated checks after each unit, wave checks, complete
repository checks, and fresh review. The receipt is generated only from exact
final `HEAD`, final fingerprint, and final evidence. It remains private run
evidence and is never copied into the project-facing PR description, including
when the repository is SWE Forge itself. Read-only receipt verification detects
a later commit or same-path content mutation.

After one final PR, the guard can prove cleanup eligibility only when accepted
commits are mapped and the worker is clean and observable. Remove only run-owned
clean worktrees and safely delete local worker branches; preserve dirty,
stale,
conflicting, or manually removed resources. Keep the integration branch.
