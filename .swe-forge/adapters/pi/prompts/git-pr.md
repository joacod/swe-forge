---
description: Create or report a pull request for the current pushed branch
argument-hint: "[draft|title/body options]"
---

The user explicitly invoked `/git-pr` through Pi. Read
`~/.pi/agent/swe-forge/.swe-forge/policies/delivery.md` and perform only
`create_pull_request`. Pass raw arguments unchanged; standalone `draft` requests
a draft. Do not perform another delivery action.

User-provided action arguments:
$ARGUMENTS
