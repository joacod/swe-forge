---
name: swe-forge
description: Explicitly activate the portable SWE Forge ticket workflow for a user-supplied software task.
disable-model-invocation: true
---

The user explicitly invoked SWE Forge through Cursor's `/swe-forge` skill.

Read `~/.cursor/swe-forge/AGENTS.md` and
`~/.cursor/swe-forge/SWE-FORGE.md`, then read the V1 procedure at
`~/.cursor/swe-forge/.swe-forge/workflows/ticket.md`. Follow the canonical
workflow and load only the role, contract, and policy files required by the
selected topology and ticket risks. Resolve every canonical relative
reference under `~/.cursor/swe-forge/`, never against a project-local
`.swe-forge/` tree. Keep repository discovery rooted in the active project.
Parse and honor an explicit topology token using the canonical fallback rules.
Before the first write-tool call, complete the canonical checkout baseline and
protected-branch gate.

Treat the user's request after `/swe-forge` as the raw invocation arguments
(`<ticket>` or `<solo|subagents|herdr> <ticket>`). The original ticket remains
authoritative.
