---
description: Run SWE Forge with automatic topology and guided or PR delivery
agent: build
---

The user explicitly invoked SWE Forge.

Read @~/.config/opencode/swe-forge/AGENTS.md and
@~/.config/opencode/swe-forge/SWE-FORGE.md, then read the ticket procedure at
@~/.config/opencode/swe-forge/.swe-forge/workflows/ticket.md. Follow the
canonical workflow and load only the role, contract, and policy files required
by the selected topology, delivery mode, and ticket risks. Resolve every
canonical relative reference under `~/.config/opencode/swe-forge/`, never
against a project-local `.swe-forge/` tree. Keep repository discovery rooted in
the active project and preserve the raw invocation arguments as the original
ticket.

Pass the raw invocation arguments below unchanged to the ticket procedure;
the shared parser/bootstrap supplies normalized invocation facts and the
procedure handles their status and delivery-mode flow.

Raw invocation arguments:
$ARGUMENTS
