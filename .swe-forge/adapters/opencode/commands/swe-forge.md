---
description: Run SWE Forge with automatic topology and guided or PR delivery
agent: build
---

The user explicitly invoked SWE Forge for the ticket below.

Read @AGENTS.md and @SWE-FORGE.md, then read the ticket procedure at
`.swe-forge/workflows/ticket.md`. Follow the canonical workflow and load only
the role, contract, and policy files required by the selected topology, delivery
mode, and ticket risks.
Parse and honor an explicit topology or delivery token using the canonical
fallback rules. Default to `GUIDED`; use `pr` only for low-touch delivery and
keep its working spec temporary. Before the first write-tool call, complete the
canonical checkout baseline and protected-branch gate. From a clean protected
default branch, create one dedicated task branch automatically and reuse it for
the whole run. In guided mode, `go` commits the reviewed slice and continues;
in PR mode, commit each validated slice separately. After a PR, treat `merged`
as a request to verify merge state before syncing, never as proof of merge.

Raw invocation arguments (`<ticket>`, `<pr> <ticket>`, or
`<solo|subagents|herdr> [pr] <ticket>`):

$ARGUMENTS
