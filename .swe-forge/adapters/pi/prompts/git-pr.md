---
description: Create or report a pull request for the current pushed branch
argument-hint: "[title/body options]"
---

The user explicitly invoked the `/git-pr` delivery action through Pi.

Read `~/.pi/agent/swe-forge/.swe-forge/policies/delivery.md` and follow its
`create_pull_request` action only. Apply that action to the user-provided
arguments below; keep this prompt as a thin loader and do not perform another
delivery action.

User-provided action arguments:
$ARGUMENTS
