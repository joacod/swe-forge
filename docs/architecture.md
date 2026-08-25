# Architecture

SWE Forge is a harness-agnostic workflow above coding harnesses. It takes one
coding ticket through inspection, planning, implementation, verification,
review, and delivery. A run owns one writable delivery checkout and one
reviewable delivery outcome. Harness-native subagents may assist with bounded
work, but concurrent writable-agent orchestration, worker fleets, external
orchestrators, and multi-workspace integration are outside SWE Forge's scope.

The architecture keeps canonical workflow semantics separate from roles,
contracts, policies, and harness adapters:

- `SOLO` keeps discovery, implementation, validation, review, and acceptance in
  one root context;
- `SUBAGENTS` uses demonstrated native subagents for bounded independent work;
- delivery is `GUIDED` or `PR`, independent of execution topology; and
- delegated writes are sequential in the one delivery checkout.

## Canonical ownership and load map

The normative ownership and stage-triggered load map is defined in
[`SWE-FORGE.md`](../SWE-FORGE.md) and executed by the
[`ticket workflow`](../.swe-forge/workflows/ticket.md). This architecture
document references those owners instead of repeating their procedures. Read
each owner file at the point its stage or risk requires it; adapters must not
preload stage-specific sources.

Delivery branches use the canonical
`<type>/<short-kebab-case-description>` form without a project-name prefix.

## Layers

```text
                              User
                                |
                      explicit "Use SWE Forge"
                                v
                         SWE-FORGE.md
                                |
        +-----------------------+-----------------------+
        |                       |                       |
   role specs              contracts                 policies
        +-----------------------+-----------------------+
                                |
                         root orchestrator
                                |
                 +--------------+--------------+
                 |                             |
               SOLO                        SUBAGENTS
             one context          bounded native workers
                 |                             |
                 +--------------+--------------+
                                |
                    one delivery checkout
                                |
                 verification, review, delivery
```

The root orchestrator remains accountable for repository discovery, task
ownership, Git/evidence validation, final verification, review, delivery, and
cleanup. A native task mechanism realizes a selected semantic capability; it
does not choose topology or own acceptance.

## Canonical workflow and adapter ownership

The canonical SWE Forge layer owns semantics that must remain stable across
harnesses:

- activation semantics and the ticket lifecycle;
- topology semantics and routing policy;
- worker and delegation semantics, including worker briefs;
- worker, result, and review contracts;
- evidence semantics and delivery authorization; and
- run-state semantics and safe fallback behavior.

Harness adapters own the mechanics needed to expose those semantics through a
host:

- host discovery and loading;
- commands, prompts, and skills used to expose SWE Forge;
- host-native task or subagent invocation and bounded worker profiles;
- runtime capability observation and lifecycle hooks;
- context telemetry integration and structured-result translation;
- host approval behavior and configuration paths; and
- installation projections.

Adapters are harness integration layers. They may contain a loader, prompt or
command projection, runtime bridge, capability detector, worker-profile
mapping, structured-result translation, or lifecycle integration. Adapters
translate; they do not redefine canonical behavior.

## Capability boundary

Canonical workflow and policy code may depend on semantic capabilities. It must
not depend on the identity of a harness when the distinction can be expressed
as a capability. This keeps the workflow portable while allowing adapters to
provide richer or reduced host behavior.

Adapters may:

- preserve and forward host invocation arguments to the shared parser;
- project canonical workflow material into host-specific locations;
- detect and advertise only demonstrated host capabilities;
- implement host-specific lifecycle integration; and
- translate native task mechanisms into the canonical delegation capability.

Canonical sources own routing and topology semantics, contracts, evidence
requirements, delivery semantics, and documented fallback behavior. The
canonical worker-result contract and its
`.swe-forge/tools/swe-forge-worker-result` validator are the reusable semantic
surface for ordinary worker results. A host may translate the profile into its
native worker output, while the accountable workflow validates returned
evidence independently. When an adapter capability is absent, canonical
execution uses the safe root-owned fallback.

## Routing boundary

Automatic routing does not use prompt length alone. Before broad discovery, the
orchestrator makes a lightweight discovery-shape assessment: clearly
independent, read-only questions may use bounded `DELEGATED_RESEARCH`, while
coupled questions remain `ROOT_ONLY`. This assessment records bounded
objectives and concise evidence limits; it does not choose delivery or
 duplicate the final topology router.

The final routing decision records projected pressure, context reducibility,
delegatable context, root-context requirement, continuity risk, and runtime
capability evidence. Independent investigations may make `SUBAGENTS` preferable
when concise structured results materially reduce root context, even when all
implementation writes remain sequential. Multiple independent discovery
questions use one small read-only fan-out/fan-in batch. Globally coupled work
stays `SOLO`, or uses an explicit sequential dependency.

A preferred `SUBAGENTS` run with no active native capability falls back to
effective `SOLO` or sequential work with a visible reason. At safe boundaries,
`SOLO` and `SUBAGENTS` may be revised deliberately; each revision records its
evidence and phase.

## Shared-checkout boundary

```text
one invocation checkout
  -> one writable delivery checkout
  -> one non-protected delivery branch
  -> bounded root or native discovery
  -> sequential delegated writes when useful
  -> central validation and review
  -> one authorized push and one final PR
```

The invocation and delivery paths are the same checkout for a normal run. The
root owns branch setup, pre-edit baseline, task ownership, result acceptance,
verification, and delivery. Completion order never creates a second delivery
boundary. No worker branch, workspace, resource registry, or transfer mapping is
part of canonical run state.

Dependent workers use the same hub-and-spoke boundary. After the root accepts a
completed structured result, it selects a transient B-relevant
`dependency_digest`, then the canonical `swe-forge-worker-brief` tool renders
that digest with the task and current routing facts. The digest can reference
the original result/evidence without copying it; transcripts, exploration,
unrelated findings, full logs/diffs, and unrelated delivery metadata stay
root-owned. The projection cannot expand task scope or permissions and is not a
committed coordination artifact.

## Delivery and evidence

`policies/delivery.md` is the sole owner of local-resource and delivery
authorization. In `GUIDED`, branch setup and edits stop at declared checkpoints;
`continue` and `go` never authorize push, PR creation, publication, deployment,
or merge. `PR` authorizes the accepted local setup, validated per-slice
commits, one final push, and one final PR, never publication, deployment, or
merge. The same policy resolves repository branch, commit, title, template, and
draft conventions at each delivery boundary.

`policies/evidence.md` owns evidence semantics. The executable gate registers
planned checks, binds validation/checkpoints/commits to exact candidate
fingerprints, supports sequential slice checkpoints, rejects undeclared
mutations and missing required checks, and renders latest statuses. Receipts are
private run evidence, include final `Head`, evidence fingerprint, and UTC
generation time, and are never project-facing PR content.

## Environment and shared artifacts

One checkout does not isolate ports, databases, Docker projects, temporary
paths, external services, credentials, or Git refs. Plans record allowlisted
ignored files, setup side effects, unique runtime resources, and cleanup. Shared
schemas, contracts, root lockfiles, generated artifacts, changelogs, and
versions have one explicit owner; delegated writers do not run concurrently.

## Adapters and installation

Adapters under `.swe-forge/adapters/` are harness integration layers, not
alternate workflow definitions. The registry is the installation source of
truth, and adapters resolve canonical references from the active user-level
installation root rather than a project-local `.swe-forge/` tree. The adapter
catalog remains in the SWE Forge checkout and is not installed with a harness
projection.

## State flow

```text
ticket/raw invocation
  -> shared parser facts and immutable raw ticket
  -> acceptance and transient PR working spec
  -> context capability and durable continuation plan
  -> architecture, ownership, and validation plan
  -> preferred/effective routing and native capability evidence
  -> one delivery checkout
  -> bounded root or sequential native work
  -> exact-content evidence and final review
  -> authorized delivery actions
  -> one final report and conservative cleanup
```

Run state is temporary or ignored and schema-v4 only. Its short `continuation`
block is authoritative workflow-control state after compaction; conversation
summaries and adapter reminders are not. Any state with another schema version
is stale, rejected clearly, and never migrated or guessed into a new shape.

## Runtime capability boundary

The generic core records capability names such as `context_usage`,
`proactive_compaction`, `state_reinjection`, and `subagents.native`.
Capability resolution uses observed runtime evidence first, then adapter
declarations, documented static defaults, and finally `unknown`; unknown
capabilities degrade to durable checkpoints and manual recovery rather than
invented thresholds.

Adapters may translate demonstrated host-native worker facilities into the
canonical delegation capability. Canonical routing still owns whether
delegation occurs, and unavailable capabilities use the canonical fallback.
Host API and bridge details belong in the relevant adapter, not in this
architectural description.
