# Delivery and Human-Control Policy

## Objective

Separate implementation quality from repository delivery actions. SWE Forge can
help implement and verify a change, but commit, push, pull-request creation,
and post-merge synchronization are distinct actions with distinct
authorization. A ticket has one delivery boundary. For `ISOLATED`, that
boundary is one integration/delivery branch; worker branches are local
transfer resources only.

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
- create per-slice commits after each slice's required validation passes; keep
  those commits separate so the pull request shows the implementation steps
- for `ISOLATED`, create final integration commits centrally after each accepted
  worker unit; never push worker branches or create worker PRs
- after the final quality gates and fresh review pass, push the one dedicated
  delivery branch and create one pull request when the required tools are
  available
- report the pull-request URL and stop; never merge it

The pull request should be easy to scan. Use a short, capitalized, imperative
title without terminal punctuation and a short-to-medium body with this compact
shape:

```text
Summary:
- <what changed and why it matters>
- <important compatibility or behavior note, if any>

Validation:
- <relevant command or manual check>

Notes:
- <only an important risk or follow-up; omit this section when empty>
```

Apply the same title discipline as a commit subject: capitalize the first
word, use the imperative mood, omit terminal punctuation, target 50 characters
or fewer, and treat 72 as the hard maximum. The `Summary` explains the
outcome and why it matters, `Validation` names evidence a reviewer can
reproduce, and `Notes` captures only material risks or follow-ups. Keep prose
and bullets readable at about 72 characters where the provider permits it. Put
issue references at the bottom using the repository's established syntax, such
as `Refs: #123` or `Fixes: #123`, and use closing keywords only when closure is
intentional.

Do not paste the working spec, transcript, implementation diary, or a
file-by-file dump into the description.

`PR` mode does not waive tests, protected-branch rules, scope checks, fresh
review for medium/high-risk work, or the final diff inspection. It only replaces
human checkpoints with an explicit request to continue through pull-request
creation.

## One-Branch Boundary

For normal `SOLO` and `SUBAGENTS` runs, both delivery modes use one dedicated task branch for the run, which is also the delivery branch for the whole run.
When the checkout is clean and
currently on the protected remote default branch, the normal workflow
automatically creates a safe non-protected branch from it. The name should
identify the ticket and follow the repository convention, such as
`feat/<ticket-slug>` or `swe-forge/<ticket-slug>`. It may use a short run suffix
when the name already exists. Never silently reuse an existing branch from
another run.

For `ISOLATED`, replace the normal task-branch invariant with:

> One integration and delivery branch for the entire ticket.

The orchestrator leaves the user's original checkout untouched, creates one
dedicated integration worktree, and creates or reuses one safe non-protected
integration/delivery branch. The integration worktree belongs exclusively to
the orchestrator. Bounded worker branches and worktrees may be created locally
when tasks become ready, but they are ephemeral, never pushed, and never used
for worker PRs. Push only the integration branch and create exactly one final
PR. Never merge automatically. Include the run ID and task ID in namespaced
branch and worktree names.

If the checkout is already on a suitable non-protected branch or worktree,
reuse it for every normal slice. Do not create another normal delivery branch
between checkpoints or before delivery. If the checkout is dirty, detached,
ambiguous, or cannot be classified safely, stop and ask the user to resolve the
checkout rather than moving or overwriting work. A user-provided branch or
worktree preference may replace the default only when it passes the same safety
gates. An explicit user request may opt into the bounded isolated arrangement;
absent that request, keep every normal slice for the task on one branch. If the
request is ambiguous, ask before creating additional branches or worktrees.

Automatic normal task-branch setup is workflow authorization only. It permits
creating that one branch and does not permit commits, pushes, pull requests,
merges, or destructive cleanup. The isolated workflow separately records
integration-worktree and worker-resource setup authorization. Record whether
each resource was auto-created, reused, or provided by the user.

## Action Authorization

The following actions are independent:

| Action | What it permits | What it never permits |
| --- | --- | --- |
| `commit` | create a local commit from reviewed selected changes | push, PR, merge |
| `worker_transfer_commit` | create a local worker commit used for central transfer | integration commit, push, PR, merge |
| `push` | push only the current non-protected integration/delivery branch | worker branch push, PR, merge |
| `create_pull_request` | create or report one PR targeting the protected default branch | worker PR, merge, close, approve |
| `sync` | fetch, switch to the selected default branch, and fast-forward it | merge, reset, delete branches |
| `merge` | merge a PR | anything else unless separately stated |

An explicit `/git-commit`, `/git-push`, `/git-pr`, or `/git-sync` command
carries authorization only for its named action. A later natural-language
instruction may authorize one named action and must be recorded with its
provenance. The normal workflow invocation already covers safe one-branch
setup. It does not broaden delivery authorization.

An explicit `isolated` topology token authorizes the bounded local integration
worktree, planned worker branches/worktrees, and worker-local transfer commits
needed by the isolated workflow. It does not authorize integration-branch
commits, pushes, PRs, or merges. In `GUIDED`, the user must confirm planned
setup with `continue` and authorize each integration-branch commit with `go`.

An explicit `PR` delivery token authorizes validated local per-slice or central
integration commits, the final reviewed integration-branch push, and one
pull-request creation after all gates pass. It does not authorize worker branch
pushes, worker PRs, force-push, publication outside the PR, deployment, or
merge. If branch setup would overwrite existing work, stop and ask.

## Guided Checkpoints

A checkpoint is a deliberate hand-off, not a failed run. It should include:

- checkpoint number and the next planned slice or integration unit
- files and behavior changed in the completed slice
- targeted validation and its result
- current `git diff --stat` and any in-scope untracked paths
- for `ISOLATED`, worker result, proposed diff boundary, base SHA, provider,
  integration order, shared artifacts, and environment resources
- assumptions, risks, and requested user action

For an automatic `ISOLATED` selection, the first setup checkpoint must show
worker count, wave, task ownership, provider, worktree plan, integration order,
shared-artifact owners, and environment resources. `continue` authorizes only
that planned local setup.

The user can reply:

- `continue`: implement the next slice or perform the planned local setup
- `go`: explicitly authorize a local commit of the current reviewed slice or
  accepted integration unit, using the commit-message rules below, then
  continue
- `commit and continue`: the longer equivalent of `go`
- `revise: ...`: repair or reshape the current slice before continuing
- `stop`: leave the reviewed checkout and any unresolved resources for manual
  handling

At the final checkpoint, `go` commits the final reviewed integration slice and
then the run ends; it never implies a push, pull request, or merge. Without
`go`, a guided run stops before delivery unless the user explicitly requests
the applicable delivery action. A guided isolated run preserves worker
resources when clean ownership or integration proof is absent.

## Commit Messages

For a `go` commit or a PR-mode slice/integration commit:

- stage only the current reviewed slice or integration unit; preserve unrelated
  or pre-existing changes
- write a concise subject that names the outcome. Target 50 characters or
  fewer, treat 72 as the hard maximum, capitalize the first word, use the
  imperative mood, and do not end with a period. The subject should complete
  the sentence, `If applied, this commit will ...`.
- if a body is needed, separate it from the subject with one blank line
- use the body to explain what changed and why rather than narrating how the
  code works
- include compatibility constraints or unintuitive side effects when they
  would otherwise be lost
- when an issue or external reference matters, add it after a blank line using
  repository conventions; never invent references
- keep each PR-mode slice and each review repair atomic rather than rewriting
  earlier commits
- do not use generic subjects such as `update`, `changes`, or `wip`

Worker transfer commits may use repository-appropriate messages, but they are
not final delivery commits and must be mapped to the central integration
commit.

## Atomic Delivery Commands

Keep these commands separate so pushing never unexpectedly creates a PR:

1. `git-commit` reviews and commits selected local changes.
2. `git-push` validates and pushes only the current integration/delivery branch.
   It rejects worker branches and never creates a PR as a side effect.
3. `git-pr` validates the pushed integration/delivery branch and creates or
   reports exactly one PR using the concise title and body rules above.
4. `git-sync` verifies the relevant PR is actually merged, then switches to the
   remote default branch and runs a fast-forward-only pull.

Each command must refuse protected/default branches where the action would be
unsafe, preserve unrelated changes, and stop on divergence or conflicts rather
than resetting or force-updating the checkout. The command adapters are thin
loaders for this policy; their syntax may vary by harness.

## Integrated Validation Boundary

For isolated execution, the orchestrator must:

- validate each accepted worker result against its task contract and exact base
- apply worker changes to the integration checkout without blindly merging a
  branch or copying a worktree
- run required integrated-state validation before creating the final
  integration commit
- record the source-to-integration commit mapping
- run wave-level validation after every wave
- run all applicable repository checks and fresh review before push or PR
- preserve a clean checkpoint and stop safely on conflicts or ambiguous state

Completion order never determines integration order. Use dependencies and the
recorded `integration_order`. A conflict among supposedly independent tasks is
evidence to re-evaluate the decomposition, not a reason for silent resolution.

## Cleanup Boundary

After final acceptance and PR creation:

- verify every accepted source commit has an integration mapping
- verify every worker worktree is clean
- remove only run-owned clean worktrees
- never use forced removal automatically
- delete integrated worker branches only with safe deletion
- remember that removing a Herdr worktree does not delete its branch
- preserve and report dirty, blocked, or unresolved resources
- keep the integration branch for the PR
- record all remaining worktrees, branches, processes, and environment resources

Never use `git worktree remove --force`, `git clean -fd`, or equivalent
force-cleanup against ambiguous state. A dirty or unresolved resource remains
in place and is reported.

## Post-Merge Boundary

PR creation is not proof that the PR was merged. Do not automatically switch
branches or pull after creating a PR. When the user says `merged` in the active
run, or invokes `git-sync`, treat that as an explicit request to sync, not as
proof of merge. First identify the PR for the current integration/delivery
branch and verify the provider state is `MERGED` (for example with the host's
supported PR CLI or API), including the expected default-branch target.

If the PR is open, closed without merge, missing, ambiguous, or its state cannot
be checked, report the evidence and leave the checkout untouched. Only after a
confirmed merge and a clean checkout may `git-sync` fetch, switch to the remote
default branch, and fast-forward-only pull it. Never merge, reset, force-update,
delete branches, or assume that the user's statement alone proves the PR was
merged.
