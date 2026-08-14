# Architecture

SWE Forge is a portable specification layer above coding harnesses. Its
architecture separates canonical workflow logic from role definitions,
contracts, policies, execution providers, and harness integrations. Execution
topology, provider, and delivery are orthogonal:

- topology controls coordination: `SOLO`, `SUBAGENTS`, or `ISOLATED`
- provider supplies isolated lifecycle capabilities only after hard eligibility:
  `NATIVE` or optional `HERDR` (`NONE` for non-isolated runs)
- delivery controls human checkpoints and authorized repository delivery:
  `GUIDED` or `PR`

## Canonical ownership and load map

```text
activation and lifecycle -> SWE-FORGE.md
ticket procedure -> workflows/ticket.md
isolated operational sequence -> workflows/isolated-execution.md
routing eligibility -> policies/execution-routing.md
provider capability -> policies/provider-selection.md
authorization and delivery -> policies/delivery.md
context continuity and compaction -> policies/context.md
evidence semantics -> policies/evidence.md
data shapes -> contracts/*
provider command translation -> providers/*
harness loading -> adapters/*
```

This map is normative for ownership. Files outside the owner summarize or
reference the rule; they do not redefine low-level behavior. Delivery branches
use the canonical `<type>/<short-kebab-case-description>` form without a
project-name prefix; only ephemeral isolated worker branches use internal
run/task namespacing.

Minimal load sets are stage-triggered:

- Every run loads `SWE-FORGE.md`, `workflows/ticket.md`, and the orchestrator
  role; `PR` adds specification and working-spec sources before specification.
- `AUTO` loads execution-routing before the topology decision; delegation adds
  its policy, relevant roles, model-routing when needed, and task/result/review
  contracts.
- Delivery loads before writable setup or delivery decisions; verification and
  evidence load before validation strategy or executable evidence. Long-running
  or context-risk tickets add context and run-state sources when triggered.
- `ISOLATED` adds provider-selection, delivery, run-state, result-bundle,
  isolated-execution, the selected provider runbook, and the isolated
  Git/evidence guard only after routing selects that topology.

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

## Routing boundary

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

## Delivery and evidence

`policies/delivery.md` is the sole owner of local-resource and delivery
authorization. In `GUIDED`, explicit isolated selection creates only a plan;
`continue` authorizes the exact setup and `go` authorizes one reviewed central
commit. Neither permits push, PR, publication, deployment, or merge. `PR`
authorizes the accepted local setup, worker transfer commits, validated central
commits, one final push, and one final PR, never publication, deployment, or
merge. A PR working spec also owns an ordered commit plan; each meaningful
validated step receives its own local or central commit before the next step.
Other files reference this rule rather than redefining it.

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
from the active installation root rather than a project-local `.swe-forge/`
tree. The adapter catalog is not installed into target projects.

## State flow

```text
ticket/raw invocation
  -> parsed modes and immutable raw ticket
  -> acceptance and transient PR working spec
  -> context capability and durable-state plan when relevant
  -> architecture, ownership, and validation plan
  -> hard/economic routing and provider evidence
  -> one task or integration/delivery checkout
  -> bounded implementation or isolated waves
  -> exact-content evidence and central integration
  -> repository checks and fresh review
  -> authorized delivery actions
  -> one final report and conservative cleanup
```

Run state is temporary or ignored and schema-v2 only. A discovered schema-v1
state is rejected with a compatibility message; it is never guessed into a
new shape.
