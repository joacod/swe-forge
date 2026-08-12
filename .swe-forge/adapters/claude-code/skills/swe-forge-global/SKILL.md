---
name: swe-forge
description: Explicitly activate the portable SWE Forge workflow with guided or PR delivery for a user-supplied ticket.
disable-model-invocation: true
argument-hint: "[pr|solo|subagents|herdr] [pr] <ticket>"
compatibility: Claude Code global skill
---

The user explicitly invoked SWE Forge.

Read `~/.claude/swe-forge/AGENTS.md`, `~/.claude/swe-forge/SWE-FORGE.md`, and
`~/.claude/swe-forge/.swe-forge/workflows/ticket.md`. Follow the canonical
workflow, choose the smallest useful execution topology, and load only the
required role, contract, and policy files for the selected delivery mode and
ticket risks. Resolve every canonical relative reference under
`~/.claude/swe-forge/`, never against a project-local `.swe-forge/` tree. Keep
repository discovery rooted in the active project.
Parse and honor an explicit topology or delivery token using the canonical
fallback rules. Default to `GUIDED`; use `pr` only for low-touch delivery and
keep its working spec temporary. Before the first write-tool call, complete the
canonical checkout baseline and protected-branch gate.

Raw invocation arguments (`<ticket>`, `<pr> <ticket>`, or
`<solo|subagents|herdr> [pr] <ticket>`):

$ARGUMENTS
