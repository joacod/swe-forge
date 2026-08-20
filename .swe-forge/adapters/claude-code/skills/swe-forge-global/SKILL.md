---
name: swe-forge
description: Explicitly activate the portable SWE Forge workflow with guided or PR delivery for a user-supplied ticket.
disable-model-invocation: true
compatibility: Claude Code global skill
---

The user explicitly invoked SWE Forge.

Read `~/.claude/swe-forge/AGENTS.md`, `~/.claude/swe-forge/SWE-FORGE.md`, and
`~/.claude/swe-forge/.swe-forge/workflows/ticket.md`. Follow the canonical
workflow, choose the smallest useful execution topology, and load only the
required role, contract, and policy files for the selected delivery mode and
ticket risks. Resolve every canonical relative reference under
`~/.claude/swe-forge/`, never against a project-local `.swe-forge/` tree. Keep
repository discovery rooted in the active project and preserve the raw
invocation arguments as the original ticket.

Pass the raw invocation arguments below unchanged to the ticket procedure; it
owns reserved-token parsing, provider migration guidance, and delivery-mode
handling.

$ARGUMENTS
