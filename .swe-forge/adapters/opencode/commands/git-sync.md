---
description: Return to the remote default branch after a human merge
---

The user explicitly invoked the `git-sync` delivery action.

Read @.swe-forge/policies/delivery.md and follow its `sync` action only. Confirm
that the working tree is clean, identify the remote default branch, fetch the
remote, switch safely, and run a fast-forward-only pull. Stop on conflicts,
divergence, a detached checkout, or a default branch already used by another
worktree. Never merge, reset, delete the feature branch, force-update, or
assume that PR creation means the PR was merged.

Raw action arguments:

$ARGUMENTS
