# Architecture

SWE Forge is a harness-agnostic workflow above coding harnesses. One run takes
one ticket to one reviewable delivery outcome and owns one writable delivery
checkout. The public invocation carries the ticket and optional `GUIDED`
delivery intent; `SOLO` and `SUBAGENTS` are internal routing outcomes. `SOLO`
keeps work in the root; `SUBAGENTS` adds bounded native work when it materially
helps. Delivery is independently `GUIDED` or `PR`.

## Canonical ownership

[`SWE-FORGE.md`](../SWE-FORGE.md) owns activation, lifecycle, the Acceptance
Gate, and reporting. The ticket [workflow](../.swe-forge/workflows/ticket.md)
owns order and load timing. The remaining owners are:

```text
specification       -> scope decision and transient working spec
execution-routing   -> topology and capability evidence
delegation          -> task ownership and dependency handoffs
verification        -> testing and quality-gate selection
evidence            -> Git-HEAD-bound validation and review evidence
delivery            -> checkout and external-action authorization
failure-recovery    -> bounded recovery
contracts           -> data shapes and review semantics
agents              -> role-specific responsibilities
adapters            -> host translation and installation projections
```

Owners are normative. Adapters and examples point to them rather than defining
parallel workflow rules.

## Layers

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

The root owns discovery, task ownership, integration, Git and validation
checks, review, acceptance, delivery, and cleanup. A host task mechanism
realizes a selected capability; it does not choose topology or own acceptance.

## Capability boundary

Canonical sources depend on semantic capabilities, not harness identity.
Adapters are harness integration layers. They may project prompts and commands,
detect demonstrated capabilities,
map permissions and profiles, and translate native task/results or lifecycle
hooks. They must not redefine routing, contracts, evidence, delivery, or
acceptance. A missing capability uses the canonical safe fallback.

The portable tools expose narrow semantic ports: state inspection and active
selection, worker-brief validation/inspection, and worker-result schemas and
validation. The worker communication tools use only Python 3's standard
library to parse JSON; they do not maintain a second serialization. Adapters consume those
ports instead of parsing or reconstructing canonical representations.

## Shared candidate boundary

All accepted writes belong to one canonical delivery candidate and are
materialized into the canonical delivery checkout before root acceptance or
dependent handoff. Concurrent mutation of that candidate is forbidden. A host
may execute a worker through a private worktree, sandbox, overlay, container, or
other physical mechanism; that environment is adapter/runtime detail, not
Forge state or result metadata. The host decides worker physical execution and
scheduling.

The root derives a compact dependency digest only after accepting a structured
result. The digest is transient launch context and cannot expand scope,
permissions, or authority. No worker branch, second Forge workspace, peer
channel, or transfer registry is needed.

## Delivery and state

`policies/delivery.md` owns branch, commit, push, PR, merge, external-resource,
and cleanup authorization. `policies/evidence.md` binds final validation and
review to the committed candidate's Git `HEAD`. Review is one fresh
ticket-focused review; one concrete localized repair may be validated without a
second review.

Run state is temporary or ignored, schema-v5 only, and authoritative for
continuation after a host context discontinuity. It records the run fence,
route, canonical checkout, compact continuation, candidate-bound validation and
review facts, and PR delivery reference—rather than a second workflow log. The
host owns context preservation, compaction, retry, and restoration. Before
resuming, the workflow re-reads state and reconciles actual Git and
validation/review evidence.

## Installation

The adapter registry is the installation source of truth. Installation links the
selected user-level projection and canonical support tree; it never installs the
adapter catalog or changes project configuration. Adapter documentation contains
host syntax and observed capability evidence only.
