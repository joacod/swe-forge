---
description: Run SWE Forge with automatic topology and guided or PR delivery
agent: build
---

The user explicitly invoked SWE Forge for the ticket below.

Read @AGENTS.md and @SWE-FORGE.md, then read the ticket procedure at
`.swe-forge/workflows/ticket.md`. Follow the canonical workflow and load only
the role, contract, and policy files required by the selected topology, delivery
mode, and ticket risks. Keep repository discovery rooted in the active project
and preserve the raw invocation arguments as the original ticket.

Raw invocation arguments (`<ticket>`, `<pr> <ticket>`, or
`<solo|subagents|herdr> [pr] <ticket>`):

$ARGUMENTS
