---
name: swe-forge
description: Explicitly activate the portable SWE Forge workflow with guided or PR delivery for a user-supplied ticket.
disable-model-invocation: true
argument-hint: "[pr|solo|subagents|isolated] [pr] <ticket>"
compatibility: Claude Code project skill
---

The user explicitly invoked SWE Forge.

Read `AGENTS.md`, `SWE-FORGE.md`, and `.swe-forge/workflows/ticket.md`. Follow
the canonical workflow, choose the smallest useful execution topology, and
load only the required role, contract, and policy files for the selected
delivery mode and ticket risks. Keep repository discovery rooted in the active
project and preserve the raw invocation arguments as the original ticket.

Pass the raw invocation arguments below unchanged to the ticket procedure; it
owns reserved-token parsing, provider migration guidance, and delivery-mode
handling.

$ARGUMENTS
