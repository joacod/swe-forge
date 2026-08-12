---
description: Return to the remote default branch after a human merge
---

The user explicitly invoked the `git-sync` delivery action.

Read @.swe-forge/policies/delivery.md and follow its `sync` action only. Identify
the PR for the current task branch and verify the provider reports `MERGED`
before changing the checkout; a `merged` argument or user statement is a
request to check, not proof. Confirm that the working tree is clean, identify
the remote default branch, fetch the remote, switch safely, and run a
fast-forward-only pull. Stop on an unmerged, missing, ambiguous, or
unverifiable PR, conflicts, divergence, a detached checkout, or a default branch
already used by another worktree. Never merge, reset, delete the feature branch,
force-update, or treat the user's statement alone as proof of merge.

Raw action arguments:

$ARGUMENTS
