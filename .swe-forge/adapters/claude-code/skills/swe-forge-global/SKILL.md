---
name: swe-forge
description: Explicitly activate the portable SWE Forge workflow for a user-supplied software ticket.
disable-model-invocation: true
argument-hint: "[solo|subagents|herdr] <ticket>"
compatibility: Claude Code global skill
---

The user explicitly invoked SWE Forge.

Read `~/.claude/swe-forge/AGENTS.md`, `~/.claude/swe-forge/SWE-FORGE.md`, and
`~/.claude/swe-forge/.swe-forge/workflows/ticket.md`. Follow the canonical
workflow, choose the smallest useful execution topology, and load only the
required role, contract, and policy files.

Raw invocation arguments (`<ticket>` or `<solo|subagents|herdr> <ticket>`):

$ARGUMENTS
