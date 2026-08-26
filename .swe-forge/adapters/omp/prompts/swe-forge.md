---
description: Run SWE Forge with PR delivery by default or guided human pauses
---

The user explicitly invoked SWE Forge through OMP. Read
`~/.omp/agent/swe-forge/AGENTS.md`,
`~/.omp/agent/swe-forge/SWE-FORGE.md`, and
`~/.omp/agent/swe-forge/.swe-forge/workflows/ticket.md`; follow canonical
stage loading under that support root, never a project-local `.swe-forge/`.
Keep repository discovery in the active project and pass prompt arguments
unchanged; the ticket bootstrap invokes the shared parser once when OMP has no
normalized facts.

Raw invocation arguments:
$ARGUMENTS
