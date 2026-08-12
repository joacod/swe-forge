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
load only the required role, contract, and policy files for the selected delivery
mode and ticket risks. Keep repository discovery rooted in the active project
and preserve the raw invocation arguments as the original ticket.

Raw invocation arguments (`<ticket>`, `<pr> <ticket>`, or
`<solo|subagents|isolated> [pr] <ticket>`):

Supported isolated forms include `/swe-forge isolated <ticket>`,
`/swe-forge isolated pr <ticket>`, and `/swe-forge pr isolated <ticket>`.
A leading `herdr` is not a topology alias; use `isolated` and request Herdr
as a separate execution-provider preference.

$ARGUMENTS
