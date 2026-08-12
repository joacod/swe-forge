---
description: Push the current reviewed branch without creating a PR
---

The user explicitly invoked the `git-push` delivery action.

Read @~/.config/opencode/swe-forge/.swe-forge/policies/delivery.md and follow
its `push` action only. Verify a clean non-protected branch, upstream/divergence
state, and the remote target before pushing. Stop on uncommitted changes,
conflicts, or a rejected update. A `force` or `-f` argument requires the
policy's explicit `--force-with-lease` safeguards. Pushing never creates a PR as
a side effect. A `create-pr` argument is a follow-up for `git-pr`, not part of this action.
Do not ask whether to create one; do not create, merge, or sync a PR as part of
this action.

Raw action arguments:

$ARGUMENTS
