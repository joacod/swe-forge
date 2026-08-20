# Native isolated provider runbook

`NATIVE` means an actual capability of the active coding harness, not a
provider name or an assumption based on installation. Select it only after the
harness proves all mandatory capabilities for the current run:

- two concurrent writable workers by default
- dedicated Git worktrees from one exact integration SHA
- protection of the integration checkout
- structured fixed-directory worker results
- wait, inspect, cancel, and cleanup lifecycle operations
- central integration left to the root orchestrator

The proof may be a harness-specific command, documented operation, or
repository fixture. Record each result in `provider_capabilities` with an
evidence reference. `unknown` or `unavailable` is not proof and prevents native
selection.

## Boundary

The harness owns only its documented worker lifecycle and command translation.
At launch, it receives the compact `worker_briefing` projection from
`../../contracts/worker-brief.md`, the applicable canonical role, and the result
or review contract; it does not receive the root transcript or complete run
state. The root orchestrator owns routing, task contracts, local-resource
authorization, Git/evidence validation, worker acceptance, central transfer
and integration commits, final validation, review, delivery, and cleanup.
There is no provider-independent launcher and no claim that all harnesses
expose equivalent operations.

Workers must use the fixed result bundle under
`.swe-forge/contracts/result-bundle.md`; lifecycle completion does not establish
acceptance. The canonical isolated guard checks actual Git state.

## Fallback

If the harness cannot prove a required capability, record `unavailable` or
`unknown` and fall back to sequential `SUBAGENTS` or `SOLO` when safe. If the
ticket requires isolation and fallback would lose a required safety property,
return `BLOCKED`. Never put concurrent writable workers in one checkout and
never fabricate lifecycle or capability evidence.
