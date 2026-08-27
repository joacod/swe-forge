---
name: swe-forge
description: Explicitly run the portable SWE Forge workflow for a supplied ticket.
disable-model-invocation: true
---

The user explicitly invoked SWE Forge. Use `$swe-forge` in Codex or
`/swe-forge` in Cursor. Read `~/.agents/swe-forge/AGENTS.md`,
`~/.agents/swe-forge/SWE-FORGE.md`, then
`~/.agents/swe-forge/.swe-forge/workflows/ticket.md`. Follow stage loading,
keep discovery in the active project, preserve raw arguments, and pass them to
the ticket procedure. The procedure invokes the shared parser when normalized
facts are unavailable.
