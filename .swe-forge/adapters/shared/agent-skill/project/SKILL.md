---
name: swe-forge
description: Explicitly activate the portable SWE Forge ticket workflow for a user-supplied software task.
disable-model-invocation: true
---

The user explicitly invoked SWE Forge through the host's explicit skill entry.
Use `$swe-forge` in Codex or `/swe-forge` in Cursor.

Read `AGENTS.md` and `SWE-FORGE.md`, then read the ticket procedure at
`.swe-forge/workflows/ticket.md`. Follow the canonical workflow and load only
the role, contract, and policy files required by the selected topology and
ticket risks. Parse and honor an explicit topology token using the canonical
fallback rules. Before the first write-tool call, complete the canonical
checkout baseline and protected-branch gate. Keep repository discovery rooted
in the active project.

Treat the user's request after the explicit skill entry as the raw invocation
arguments (`<ticket>` or `<solo|subagents|herdr> <ticket>`). The original ticket
remains authoritative.
