# Execution Routing Policy

## Objective

Choose the smallest topology that provides a meaningful reliability benefit.
Topology, provider, and delivery are separate decisions. `NATIVE` and
`HERDR` are providers, never topologies.

Every run records:

```text
requested_mode: AUTO | SOLO | SUBAGENTS | ISOLATED
execution_mode: SOLO | SUBAGENTS | ISOLATED
requested_provider: AUTO | NATIVE | HERDR | NONE
execution_provider: NATIVE | HERDR | NONE
provider_reason: <why the selected provider satisfies isolated requirements>
parallel_strategy: NONE | COMPOSE
integration_strategy: NONE | CHERRY_PICK
requested_delivery: DEFAULT | GUIDED | PR
delivery_mode: GUIDED | PR
reason: <specific evidence>
fallback_used: no | <requested mode/provider -> selected mode/provider and reason>

isolated_eligibility:
  status: eligible | ineligible
  evidence_ref: <evidence>
  blockers: []
parallel_value:
  status: beneficial | marginal | unknown
  rationale: <evidence>
  overridden_by_user: true | false
```

## Hard isolated eligibility

An explicit isolated request cannot bypass this gate. Every condition must be
satisfied before multiple writable workers are created:

1. at least two composable writable tasks
2. dependencies satisfied before the parallel wave
3. non-overlapping writable ownership
4. one owner for shared and generated artifacts
5. stable shared foundation
6. independently observable acceptance criteria
7. realistic worker-level validation
8. safely isolated runtime resources
9. one accountable central integrator

If a hard condition fails, downgrade to `SUBAGENTS` or `SOLO` when safe, or
return `BLOCKED` when required isolation would be lost. Do not manufacture
parallel writers merely to demonstrate isolated execution.

## Economic preference

Automatic routing additionally asks whether parallelism credibly reduces
critical-path time or context interference. Record `beneficial`, `marginal`, or
`unknown` and the rationale. An explicit isolated request may override only
this economic judgment; it may not override hard eligibility.

## Modes

`SOLO` is the default for small, tightly coupled, sequential, or shared-surface
work. `SUBAGENTS` supports independent read-only research and sequential
bounded writable work in one checkout. Concurrent writable workers in separate
worktrees are `ISOLATED`, regardless of harness.

`ISOLATED` v1 is only `parallel_strategy: COMPOSE` with
`integration_strategy: CHERRY_PICK`: non-overlapping worker results are
centrally integrated into one result. It never selects among alternatives,
creates worker PRs, creates stacked PRs, or merges automatically. At most two
concurrent writable workers are used by default.

## Provider boundary

Select a provider only after the hard topology gate passes. Load
`policies/provider-selection.md` and record structured capability evidence.
`NATIVE` is not selectable while a mandatory capability is unknown or
unavailable. If safe native or Herdr isolation cannot be proven, use a safe
sequential fallback or `BLOCKED`.

## Serialization evidence

Serialize when writers share shell, evidence, state, documentation, contracts,
generated artifacts, root lockfiles, schemas, or unresolved architecture; when
runtime resources cannot be isolated; when cross-worker decisions dominate; or
when integration overhead exceeds the benefit. File count, ticket difficulty,
or provider availability alone never selects `ISOLATED`.
