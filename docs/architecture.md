# Architecture

SWE Forge is a harness-agnostic workflow above coding harnesses. One run takes
one focused ticket to one reviewable outcome and owns one writable delivery
checkout. The invocation carries the ticket and optional `GUIDED` intent;
`SOLO` and `SUBAGENTS` are internal routing outcomes.

## Canonical ownership

[`SWE-FORGE.md`](../SWE-FORGE.md) owns activation, invariants, the Acceptance
Gate, and reporting. The [ticket workflow](../.swe-forge/workflows/ticket.md)
owns procedure and load timing. Other owners are:

```text
specification       -> scope decision and transient working spec
execution-routing   -> topology and capability evidence
delegation          -> task ownership and dependency handoffs
verification        -> testing and quality-gate selection
evidence            -> Git-HEAD-bound validation and review evidence
delivery            -> checkout and external-action authorization
failure-recovery    -> bounded recovery
contracts           -> data shapes and review semantics
agents              -> role responsibilities
adapters            -> host translation and installation projections
```

Owners are normative. Adapters and examples link to them rather than defining
parallel rules.

## Flow

```text
explicit user request
        |
   SWE-FORGE.md
        |
 workflow -> policies/contracts/roles
        |
 root orchestrator -> SOLO or bounded SUBAGENTS
        |
 one delivery checkout -> validation -> review -> authorized delivery
```

The root owns discovery, task ownership, integration, Git, validation, review,
acceptance, delivery, and cleanup. A host task mechanism realizes a selected
capability; it does not choose topology or own acceptance.

## Capability boundary

Canonical sources depend on semantic capabilities, not harness identity.
Adapters may project prompts and commands, observe capabilities, map permissions
and profiles, and translate native tasks/results or lifecycle hooks. They must
not redefine routing, contracts, evidence, delivery, or acceptance. Missing
capabilities use the canonical fallback.

Portable tools expose narrow ports for state inspection/selection, worker-brief
validation/inspection, and worker-result schemas/validation. Bun is the runtime
for the typed TypeScript ports; they do not maintain another serialization.
Adapters consume these ports rather than parsing canonical representations.
The repository validation coordinator follows the same boundary:
`scripts/validate-swe-forge` is a thin shell entrypoint for
`src/validation-cli.ts`, which owns group selection, check execution, and
reporting. Shell remains for compatibility/bootstrap wrappers, concise
structural or release checks, and black-box filesystem/Git/runtime fixtures.

## Candidate and state

All accepted writes belong to one canonical candidate and are materialized in
its checkout before root acceptance or dependent handoff. Concurrent mutation is
forbidden. A private worker worktree, sandbox, overlay, or container is host
runtime detail, not Forge state or result metadata.

The root derives a compact dependency digest only after accepting a structured
result. It cannot expand scope, permissions, or authority. No worker branch,
second Forge workspace, peer channel, or transfer registry is needed.

`policies/delivery.md` owns branch, commit, push, PR, merge, external-resource,
and cleanup authorization. `policies/evidence.md` binds final validation and
review to the committed `HEAD`; one localized repair may be validated without a
second review.

Run state is temporary or ignored, schema-v5 only, and authoritative for
continuation. It stores the run fence, route, canonical checkout, compact
continuation, candidate-bound validation/review, and PR facts—not a workflow
log. The host owns context preservation, compaction, retries, and restoration;
recovery re-reads state and actual Git/evidence.

## Installation and release ownership

The adapter registry is the installation source of truth. Source-checkout
installation supplies the reviewed checkout as both logical and real source.
A standalone executable validates its embedded inventory and materializes one
immutable release at `versions/<version>/canonical`, then atomically activates
the user-level `current` symlink. It passes `current/canonical` as the logical
source and the version directory as the real validation source to the same
installer.

Harness-local adapters own their projections and manifests. They never activate
canonical releases or persist a direct `versions/<version>` target. The global
`current` release is shared by every installed harness, so standalone `update`
activates once and reconciles every managed manifest. Installation never
changes project configuration.

## Release artifact boundary

The release builder uses the tracked canonical inventory, `VERSION`, a pinned
Bun toolchain, and an explicit target. Each artifact has a versioned
platform/architecture filename, a JSON metadata sidecar, and a standard
SHA-256 sidecar. The metadata records the embedded canonical payload identity
and asset count; `payload inspect` exposes the same identity at runtime.

The payload inventory is deterministic for a given checkout. Bun's compiled
runtime may still produce different binary bytes between builds, so artifact
SHA-256 values identify a specific build rather than promising bit-for-bit
reproducibility. Standalone installation and update do not contact a package
registry or release service. Cross-target builds may download Bun's target
runtime as a maintainer build-time input; that network access is not present in
the standalone executable.

The optional Bun global package exposes the source-checkout wrapper, not a
platform binary. It requires Bun, ships only the audited source payload, and
has no install-time download or runtime npm dependency.
