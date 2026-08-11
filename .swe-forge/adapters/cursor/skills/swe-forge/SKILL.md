---
name: swe-forge
description: Explicitly activate the portable SWE Forge ticket workflow for a user-supplied software task.
disable-model-invocation: true
---

The user explicitly invoked SWE Forge through Cursor's `/swe-forge` skill.

Read `AGENTS.md` and `SWE-FORGE.md`, then read the V1 procedure at
`.swe-forge/workflows/ticket.md`. Follow the canonical workflow and load only
the role, contract, and policy files required by the selected topology and
ticket risks. Parse and honor an explicit topology token using the canonical
fallback rules. Before the first write-tool call, complete the canonical
checkout baseline and protected-branch gate. Keep repository discovery rooted
in the active project.

Treat the user's request after `/swe-forge` as the raw invocation arguments
(`<ticket>` or `<solo|subagents|herdr> <ticket>`). The original ticket remains
authoritative.
