# Herdr Execution Provider

Herdr is an optional execution provider/backend for the canonical topology
selected by SWE Forge. It may realize read-only `SUBAGENTS` workers in shared
write isolation, or it may provide isolated writable lifecycle capabilities
only after the `ISOLATED` hard gate passes. Herdr owns terminals, panes,
workspaces, agents, and Git worktree sessions when those capabilities materially
improve the bounded task. Herdr does not define SWE Forge behavior, replace the
coding harness, or own task acceptance and final integration.

Herdr is not a canonical execution mode. Use the explicit `isolated` topology
and record `requested_provider: HERDR` when a user wants Herdr as the provider.
Do not retain a provider name as a topology alias.

## Optional Boundary

- Herdr is optional.
- Herdr does not define SWE Forge behavior.
- Herdr does not replace the coding harness.
- Herdr must not be installed automatically.
- The official Herdr skill may be used when it is already installed and made
  available by the user or harness.
- Herdr control commands require the existing `HERDR_ENV=1` ownership guard.
- A read-only Herdr worker is recorded as `topology: SUBAGENTS`,
  `delegation_backend: HERDR`, `write_isolation: SHARED`, and
  `execution_provider: NONE`; it is not `ISOLATED`.
- Writable concurrent Herdr workers are recorded as `ISOLATED` only after the
  existing worktree/write-safety gate and provider capability proof.
- Herdr lifecycle state is scheduling evidence, not task-acceptance evidence.
- Structured worker results, Git evidence, validation, and central integration
  remain authoritative.
- The runbook launches workers with a compact `worker_briefing` projection,
  the relevant canonical role, and the result/review contract. It never needs
  the root transcript, unrelated ticket history, or the complete run state;
  isolated writable workers retain the projection's full conditional Git,
  environment, ownership, authorization, and transfer section.

Before any Herdr control command, verify ownership:

```bash
test "${HERDR_ENV:-}" = 1
```

When the guard fails, do not inspect or control a session from outside a
managed pane. Follow the provider-selection fallback policy instead.

## Harness Boundary

Herdr does not replace the coding harness. The harness remains responsible for
loading SWE Forge, applying the canonical role and task contracts, and doing
bounded coding work. Herdr is only an optional provider of isolated execution
environments and lifecycle control. It must not be installed through the SWE
Forge installer and has no adapter registry entry.

## Runbook

See [runbook.md](runbook.md) for the bounded-task, worktree, result, wait,
integration, and cleanup procedure. The worktree/integration sections are used
only after routing selects `ISOLATED`, provider selection records
`execution_provider: HERDR`, and the ownership guard succeeds. A read-only
`SUBAGENTS` backend may use bounded process/pane supervision without loading
the isolated worktree workflow; its structured evidence and root integration
remain authoritative.

References checked on 2026-08-10:

- https://herdr.dev/docs/agent-skill/
- https://herdr.dev/docs/socket-api/
- https://herdr.dev/docs/quick-start/
