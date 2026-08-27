# Delivery and Human-Control Policy

This policy owns checkout, branch, commit, push, PR, merge, cleanup, and
local-resource authorization. Other sources link here.

## Modes

`GUIDED` is manual. When a branch is needed, create it from a clean protected
or default branch. Implement and validate, then stop at the declared human
checkpoint. Approval to continue never authorizes push, PR, publication,
deployment, or merge. Preserve dirty, detached, protected, and ambiguous state.

`PR` is the default low-touch mode. It permits bounded local setup, the commits
needed by the work, one final branch push, and one final PR. It never permits
publication, deployment, force-push, or merge.

Use one coherent commit or several as the work requires; never manufacture
ceremonial commits or predeclare a sequence. A clean committed candidate is its
Git `HEAD`; final validation, review, and delivery use that SHA. A repair is one
additional atomic commit, uses the repair transition, reruns affected
validation, and is not independently re-reviewed.

A PR run ends after the exact locally gated candidate is pushed, one authorized
PR is created, its URL is recorded, and the report is produced. Remote CI is
external follow-up evidence.

## Project-facing artifacts

Resolve conventions in this order:

1. explicit user or ticket instruction;
2. repository instructions and documentation;
3. repository configuration or templates;
4. strong recurring Git history; then
5. these defaults.

Resolve branch naming only when creating a branch; without a convention use
`<type>/<short-kebab-case-description>`. Resolve commit format before each
commit. For GitHub PRs, look up the current remote default-branch template just
before composition and preserve its headings, ordering, placeholders, and
checklists. Without a template use:

```text
Summary:
- <what changed and why>

Validation:
- <checks actually run>

Notes:
- <material risk or follow-up, omit when empty>
```

A PR must not contain topology, harness/model metadata, internal paths,
transcripts, or the working spec. `/git-pr draft` requests a draft; plain
`/git-pr` remains normal/open.

## One delivery boundary

A run owns one task branch and one canonical writable checkout. A host-private
worker worktree, sandbox, overlay, or container is not a second Forge workspace,
branch, or transfer record; its result must be materialized and validated in
the canonical checkout before root acceptance.

## Action authorization

Authorization is per action:

| Action | Permits | Does not permit |
| --- | --- | --- |
| `commit` | one authorized local delivery-branch commit | push, PR, publication, deployment, merge |
| `push` | one final PR-branch push | PR, publication, deployment, merge |
| `create_pull_request` | one PR targeting the protected default | merge, publication, deployment |
| `publish`, `deploy`, `merge` | that action only | every other action |

Branch setup never authorizes commit or push. Push never creates a PR. PR
creation never merges. `git-sync` verifies that the relevant PR is actually
`MERGED`; a user statement is not proof.

## Cleanup

Remove only run-owned clean temporary state. Preserve dirty, stale, conflicting,
manually removed, or ambiguous state. Never force-remove, reset, clean, stash,
overwrite, or deliver against ambiguity.
