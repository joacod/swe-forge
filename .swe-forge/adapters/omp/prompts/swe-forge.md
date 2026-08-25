---
description: Run SWE Forge with automatic topology and guided or PR delivery
---

The user explicitly invoked SWE Forge through omp.

Read `~/.omp/agent/swe-forge/AGENTS.md` and
`~/.omp/agent/swe-forge/SWE-FORGE.md`, then read the ticket procedure at
`~/.omp/agent/swe-forge/.swe-forge/workflows/ticket.md`. Follow the canonical
workflow and load only the role, contract, and policy files required by the
selected topology, delivery mode, and ticket risks. Resolve every canonical
relative reference under `~/.omp/agent/swe-forge/`, never against a
project-local `.swe-forge/` tree. Keep repository discovery rooted in the
active project and preserve the raw invocation arguments as the original
ticket.

The prompt-template expansion passes the user arguments through `$ARGUMENTS`.
Keep those arguments unchanged and pass them to the ticket procedure. omp has
no verified pre-agent normalized-invocation hook, so the canonical ticket
bootstrap invokes the shared parser exactly once before workflow reasoning.

Raw invocation arguments:
$ARGUMENTS
