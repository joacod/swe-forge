# Architecture

SWE Forge is a Pi-first coding workflow with a portable canonical core above
coding harnesses. Its architecture separates canonical workflow logic from
role definitions, contracts, policies, execution providers, and harness
integrations. Execution topology, provider, and delivery are orthogonal:

- topology controls coordination: `SOLO`, `SUBAGENTS`, or `ISOLATED`
- routing records context value and separates preferred from effective topology
- delegation backend realizes bounded workers: `NONE`, `NATIVE`, `HERDR`, or a
  future adapter backend; backend identity does not select topology
- provider supplies isolated lifecycle capabilities only after hard eligibility:
  `NATIVE` or optional `HERDR` (`NONE` for non-isolated runs)
- write isolation records `SHARED` versus `WORKTREE`; only the latter can
  support concurrent writable `ISOLATED` work
- delivery controls human checkpoints and authorized repository delivery:
  `GUIDED` or `PR`

## Canonical ownership and load map

The normative ownership and stage-triggered load map is defined in
[`SWE-FORGE.md`](../SWE-FORGE.md) and executed by the
[ticket workflow](../.swe-forge/workflows/ticket.md). This architecture
document intentionally references those owners instead of repeating their
procedures. Read each owner file at the point its stage or risk requires it;
adapters must not preload stage-specific sources.

Files outside the canonical owner summarize or reference the rule; they do not
redefine low-level behavior. Delivery branches use the canonical
`<type>/<short-kebab-case-description>` form without a project-name prefix;
only ephemeral isolated worker branches use internal run/task namespacing.

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
       +----------------+-------+----------------+
       |                |                        |
     SOLO           SUBAGENTS                ISOLATED
   one context    read-only or               isolated writable
                  sequential writers        worktrees
                                                |
                                  +-------------+-------------+
                                  |                           |
                              NATIVE                       HERDR
                         harness capability          optional provider
                                                |
                         central integration and delivery
```

Providers are not topology branches. The orchestrator remains accountable for
foundation, Git/evidence validation, central integration, final verification,
review, delivery, and cleanup.

## Capability boundary

Canonical workflow and policy code may depend on semantic capabilities. It must
not depend on the identity of a harness when the distinction can be expressed
as a capability. This keeps the workflow portable while allowing adapters to
provide richer or reduced host behavior.

Adapters may:

- translate invocation syntax;
- project canonical workflow material into host-specific locations;
- detect and advertise only demonstrated host capabilities;
- implement host-specific lifecycle integration; and
- provide host-specific execution backends or richer behavior.

Canonical workflow and policy sources own routing and topology semantics,
contracts, evidence requirements, delivery semantics, and documented fallback
behavior. When an adapter capability is absent, canonical execution uses the
safe fallback where one exists. Do not add a heavyweight `Harness` class or
plugin framework merely to model asymmetric support; the capability boundary
is the intended abstraction.

## Routing boundary

Automatic routing does not use prompt length alone. Before broad discovery,
the orchestrator makes a lightweight discovery-shape assessment: clearly
independent, read-only questions may use bounded `DELEGATED_RESEARCH`, while
coupled questions remain `ROOT_ONLY`. This assessment records bounded
objectives and concise evidence limits; it does not choose delivery, create
isolated work, or duplicate the final topology router. Early research uses the
existing shared-write `SUBAGENTS` semantics only when a backend is proven, and
the normal specification, architecture, decomposition, and full routing
phases still follow.

The final routing decision records projected pressure, context reducibility,
delegatable context, root-context requirement, and continuity risk. Independent,
separately evaluable investigations may make `SUBAGENTS` preferable when
concise structured results materially reduce root context, even if
implementation writes remain sequential. Multiple independent discovery
questions use one small read-only fan-out/fan-in batch: launch the useful
questions together, wait at one root barrier, and resolve results centrally.
Globally coupled work stays `SOLO`, or uses an explicit sequential dependency,
when splitting does not reduce the information the root must keep.

The run records both the policy preference and runtime reality. A preferred
`SUBAGENTS` run with no active backend falls back to effective `SOLO` (or
sequential work) with a visible reason. At safe boundaries, `SOLO` and
`SUBAGENTS` may be revised deliberately; each revision records its evidence and
phase. A move toward `ISOLATED` reruns all writable safety checks.

Hard isolated eligibility requires at least two composable writable tasks,
satisfied dependencies, non-overlapping ownership, one owner for shared and
generated artifacts, a stable foundation, independent acceptance criteria,
realistic worker validation, safely isolated runtime resources, and one central
integrator. An explicit isolated request cannot bypass these conditions. When a
condition fails, safely downgrade to `SUBAGENTS` or `SOLO`, or return
`BLOCKED` when required isolation would be lost.

Automatic routing separately records economic parallel value: `beneficial`,
`marginal`, or `unknown`. Explicit selection may override only that economic
preference. At most two writable workers run concurrently by default.

## Isolated integration boundary

```text
invocation checkout (untouched)
  -> one orchestrator-owned integration/delivery worktree
  -> one non-protected integration branch
  -> shared foundation
  -> wave of local-only worker branches/worktrees
  -> fixed machine-valid result bundles
  -> planned central transfer order
  -> central validation and integration commits
  -> one pushed integration branch and one final PR
```

Run state distinguishes `invocation_checkout` from `delivery_checkout`; the
latter is the sole writable checkout owning final commits. Worker resources are
recorded only under `workers`. Completion order never determines integration
order. Source-to-integration mappings are recorded after central validation.

The fixed worker bundle is `result/meta.tsv`, `commits.txt`, `files.txt`,
`validations.tsv`, `scope-exceptions.txt`, `staged.txt`, `unstaged.txt`,
`untracked.txt`, and `resources.tsv`. The isolated Git/evidence guard verifies
actual worktree/branch identity, exact base/head, commit range, paths, scope,
cleanliness, fingerprints, planned checks, integration order, conflict
restoration, mappings, remote refs, and cleanup eligibility. It never launches
agents, controls Herdr, pushes, creates PRs, publishes, deploys, merges, or
force-cleans.

Dependent workers use the same hub-and-spoke boundary. After the root accepts a
completed structured result, it derives a transient `dependency_digest` for a
downstream briefing by filtering only the facts that downstream objective and
acceptance need. The digest can reference the original result/evidence without
copying it; transcripts, exploration, unrelated findings, full logs/diffs, and
unrelated delivery metadata stay root-owned. The projection cannot expand task
scope and is not a committed coordination artifact.

## Delivery and evidence

`policies/delivery.md` is the sole owner of local-resource and delivery
authorization. In `GUIDED`, explicit isolated selection creates only a plan;
`continue` authorizes the exact setup and `go` authorizes one reviewed central
commit. Neither permits push, PR, publication, deployment, or merge. `PR`
authorizes the accepted local setup, worker transfer commits, validated central
commits, one final push, and one final PR, never publication, deployment, or
merge. A PR working spec also owns an ordered commit plan; each meaningful
validated step receives its own local or central commit before the next step.
The same policy resolves repository branch, commit, title, template, and draft
conventions at each delivery boundary, without adding SWE Forge configuration
to the target repository. Other files reference this rule rather than
redefining it.

`policies/evidence.md` owns evidence semantics. The executable gate registers
planned checks, binds validation/checkpoints/commits to exact candidate
fingerprints, supports independent sequential slice checkpoints, rejects
undeclared mutations and missing/unavailable required checks, and renders latest
statuses. `policies/context.md` owns the portable near-limit and overflow
recovery protocol; it requires durable-state and Git rechecks after host
compaction without assuming a universal harness API. Receipts are private run
evidence, include final `Head`, evidence fingerprint, and UTC generation time,
and are never project-facing PR content; read-only verification detects stale
receipts.

## Environment and shared artifacts

Worktrees do not isolate ports, databases, Docker projects, temporary paths,
external services, credentials, or Git refs. Plans record allowlisted ignored
files, unique runtime resources, setup side effects, and cleanup. Shared
schemas, contracts, root lockfiles, generated artifacts, changelogs, and
versions have one explicit owner.

## Providers and adapters

Providers live under `.swe-forge/providers/`. Herdr is optional, requires its
existing `HERDR_ENV=1` ownership guard, and its lifecycle state is scheduling
evidence only. Native selection requires structured proof of all mandatory
capabilities; harnesses may expose them differently and no universal launcher
is implied.

Adapters under `.swe-forge/adapters/` are thin loaders. The registry is the
installation source of truth, and adapters must resolve canonical references
from the active user-level installation root rather than a project-local
`.swe-forge/` tree. The adapter catalog remains in the SWE Forge checkout and
is not installed with a harness projection.

## State flow

```text
ticket/raw invocation
  -> parsed modes and immutable raw ticket
  -> acceptance and transient PR working spec
  -> context capability, context-value, and durable continuation plan
  -> architecture, ownership, and validation plan
  -> preferred/effective routing and backend capability evidence
  -> one task or integration/delivery checkout
  -> bounded implementation or isolated waves
  -> exact-content evidence and central integration
  -> repository checks and fresh review
  -> authorized delivery actions
  -> one final report and conservative cleanup
```

Run state is temporary or ignored and schema-v3 only. Its short `continuation`
block is authoritative workflow-control state after compaction; conversation
summaries and adapter reminders are not. Context-capable adapters re-read this
state at lifecycle boundaries and may inject only a bounded deterministic
reminder. Any state with another schema version is stale, rejected clearly,
and never migrated or guessed into a new shape; start a fresh run instead.

## Runtime capability boundary

The generic core records capability names such as `context_usage`,
`proactive_compaction`, `state_reinjection`, and `subagents`. Pi-specific
methods stay inside the Pi adapter. Capability resolution uses observed
runtime evidence first, then adapter declarations, documented static defaults,
and finally `unknown`; unknown capabilities degrade to durable checkpoints and
manual recovery rather than invented thresholds. The optional Pi
`swe_forge_subagent` bridge is only a capability handoff: canonical routing
still owns whether to delegate, and the adapter gates one negotiated bounded
run while preserving SOLO/sequential fallback and rejecting `ISOLATED` use.
