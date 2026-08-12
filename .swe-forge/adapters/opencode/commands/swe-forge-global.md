---
description: Run SWE Forge with automatic topology and guided or PR delivery
agent: build
---

The user explicitly invoked SWE Forge.

Read @~/.config/opencode/swe-forge/AGENTS.md and
@~/.config/opencode/swe-forge/SWE-FORGE.md, then read the ticket procedure at
`~/.config/opencode/swe-forge/.swe-forge/workflows/ticket.md`. Follow the
canonical workflow and load only the role, contract, and policy files required
by the selected topology, delivery mode, and ticket risks. Resolve every canonical relative
reference under `~/.config/opencode/swe-forge/`, never against a project-local
`.swe-forge/` tree. Keep repository discovery rooted in
the active project.
Parse and honor an explicit topology or delivery token using the canonical
fallback rules. Default to `GUIDED`; use `pr` only for low-touch delivery and
keep its working spec temporary. Before the first write-tool call, complete the
canonical checkout baseline and protected-branch gate.

Raw invocation arguments (`<ticket>`, `<pr> <ticket>`, or
`<solo|subagents|herdr> [pr] <ticket>`):

$ARGUMENTS
