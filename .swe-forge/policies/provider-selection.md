# Isolated Execution-Provider Selection Policy

## Objective

Select the smallest trustworthy provider for an already selected
`execution_mode: ISOLATED`. This policy does not select the topology, define
SWE Forge behavior, authorize delivery, or replace the coding harness.

Record these fields in run state and the isolated plan:

```yaml
requested_provider: AUTO | NATIVE | HERDR | NONE
execution_provider: NATIVE | HERDR | NONE
provider_reason: <why this provider satisfies the isolated-execution requirements>
parallel_strategy: NONE | COMPOSE
integration_strategy: NONE | CHERRY_PICK
```

`execution_provider` applies only to `ISOLATED`. For `SOLO` and `SUBAGENTS`,
record `execution_provider: NONE`, `parallel_strategy: NONE`, and
`integration_strategy: NONE`. Isolated v1 supports only `COMPOSE`: several
non-overlapping worker results contribute to one integrated result. Its only
integration strategy is `CHERRY_PICK` as a behavioral description of applying
worker transfer commits in planned order. Do not add alternative
implementations, best-of-N, stacked PRs, or `SELECT_ONE`.

## NATIVE

Prefer `NATIVE` when the current coding harness can demonstrably:

- launch at least two concurrent writable workers
- give every worker a dedicated Git worktree
- create every worker from the exact requested integration commit
- keep workers from writing to the integration checkout
- return structured task results
- expose enough lifecycle control to wait, inspect, cancel, and clean workers
- leave final integration under the root orchestrator

A native provider may be a harness capability, not a separate service. Native
read-only subagents that cannot provide these writable isolation guarantees do
not satisfy `ISOLATED`; use `SUBAGENTS` instead.

## HERDR

Prefer `HERDR` only when it is safely available and one or more of these
materially helps the ticket:

- the native harness lacks required isolated-worker capabilities
- different harnesses or models are intentionally used for different tasks
- persistent panes, servers, tests, or sessions are useful
- visible interactive worker panes are valuable
- stronger process supervision or remote reattachment is useful
- the user explicitly prefers Herdr as the provider

Herdr is optional. It does not define SWE Forge behavior, replace the coding
harness, or authorize delivery. Do not install it automatically. An official
Herdr skill may be used when it is already installed and the user or harness
makes it available. Before Herdr control commands, require the existing
ownership guard:

```bash
test "${HERDR_ENV:-}" = 1
```

Herdr lifecycle state is scheduling evidence only. Structured worker results,
branch and worktree Git evidence, worker and integrated validation, and central
orchestrator integration remain authoritative. See
`.swe-forge/providers/herdr/README.md` and `runbook.md` for the provider-specific
coordination boundary.

## Selection

1. Record `requested_provider`. A natural-language provider preference (for
   example, "use Herdr as the provider for this isolated run") is separate
   from any topology token. The former topology token `herdr` is not accepted
   as an alias; return migration guidance to use `isolated` and ask for Herdr as
   a provider preference.
2. Verify the selected provider's capabilities against the task contract and
   the current integration commit.
3. Prefer `NATIVE` when it satisfies every required isolated-worker capability
   and no material provider-specific reason favors Herdr.
4. Prefer `HERDR` when it passes the ownership guard and one or more listed
   benefits materially improves safe execution.
5. Record `execution_provider`, `provider_reason`,
   `parallel_strategy: COMPOSE`, and `integration_strategy: CHERRY_PICK` before
   creating worker resources.
6. Keep the root orchestrator accountable for foundation, integration, final
   validation, review, and delivery.

Do not select a provider merely because it is installed, because the ticket is
large, because many files are involved, or because strong context isolation is
appealing. Do not create a generic provider shim that reports lifecycle events
without reliable isolation, result collection, cancellation, and cleanup.

## Fallback

If neither `NATIVE` nor `HERDR` can supply the required isolation:

- fall back to sequential `SUBAGENTS` or `SOLO` when safe
- return `BLOCKED` when the ticket requires isolation and falling back would
  lose it
- record the requested mode, requested provider, provider limitation,
  selected fallback, and why it is safe or blocked

A provider failure never permits concurrent writable workers in one checkout.
Changing provider or topology requires the orchestrator to preserve the task
contracts, re-evaluate the gate, and record the change in run state.
