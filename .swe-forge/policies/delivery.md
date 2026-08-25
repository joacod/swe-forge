# Delivery and Human-Control Policy

This file is the sole canonical owner of delivery and local-resource
authorization. Other workflow, contract, adapter, example, and documentation
files summarize or reference these rules; they must not redefine them.

## Delivery modes

`GUIDED` preserves human checkpoints. Safe setup of one dedicated task branch
from a clean protected default is workflow setup, not delivery authorization. A
normal guided invocation may implement and validate on that branch, then stops
at the declared checkpoint. Dirty, detached, protected, or ambiguous checkout
state is preserved and reported rather than reset, stashed, cleaned, or
overwitten.

`PR` is the explicit low-touch path. It authorizes the bounded local setup
recorded in the accepted plan, validated local commits on the one delivery
branch, one final branch push, and one final PR. It never authorizes
publication, deployment, force-push, or merge. Publication and merge remain
separate human actions.

### PR commit plan

Before the first edit, a `PR` working spec records an ordered commit plan. Each
step has one cohesive objective, owned paths, dependencies, targeted
validation, and a repository-appropriate commit subject. The orchestrator
implements one step, runs that step's required checks, and creates its local
delivery commit before starting the next. It must not accumulate all steps and
create one catch-all commit at the end.

A step may contain implementation and tests that are inseparable at the
observable boundary. Do not manufacture commits for unrelated formatting or
ceremonial phases: a one-step ticket correctly produces one commit. Review
repairs are additional atomic commits rather than a squash.

## Repository-aware delivery conventions

SWE Forge owns the workflow; the repository owns its delivery conventions.
Before creating a project-facing artifact, resolve the convention for that
artifact at the boundary where it will be created. Resolution is per artifact:

1. explicit instruction from the user or ticket;
2. explicit repository documentation or instructions, including `AGENTS.md`,
   `CONTRIBUTING.md`, README/development documentation, and documented Git
   rules;
3. repository-native configuration or templates;
4. strong, recurring evidence from recent Git history; and
5. the existing SWE Forge default convention.

Documented rules take precedence over inferred history. Keep discovered
conventions ephemeral; never persist them as project files or delivery metadata.

### Branch naming

Resolve branch naming only immediately before SWE Forge must create a task branch.
Do not spend convention-resolution work on a run that can safely reuse its
existing branch. When no repository convention is confident, use:

```text
<type>/<short-kebab-case-description>
```

Choose `<type>` from the primary ticket outcome, for example `feat`, `fix`,
`docs`, `refactor`, `test`, `chore`, `perf`, `build`, or `ci`. Do not use the
repository name as a generic prefix. If the preferred name is occupied, add a
short unique suffix rather than reusing another task's branch.

### Commit messages

Resolve the commit convention immediately before each delivery commit,
including a review-repair commit. Prefer explicit repository instructions and
then a clear recurring history pattern. When no convention is confident, use a
concise imperative subject of 50 characters or fewer, with 72 characters as the
hard maximum and no terminal punctuation.

### Pull-request composition and templates

Resolve the pull-request title/body convention immediately before composition.
For GitHub repositories, prefer a read-only lookup of the current template on
the remote default branch. Preserve repository headings, ordering, structure,
placeholders, and checklists. If no template exists, use:

```text
Summary:
- <what changed and why it matters>

Validation:
- <relevant checks actually run>

Notes:
- <only material risk, compatibility, rollout, or follow-up; omit when empty>
```

`/git-pr draft` requests a draft pull request without changing normal
`/git-pr` behavior. Draft creation still requires the current branch to be
pushed and does not implicitly commit, merge, or perform unrelated operations.

Never include a receipt, evidence fingerprint, topology, harness, model,
routing, context, internal path, transcript, or working spec in a project-facing
pull request. Receipts remain private run evidence.

## One delivery boundary

A normal run uses one task/delivery branch and one writable delivery checkout.
Delegated writes happen sequentially in that checkout. There is no second
workspace or worker delivery boundary. The root orchestrator owns final
integration, verification, review, delivery, and cleanup.

## Atomic actions

Each action is independently authorized:

| Action | Permits | Never permits |
| --- | --- | --- |
| `commit` | one reviewed local delivery-branch commit (`go` or PR) | push, PR, publication, deployment, merge |
| `push` | one final delivery-branch push in PR mode | PR, publication, deployment, merge |
| `create_pull_request` | one final PR targeting the protected default | merge, publication, deployment |
| `publish` | nothing unless separately authorized | tag/release publication |
| `deploy` | nothing unless separately authorized | production or shared-environment effects |
| `merge` | nothing unless separately authorized | all other actions |

Pushing never creates a PR as a side effect. `git-pr` is a separate action.
`git-sync` first verifies that the relevant PR is actually `MERGED`; a user
statement alone is not proof of merge.

## Cleanup

Only run-owned clean temporary state may be removed. Dirty, stale, conflicting,
manually removed, or ambiguous state remains in place and is reported. Never
use force removal, hard reset, destructive cleanup, or equivalent behavior
against ambiguous state.
