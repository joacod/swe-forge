---
description: Run SWE Forge with automatic or explicit topology routing
agent: build
---

The user explicitly invoked SWE Forge for the ticket below.

Read @AGENTS.md and @SWE-FORGE.md, then read the V1 procedure at
`.swe-forge/workflows/ticket.md`. Follow the canonical workflow and load only
the role, contract, and policy files required by the selected topology and
ticket risks.
Parse and honor an explicit topology token using the canonical fallback rules.
Before the first write-tool call, complete the canonical checkout baseline and
protected-branch gate.

Raw invocation arguments (`<ticket>` or `<solo|subagents|herdr> <ticket>`):

$ARGUMENTS
