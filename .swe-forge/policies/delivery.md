# Delivery and Human-Control Policy

This policy is the sole owner of checkout, branch, commit, push, PR, cleanup,
and local-resource authorization. Other files reference it.

## Modes

`GUIDED` is the exceptional manual mode. When a branch is needed, create one
from a clean protected/default branch; branch setup is not delivery
authorization. Implement and validate, then stop at the declared checkpoint.
Approval to continue or go never authorizes push, PR creation, publication,
deployment, or merge. Dirty, detached, protected, and ambiguous state is
preserved and reported.

`PR` is the default low-touch mode. It permits the bounded local setup,
validated local commits, one final push, and one final PR. It never permits
publication, deployment, force-push, or merge.

During implementation, choose one coherent commit or several as the work
requires. Do not manufacture ceremonial commits or predeclare a sequence. Each
checkpoint binds its candidate, exact path scope, targeted validation, and
materializing `commit-slice`. A review-repair commit is one additional atomic
commit, uses `--review-repair`, and does not trigger another review.

A PR run ends synchronously after the exact locally gated candidate is pushed,
one authorized PR is created, its URL is recorded, and the private receipt and
report are generated. Remote CI is external follow-up evidence.

## Repository conventions

Resolve each project-facing artifact at its boundary, in this order:

1. explicit user or ticket instruction;
2. repository instructions and documentation;
3. repository configuration or templates;
4. a strong recurring Git-history convention; then
5. the defaults below.

Do not persist discovered conventions. Resolve branch naming only when creating
a branch. Without a convention use `<type>/<short-kebab-case-description>`;
resolve commit format immediately before each commit. For a GitHub PR, prefer a
read-only lookup of the current remote default branch template immediately
before composition. Preserve its headings, ordering, placeholders, and
checklists. Without a template use:

```text
Summary:
- <what changed and why>

Validation:
- <checks actually run>

Notes:
- <material risk or follow-up, omit when empty>
```

A project-facing PR never includes receipts, evidence fingerprints, topology,
harness/model metadata, internal paths, transcripts, or a working spec. `/git-pr
draft` requests a draft; plain `/git-pr` remains normal/open behavior.

## One delivery boundary

A run owns one task branch and one canonical writable delivery checkout. A host
may execute a worker in a private worktree, sandbox, overlay, container, or
other physical environment, but the result must be materialized and validated
in the canonical checkout before root acceptance. No second Forge workspace,
worker branch, or transfer record is created.

## Action authorization

Authorization is per action:

| Action | Permits | Does not permit |
| --- | --- | --- |
| `commit` | one authorized local delivery-branch commit | push, PR, publication, deployment, merge |
| `push` | one final PR-branch push | PR, publication, deployment, merge |
| `create_pull_request` | one PR targeting the protected default | merge, publication, deployment |
| `publish`, `deploy`, `merge` | only that separately authorized action | every other action |

Branch setup never implies commit or push authorization. Pushing never creates a
PR. `git-sync` first verifies that the relevant PR is actually `MERGED`; a user
statement alone is not proof.

## Cleanup

Remove only run-owned clean temporary state. Preserve dirty, stale, conflicting,
manually removed, or ambiguous state and report it. Never force-remove, reset,
clean, stash, overwrite, or deliver against ambiguous state.
