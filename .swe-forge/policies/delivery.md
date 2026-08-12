# Delivery and Human-Control Policy

## Objective

Separate implementation quality from repository delivery actions. SWE Forge can
help implement and verify a change, but commit, push, pull-request creation,
and post-merge synchronization are distinct actions with distinct
authorization.

## Delivery Modes

`GUIDED` is the default. It optimizes for small reviewable increments:

- split implementation into cohesive review slices when the ticket is large
- stop at a checkpoint after each slice's validation
- report the slice, diff boundary, evidence, assumptions, and next slice
- wait for the user to say `continue`, `revise`, or explicitly authorize a
  commit before proceeding
- never infer commit, push, pull-request, or merge authorization from approval
  of a code slice

`PR` is opt-in (`/swe-forge pr <ticket>`). It optimizes for low-touch delivery:

- run the brief alignment interview when the ticket is underspecified
- create a transient working spec, then implement, verify, and independently
  review without interactive slice checkpoints
- after all required gates pass, commit the reviewed change, push its dedicated
  branch, and create a pull request when the required tools and authorization
  are available
- report the pull-request URL and stop; never merge it

`PR` mode does not waive tests, protected-branch rules, scope checks, fresh
review for medium/high-risk work, or the final diff inspection. It only replaces
human checkpoints with an explicit request to continue through pull-request
creation.

## Action Authorization

The following actions are independent:

| Action | What it permits | What it never permits |
| --- | --- | --- |
| `commit` | create a local commit from reviewed selected changes | push, PR, merge |
| `push` | push the current non-protected branch to its remote | PR, merge |
| `create_pull_request` | create or report a PR targeting the protected default branch | merge, close, approve |
| `sync` | fetch, switch to the selected default branch, and fast-forward it | merge, reset, delete branches |
| `merge` | merge a PR | anything else unless separately stated |

An explicit `/git-commit`, `/git-push`, `/git-pr`, or `/git-sync` command
carries authorization only for its named action. A later natural-language
instruction may authorize one named action and must be recorded with its
provenance.

An explicit `PR` delivery token is a user request to continue through local
commit, branch push, and pull-request creation after verification and review.
When starting from a clean protected default branch, it may also authorize
creating one dedicated non-protected branch with a safe generated name. It does
not authorize merge, force-push, publication outside the PR, or destructive
cleanup. If the checkout is dirty, detached, ambiguous, or the branch setup
would overwrite existing work, stop and ask.

## Guided Checkpoints

A checkpoint is a deliberate hand-off, not a failed run. It should include:

- checkpoint number and the next planned slice
- files and behavior changed in the completed slice
- targeted validation and its result
- current `git diff --stat` and any in-scope untracked paths
- assumptions, risks, and requested user action

The user can reply:

- `continue`: implement the next slice without delivery action
- `commit and continue`: explicitly authorize the current reviewed slice to be
  committed, then continue
- `revise: ...`: repair or reshape the current slice before continuing
- `stop`: leave the reviewed checkout for manual handling

At the final checkpoint, the agent stops before delivery unless the user
explicitly requests the applicable delivery action. A guided run may therefore
end with an accepted local diff and no commit, push, or PR.

## Atomic Delivery Commands

Keep these commands separate so pushing never unexpectedly creates a PR:

1. `git-commit` reviews and commits selected local changes.
2. `git-push` validates and pushes only the current branch. A `create-pr`
   argument is rejected or reported as a follow-up to `/git-pr`; it never
   changes the push action's scope.
3. `git-pr` validates the pushed branch and creates or reports a PR.
4. `git-sync` is used after the human merges the PR; it switches to the remote
   default branch and runs a fast-forward-only pull.

Each command must refuse protected/default branches where the action would be
unsafe, preserve unrelated changes, and stop on divergence or conflicts rather
than resetting or force-updating the checkout. The command adapters are thin
loaders for this policy; their syntax may vary by harness.

## Post-Merge Boundary

PR creation is not proof that the PR was merged. Do not automatically switch
branches or pull after creating a PR. Once the user confirms the human merge,
run the explicit `git-sync` action (or equivalent host command) to return to the
remote default branch and bring it up to date.
