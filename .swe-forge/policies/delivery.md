# Delivery and Human-Control Policy

This file is the sole canonical owner of delivery and local-resource
authorization. Other workflow, contract, adapter, example, and documentation
files summarize or reference these rules; they must not redefine them.

## Delivery modes

`GUIDED` preserves human checkpoints. An explicit `isolated` token selects the
requested topology but does not authorize concrete branches, worktrees,
workers, processes, ports, databases, or other resources before they are
planned.

For every guided isolated run, whether explicitly selected or selected through
`AUTO`:

1. Create the isolated plan without creating multiple writable worker
   resources.
2. Present one setup checkpoint containing the integration branch and worktree,
   provider and capability evidence, worker count, worker branches and
   worktrees, current wave, task ownership, shared-artifact ownership, exact
   worker base SHA, integration order, runtime resources, and cleanup plan.
3. `continue` authorizes only that exact local setup.
4. Any material setup change requires another checkpoint.
5. `go` authorizes one reviewed, validated commit on the integration/delivery
   branch.
6. Neither `continue` nor `go` authorizes push, PR creation, publication,
   deployment, or merge.

For normal guided runs, safe setup of one dedicated task branch from a clean
protected default is workflow setup, not delivery authorization. PR mode keeps
per-slice commits separate for reviewability. A normal invocation may implement and validate on that branch, then stops for the
appropriate checkpoint. A dirty, detached, protected, or ambiguous checkout
is preserved and reported rather than reset, stashed, cleaned, or overwritten.

`PR` is the explicit low-touch path. The explicit `PR` token authorizes the
bounded local setup recorded in the accepted plan, worker-local transfer
commits, validated central integration commits, one final integration/delivery
branch push, and one final PR. It never authorizes worker branch pushes, worker
PRs, publication, deployment, force-push, or merge. Publication and merge
remain separate human actions.

## One delivery boundary

A normal run uses one task/delivery branch. An isolated run uses one
integration/delivery branch. The integration branch/worktree identity belongs
in `delivery_checkout` and `integration` state, not duplicated in `delivery`.
Worker branches and worktrees are local-only transfer resources and never a
second delivery boundary. worker branches are local-only
and cannot create PRs.

## Atomic actions

Each action is independently authorized:

| Action | Permits | Never permits |
| --- | --- | --- |
| `worker_setup` | planned local isolated resources after `continue` or PR plan | integration commit, push, PR, publication, deployment, merge |
| `worker_transfer_commit` | local worker transfer commit in the accepted plan | central integration commit, push, PR, publication, deployment, merge |
| `commit` | one reviewed local delivery-branch commit (`go` or PR) | push, PR, publication, deployment, merge |
| `push` | one final integration/delivery branch push in PR mode | worker push, PR, publication, deployment, merge |
| `create_pull_request` | one final PR targeting the protected default | worker PR, merge, publication, deployment |
| `publish` | nothing unless separately authorized | tag/release publication is not part of this ticket |
| `deploy` | nothing unless separately authorized | production or shared-environment effects |
| `merge` | nothing unless separately authorized | all other actions |

Pushing never creates a PR as a side effect. `git-pr` is a separate action.
`git-sync` first verifies that the relevant PR is actually `MERGED`; a user
statement alone is not proof of merge. The provider state is `MERGED` only when
read-only provider evidence confirms it.

## Isolated integration boundary

The isolated workflow owns decomposition, wave barriers, and operational
sequence. The canonical authorization here controls only what the plan and
user action permit. The orchestrator remains accountable for central
integration, final validation, review, delivery, and cleanup. Completion order
never determines integration order. Completion order never determines integration order.
integrated-state validation remains central after every transfer. Conflicts preserve worker resources and return `BLOCKED`
when safe restoration cannot be proven.

## Cleanup

Only run-owned clean worker resources whose accepted commits are mapped may be
removed. Dirty, stale, conflicting, manually removed, or ambiguous resources
remain in place and are reported. Never use `git worktree remove --force`,
`git clean -fd`, hard reset, force deletion, or equivalent destructive cleanup
against ambiguous state. never use forced removal automatically.
