---
description: Run SWE Forge with PR delivery by default or guided checkpoints
argument-hint: "[guided|pr|solo|subagents] [ticket]"
---

The user explicitly invoked SWE Forge through Pi. Read
`~/.pi/agent/swe-forge/AGENTS.md`,
`~/.pi/agent/swe-forge/SWE-FORGE.md`, and
`~/.pi/agent/swe-forge/.swe-forge/workflows/ticket.md`; follow the canonical
load map under that support root, never a project-local `.swe-forge/`. Keep
repository discovery in the active project and pass raw invocation arguments
unchanged to the ticket procedure; its parser/bootstrap supplies normalized
facts.

Raw invocation arguments:
$ARGUMENTS
