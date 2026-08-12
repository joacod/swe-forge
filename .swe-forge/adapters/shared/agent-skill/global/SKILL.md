---
name: swe-forge
description: Explicitly activate the portable SWE Forge ticket workflow with guided or PR delivery for a user-supplied software task.
disable-model-invocation: true
---

The user explicitly invoked SWE Forge through the host's explicit skill entry.
Use `$swe-forge` in Codex or `/swe-forge` in Cursor.

Read `~/.agents/swe-forge/AGENTS.md` and
`~/.agents/swe-forge/SWE-FORGE.md`, then read the ticket procedure at
`~/.agents/swe-forge/.swe-forge/workflows/ticket.md`. Follow the canonical
workflow and load only the role, contract, and policy files required by the
selected topology, delivery mode, and ticket risks. Resolve every canonical
relative reference under `~/.agents/swe-forge/`, never against a project-local
`.swe-forge/` tree. Keep repository discovery rooted in the active project and
preserve the raw invocation arguments as the original ticket.

Treat the user's request after the explicit skill entry as the raw invocation
arguments (`<ticket>`, `<pr> <ticket>`, or `<solo|subagents|isolated> [pr] <ticket>`). The original ticket
remains authoritative. Supported isolated forms include `/swe-forge isolated
<ticket>`, `/swe-forge isolated pr <ticket>`, and `/swe-forge pr isolated
<ticket>`. A leading `herdr` is not a topology alias; request Herdr as a
separate provider preference.

