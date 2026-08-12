---
description: Run SWE Forge with automatic topology and guided or PR delivery
agent: build
---

The user explicitly invoked SWE Forge.

Read @~/.config/opencode/swe-forge/AGENTS.md and
@~/.config/opencode/swe-forge/SWE-FORGE.md, then read the ticket procedure at
`~/.config/opencode/swe-forge/.swe-forge/workflows/ticket.md`. Follow the
canonical workflow and load only the role, contract, and policy files required
by the selected topology, delivery mode, and ticket risks. Resolve every
canonical relative reference under `~/.config/opencode/swe-forge/`, never
against a project-local `.swe-forge/` tree. Keep repository discovery rooted in
the active project and preserve the raw invocation arguments as the original
ticket.

Raw invocation arguments (`<ticket>`, `<pr> <ticket>`, or
`<solo|subagents|isolated> [pr] <ticket>`):

Supported isolated forms include `/swe-forge isolated <ticket>`,
`/swe-forge isolated pr <ticket>`, and `/swe-forge pr isolated <ticket>`.
A leading `herdr` is not a topology alias; use `isolated` and request Herdr
as a separate execution-provider preference.

$ARGUMENTS
