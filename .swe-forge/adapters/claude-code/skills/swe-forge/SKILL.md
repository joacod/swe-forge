---
name: swe-forge
description: Explicitly run the portable SWE Forge workflow for a supplied ticket.
disable-model-invocation: true
compatibility: Claude Code user-level skill
---

The user explicitly invoked SWE Forge. Read
`~/.claude/swe-forge/AGENTS.md`,
`~/.claude/swe-forge/SWE-FORGE.md`, and
`~/.claude/swe-forge/.swe-forge/workflows/ticket.md`. Follow canonical stage
loading under that support root, never a project-local `.swe-forge/`; keep
repository discovery in the active project and pass raw
invocation arguments unchanged to the ticket procedure; its bootstrap invokes
the shared parser once when normalized facts are unavailable.

Raw invocation arguments:
$ARGUMENTS
