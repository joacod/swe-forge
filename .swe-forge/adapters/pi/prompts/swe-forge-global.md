---
description: Run SWE Forge with automatic or explicit topology routing
argument-hint: "[solo|subagents|herdr] <ticket>"
---

The user explicitly invoked SWE Forge through Pi.

Read `~/.pi/agent/swe-forge/AGENTS.md` and
`~/.pi/agent/swe-forge/SWE-FORGE.md`, then read the V1 procedure at
`~/.pi/agent/swe-forge/.swe-forge/workflows/ticket.md`. Follow the canonical
workflow and load only the role, contract, and policy files required by the
selected topology and ticket risks. Resolve every canonical relative reference
under `~/.pi/agent/swe-forge/`, never against a project-local `.swe-forge/`
tree. Keep repository discovery rooted in the active project.

Parse and honor an explicit topology token using the canonical fallback rules.
Before the first write-tool call, complete the canonical checkout baseline and
protected-branch gate.

Raw invocation arguments (`<ticket>` or `<solo|subagents|herdr> <ticket>`):

$ARGUMENTS
