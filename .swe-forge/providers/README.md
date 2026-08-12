# Execution Providers

Execution providers supply harness-neutral lifecycle capabilities to an
already selected `ISOLATED` workflow. They do not define SWE Forge behavior,
replace the coding harness, select the topology, own task acceptance, or own
final integration and delivery.

Provider documentation is canonical support content, not a harness adapter
projection or registry artifact. The installer source-links this directory
with the canonical `.swe-forge/` support tree so global and project consumers
resolve the same provider runbooks without installing provider tools.

The provider boundary is intentionally small. A provider may create or expose
bounded worker environments, wait and inspect them, collect structured results,
cancel or clean run-owned resources, and report lifecycle evidence. The root
orchestrator remains authoritative for task contracts, Git evidence, worker and
integrated validation, source-to-integration mappings, review, delivery
authorization, and final acceptance.

## Selection

Use `.swe-forge/policies/provider-selection.md` only after routing selects
`execution_mode: ISOLATED`. Prefer a native harness provider when it can
reliably provide dedicated writable worktrees, exact bases, structured results,
lifecycle control, and central integration. Herdr is an optional provider when
its process, pane, session, harness, or supervision capabilities materially
help.

If no provider can safely supply required isolation, fall back to sequential
`SUBAGENTS` or `SOLO` when safe, or return `BLOCKED` when required isolation
would be lost. Do not create a fake generic provider or install a provider
automatically.

## Available Provider Documentation

- [Herdr](herdr/README.md): optional environment-level provider
- [Herdr runbook](herdr/runbook.md): bounded worktree, lifecycle, integration,
  and cleanup guidance

A provider's lifecycle status is scheduling evidence, not task-acceptance
evidence. Structured worker results, Git branch/worktree state, validation, and
central integration remain authoritative.
