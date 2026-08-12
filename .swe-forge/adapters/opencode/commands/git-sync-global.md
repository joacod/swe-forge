---
description: Return to the remote default branch after a human merge
---

The user explicitly invoked the `git-sync` delivery action.

Read @~/.config/opencode/swe-forge/.swe-forge/policies/delivery.md and follow
its `sync` action only. If the user supplied `merged` or is confirming a PR
merge, identify the PR for the current task branch and verify the provider
reports `MERGED` before changing the checkout. Confirm that the working tree is
clean, identify the remote default branch, fetch the remote, switch safely, and
run a fast-forward-only pull. Stop on an unmerged, missing, ambiguous, or
unverifiable PR, conflicts, divergence, a detached checkout, or a default branch
already used by another worktree. Never merge, reset, delete the feature branch,
force-update, or treat the user's statement alone as proof of merge.

Raw action arguments:

$ARGUMENTS
