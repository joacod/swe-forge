# Isolated Execution-Provider Selection Policy

Use this policy only after hard routing eligibility selects
`routing.current: ISOLATED`. It defines writable-provider capability evidence,
not workflow behavior or delivery authorization. Read-only delegation backend
selection for `SUBAGENTS` belongs to `policies/execution-routing.md`; a Herdr
research worker therefore does not load this isolated provider machinery.

```yaml
requested_provider: AUTO | NATIVE | HERDR | NONE
execution_provider: NATIVE | HERDR | NONE
provider_reason: <evidence-backed reason>
parallel_strategy: NONE | COMPOSE
integration_strategy: NONE | CHERRY_PICK
# For the selected ISOLATED topology, routing also records:
# delegation_backend: NATIVE | HERDR
# write_isolation: WORKTREE
```

## Mandatory capability evidence

Before selecting `NATIVE` or `HERDR`, prove every required capability:

```yaml
provider_capabilities:
  concurrent_writable_workers: {status: proven | unavailable | unknown, evidence_ref: <ref>}
  dedicated_worktrees: {status: proven | unavailable | unknown, evidence_ref: <ref>}
  exact_base_sha: {status: proven | unavailable | unknown, evidence_ref: <ref>}
  integration_checkout_protection: {status: proven | unavailable | unknown, evidence_ref: <ref>}
  structured_results: {status: proven | unavailable | unknown, evidence_ref: <ref>}
  lifecycle:
    wait: {status: proven | unavailable | unknown, evidence_ref: <ref>}
    inspect: {status: proven | unavailable | unknown, evidence_ref: <ref>}
    cancel: {status: proven | unavailable | unknown, evidence_ref: <ref>}
    cleanup: {status: proven | unavailable | unknown, evidence_ref: <ref>}
  central_integration: {status: proven | unavailable | unknown, evidence_ref: <ref>}
```

Prefer `NATIVE` when every mandatory capability is proven and no material
provider-specific reason favors Herdr. Do not select `NATIVE` while any
mandatory capability is `unknown` or `unavailable`. A native read-only worker does not prove isolated writable
capabilities. `NATIVE` must be able to create at least two concurrent writable
workers from one exact integration SHA, keep them out of the integration
checkout, return structured results, expose wait/inspect/cancel/cleanup, and
leave integration to the orchestrator.

`HERDR` requires `test "${HERDR_ENV:-}" = 1` and the provider's own capability
proof. It may be preferred when separate processes/harnesses, visible panes,
persistent sessions, stronger supervision, or explicit user preference
materially helps. A natural-language request such as "use Herdr as the provider for this isolated run" records `requested_provider: HERDR`. Herdr is optional, never installed automatically, and never authorizes delivery. Its existing documentation and ownership guard remain
canonical under `.swe-forge/providers/herdr/`.

## Native provider runbook

The native provider boundary is deliberately harness-specific:

1. The harness proves each capability with its documented operation or an
   executable fixture; installation alone is not proof.
2. The root orchestrator records evidence and creates the exact local plan.
3. The provider/harness launches only bounded workers from the recorded base,
   returns the fixed worker-result bundle, and exposes its actual lifecycle
   operations.
4. The root orchestrator owns Git/evidence validation, central integration,
   final validation, review, delivery, and cleanup.
5. If a harness cannot expose one required operation, record `unavailable` or
   `unknown` and fall back rather than pretending the operation exists.

No provider-independent agent launcher is implied. Harnesses may expose
capabilities differently; this contract does not claim that every harness has
an equivalent operation.

## Fallback

If no provider can safely satisfy the contract, fall back to sequential
`SUBAGENTS` or `SOLO` when isolation is not required, or return `BLOCKED` when
required isolation would be lost. Record the requested provider, evidence gap,
selected fallback, and reason. Never place concurrent writable workers in one
checkout.
