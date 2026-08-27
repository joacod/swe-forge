---
name: swe-forge
description: Explicitly run the portable SWE Forge workflow for a supplied ticket.
disable-model-invocation: true
compatibility: Claude Code user-level skill
---

The user explicitly invoked SWE Forge. Read
`~/.claude/swe-forge/AGENTS.md`, `~/.claude/swe-forge/SWE-FORGE.md`, and
`~/.claude/swe-forge/.swe-forge/workflows/ticket.md`. Follow stage loading
under that support root, never a project-local `.swe-forge/`; keep discovery in
the active project and pass raw arguments unchanged. The procedure invokes the
shared parser when normalized facts are unavailable.

Raw invocation arguments:
$ARGUMENTS
