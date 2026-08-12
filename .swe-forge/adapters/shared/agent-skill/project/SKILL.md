---
name: swe-forge
description: Explicitly activate the portable SWE Forge ticket workflow with guided or PR delivery for a user-supplied software task.
disable-model-invocation: true
---

The user explicitly invoked SWE Forge through the host's explicit skill entry.
Use `$swe-forge` in Codex or `/swe-forge` in Cursor.

Read `AGENTS.md` and `SWE-FORGE.md`, then read the ticket procedure at
`.swe-forge/workflows/ticket.md`. Follow the canonical workflow and load only
the role, contract, and policy files required by the selected topology, delivery
mode, and ticket risks. Parse and honor an explicit topology or delivery token
using the canonical fallback rules. Default to `GUIDED`; use `pr` only for
low-touch delivery and keep its working spec temporary. Before the first
write-tool call, complete the canonical checkout baseline and protected-branch
gate. From a clean protected default branch, create one dedicated task branch
automatically and reuse it for the whole run. In guided mode, `go` commits the
reviewed slice and continues; in PR mode, commit each validated slice
separately. After a PR, treat `merged` as a request to verify merge state before
syncing, never as proof of merge. Keep repository discovery rooted in the active
project.

Treat the user's request after the explicit skill entry as the raw invocation
arguments (`<ticket>`, `<pr> <ticket>`, or `<solo|subagents|herdr> [pr] <ticket>`). The original ticket
remains authoritative.
