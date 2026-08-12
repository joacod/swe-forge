---
name: swe-forge
description: Explicitly activate the portable SWE Forge workflow with guided or PR delivery for a user-supplied ticket.
disable-model-invocation: true
argument-hint: "[pr|solo|subagents|herdr] [pr] <ticket>"
compatibility: Claude Code project skill
---

The user explicitly invoked SWE Forge.

Read `AGENTS.md`, `SWE-FORGE.md`, and `.swe-forge/workflows/ticket.md`. Follow
the canonical workflow, choose the smallest useful execution topology, and
load only the required role, contract, and policy files for the selected delivery
mode and ticket risks.
Parse and honor an explicit topology or delivery token using the canonical
fallback rules. Default to `GUIDED`; use `pr` only for low-touch delivery and
keep its working spec temporary. Before the first write-tool call, complete the
canonical checkout baseline and protected-branch gate.

Raw invocation arguments (`<ticket>` or `<solo|subagents|herdr> <ticket>`):

$ARGUMENTS
