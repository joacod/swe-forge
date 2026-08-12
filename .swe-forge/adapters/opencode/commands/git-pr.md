---
description: Create or report a pull request for the current pushed branch
---

The user explicitly invoked the `git-pr` delivery action.

Read @.swe-forge/policies/delivery.md and follow its `create_pull_request`
action only. Verify the current branch is non-protected, clean, pushed, and
has a valid protected default-branch target. Reuse an existing PR when one is
already open; otherwise show or generate the title and body and create the PR
with the host's supported CLI. Never merge, approve, close, force-push, or
switch to the default branch as a side effect.

Raw action arguments:

$ARGUMENTS
