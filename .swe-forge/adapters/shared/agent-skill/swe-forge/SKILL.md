---
name: swe-forge
description: Explicitly run the portable SWE Forge workflow for a supplied ticket.
disable-model-invocation: true
---

The user explicitly invoked SWE Forge. Use `$swe-forge` in Codex or
`/swe-forge` in Cursor. Read `~/.agents/swe-forge/AGENTS.md`,
`~/.agents/swe-forge/SWE-FORGE.md`, then read the ticket procedure at
`~/.agents/swe-forge/.swe-forge/workflows/ticket.md`. Follow canonical stage
loading, keep discovery in the active project, and preserve raw invocation
arguments unchanged. The ticket procedure invokes the shared parser when the
host supplies no normalized facts.
