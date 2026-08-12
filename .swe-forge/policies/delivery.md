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
- create a transient working spec, then implement and validate cohesive slices
  without interactive approval checkpoints
- create one local commit after each slice's required validation passes; keep
  those commits separate so the pull request shows the implementation steps
- after the final quality gates and fresh review pass, push the dedicated branch
  and create a pull request when the required tools are available
- report the pull-request URL and stop; never merge it

The pull request should be easy to scan. Use a short imperative title and a
short-to-medium body with this compact shape:

```text
Summary:
- <what changed and why it matters>
- <important compatibility or behavior note, if any>

Validation:
- <relevant command or manual check>

Notes:
- <only an important risk or follow-up; omit this section when empty>
```

Do not paste the working spec, transcript, or a file-by-file dump into the
description.

`PR` mode does not waive tests, protected-branch rules, scope checks, fresh
review for medium/high-risk work, or the final diff inspection. It only replaces
human checkpoints with an explicit request to continue through pull-request
creation.

## Task Branch Setup

Both delivery modes use one dedicated task branch for the whole run. When the
checkout is clean and currently on the protected remote default branch, the
normal workflow automatically creates a safe non-protected branch from it. The
name should identify the ticket and follow the repository convention, such as
`feat/<ticket-slug>` or `swe-forge/<ticket-slug>`. It may use a short run suffix
when the name already exists. Never silently reuse an existing branch from
another run.

If the checkout is already on a suitable non-protected branch or worktree,
reuse it for every slice in the run. Do not create another branch between
checkpoints or before delivery. If the checkout is dirty, detached,
ambiguous, or cannot be classified safely, stop and ask the user to resolve the
checkout rather than moving or overwriting work. A user-provided branch or
worktree preference may replace the default only when it passes the same safety
gates. An explicit user request may also opt into a different multi-branch or
worktree arrangement; absent that request, keep every slice for the task on this
one branch.

Automatic task-branch setup is workflow authorization only. It permits creating
that one branch and does not permit commits, pushes, pull requests, merges, or
destructive cleanup. Record whether the branch was auto-created, reused, or
provided by the user in run state.

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
provenance. The normal workflow invocation already covers the safe one-branch
setup described above; it does not broaden delivery authorization.

An explicit `PR` delivery token authorizes local per-slice commits after their
required validation, the final reviewed branch push, and pull-request creation.
It does not authorize merge, force-push, publication outside the PR, or
destructive cleanup. If the checkout is dirty, detached, ambiguous, or the
branch setup would overwrite existing work, stop and ask.

## Guided Checkpoints

A checkpoint is a deliberate hand-off, not a failed run. It should include:

- checkpoint number and the next planned slice
- files and behavior changed in the completed slice
- targeted validation and its result
- current `git diff --stat` and any in-scope untracked paths
- assumptions, risks, and requested user action

The user can reply:

- `continue`: implement the next slice without delivery action
- `go`: explicitly authorize a local commit of the current reviewed slice,
  using the commit-message rules below, then continue
- `commit and continue`: the longer equivalent of `go`
- `revise: ...`: repair or reshape the current slice before continuing
- `stop`: leave the reviewed checkout for manual handling

At the final checkpoint, `go` commits the final reviewed slice and then the
run ends; it never implies a push, pull request, or merge. Without `go`, the
agent stops before delivery unless the user explicitly requests the applicable
delivery action. A guided run may therefore end with an accepted local diff and
no commit, push, or PR.

## Commit Messages

For a `go` commit or a PR-mode slice commit:

- stage only the current slice's reviewed files; preserve unrelated or
  pre-existing changes
- follow the repository's existing convention; otherwise use a concise,
  imperative subject of at most 72 characters that names the outcome
- add a short body only when the rationale or an important compatibility note
  would be lost from the subject
- do not use generic subjects such as `update`, `changes`, or `wip`

A repair after review is a separate commit rather than a rewrite of the earlier
slice, unless the user explicitly requests a different history.

## Atomic Delivery Commands

Keep these commands separate so pushing never unexpectedly creates a PR:

1. `git-commit` reviews and commits selected local changes.
2. `git-push` validates and pushes only the current branch. A `create-pr`
   argument is rejected or reported as a follow-up to `/git-pr`; it never
   changes the push action's scope.
3. `git-pr` validates the pushed branch and creates or reports a PR using the
   concise title and body rules above.
4. `git-sync` verifies that the relevant PR is actually merged, then switches
   to the remote default branch and runs a fast-forward-only pull.

Each command must refuse protected/default branches where the action would be
unsafe, preserve unrelated changes, and stop on divergence or conflicts rather
than resetting or force-updating the checkout. The command adapters are thin
loaders for this policy; their syntax may vary by harness.

## Post-Merge Boundary

PR creation is not proof that the PR was merged. Do not automatically switch
branches or pull after creating a PR. When the user says `merged` in the active
run, or invokes `git-sync`, treat that as an explicit request to sync, not as
proof of merge. First identify the PR for the current task branch and verify
its provider state is `MERGED` (for example with the host's supported PR CLI or
API), including the expected default-branch target.

If the PR is open, closed without merge, missing, ambiguous, or its state cannot
be checked, report the evidence and leave the checkout untouched. Only after a
confirmed merge and a clean checkout may `git-sync` fetch, switch to the remote
default branch, and fast-forward-only pull it. Never merge, reset, force-update,
delete the task branch, or assume that the user's statement alone proves the
PR was merged.
