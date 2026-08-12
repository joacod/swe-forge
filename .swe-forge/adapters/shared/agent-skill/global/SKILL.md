---
name: swe-forge
description: Explicitly activate the portable SWE Forge ticket workflow for a user-supplied software task.
disable-model-invocation: true
---

The user explicitly invoked SWE Forge through the host's explicit skill entry.
Use `$swe-forge` in Codex or `/swe-forge` in Cursor.

Read `~/.agents/swe-forge/AGENTS.md` and
`~/.agents/swe-forge/SWE-FORGE.md`, then read the ticket procedure at
`~/.agents/swe-forge/.swe-forge/workflows/ticket.md`. Follow the canonical
workflow and load only the role, contract, and policy files required by the
selected topology and ticket risks. Resolve every canonical relative
reference under `~/.agents/swe-forge/`, never against a project-local
`.swe-forge/` tree. Keep repository discovery rooted in the active project.
Parse and honor an explicit topology token using the canonical fallback rules.
Before the first write-tool call, complete the canonical checkout baseline and
protected-branch gate.

Treat the user's request after the explicit skill entry as the raw invocation
arguments (`<ticket>` or `<solo|subagents|herdr> <ticket>`). The original ticket
remains authoritative.

