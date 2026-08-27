---
description: Run SWE Forge with PR delivery by default or guided human pauses
argument-hint: "[guided] [ticket]"
---

The user explicitly invoked SWE Forge through Pi. Read
`~/.pi/agent/swe-forge/AGENTS.md`, `~/.pi/agent/swe-forge/SWE-FORGE.md`, and
`~/.pi/agent/swe-forge/.swe-forge/workflows/ticket.md`. Follow stage loading
under that support root, never a project-local `.swe-forge/`; keep discovery in
the active project and pass raw arguments unchanged. The runtime/parser supplies
normalized facts.

Raw invocation arguments:
$ARGUMENTS
