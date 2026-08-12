# Architecture

SWE Forge is a portable specification layer above coding harnesses. Its
architecture separates canonical workflow logic from role definitions,
contracts, policies, execution providers, and harness integrations. Execution
topology, execution provider, and delivery mode are orthogonal:

- topology controls coordination (`SOLO`, `SUBAGENTS`, or `ISOLATED`)
- provider supplies isolated lifecycle capabilities only when `ISOLATED` is
  selected (`NATIVE`, optional `HERDR`, or `NONE` for non-isolated runs)
- delivery controls human checkpoints and authorized repository delivery
  (`GUIDED` or `PR`)

## Layers

```text
                              User
                                |
                      explicit "Use SWE Forge"
                                |
                                v
                         SWE-FORGE.md
                      canonical workflow layer
                                |
        +-----------------------+-----------------------+
        |                       |                       |
   role specs              contracts                 policies
        |                       |                       |
        +-----------------------+-----------------------+
                                |
                         root orchestrator
                                |
       +----------------+-------+----------------+
       |                |                        |
     SOLO           SUBAGENTS                ISOLATED
   one context    native read-only or       isolated writable
                  sequential writers       execution environments
                                                |
                                  +-------------+-------------+
                                  |                           |
                              NATIVE                       HERDR
                         harness worktrees        optional provider panes,
                           when demonstrable      sessions, and worktrees
                                                |
                         central integration and delivery
                                                |
                                   verify, review, result
```

`NATIVE` and `HERDR` are providers, not additional topology branches. The
workflow remains portable even when a particular harness cannot provide
`ISOLATED`; routing records the limitation and falls back safely or blocks.

## Canonical Layer

`SWE-FORGE.md` owns activation, topology principles, provider/delivery
orthogonality, lifecycle, acceptance, failure boundaries, and final reporting.
The ticket procedure is loaded from `.swe-forge/workflows/ticket.md` after
explicit activation. It loads `.swe-forge/workflows/isolated-execution.md` only
after routing selects `ISOLATED` and provider selection records the provider
boundary.

`AGENTS.md` is intentionally small. It tells compatible agents that Forge
exists and prevents automatic activation. `CLAUDE.md` only imports `AGENTS.md`
for Claude Code compatibility.

## Role Layer

Roles in `.swe-forge/agents/` describe responsibilities, permissions,
constraints, and output expectations in harness-neutral Markdown. They are not
native agent configuration files. A harness adapter may wrap a role with native
frontmatter, but the wrapper must load the canonical role rather than copy it.

The orchestrator is the hub. Workers do not form an unrestricted peer network
or own final acceptance. An execution provider may supervise lifecycle state,
but provider state is scheduling evidence only.

Optional specialist skills are domain playbooks loaded on demand. They may
inform architecture, implementation, or review, but they do not own a task,
override canonical instructions, or authorize delivery actions. Keep their
bundled references and tooling subject to the same scope and validation gates.

## Contract Layer

Contracts make coordination explicit without using agent conversation as shared
state:

- task contracts bind objective, ownership, scope, dependencies, exact bases,
  waves, shared-artifact owners, environment isolation, acceptance, validation,
  checkout identity, recursive delegation, and per-action authorization
- worker results expose status, provider/branch/worktree identity, base and head
  SHAs, local transfer commits, files, validation, scope exceptions, checkout
  cleanliness, environment resources, assumptions, risks, and follow-ups
- review results expose severity, confidence, location, evidence, integration
  mappings, and action
- receipt contracts define the compact public evidence summary and its
  non-claiming rules
- run state records temporary topology/provider and delivery mode, integration
  branch/worktree, ephemeral worker resources, tasks and dependencies, waves,
  source-to-integration mappings, authorization, validation, review, retries,
  environment resources, checkpoints, and cleanup

Run state is external or ignored by default. It is not application source and
must not contain secrets or full transcripts. The integration/delivery branch
is distinct from ephemeral worker branches; worker transfer commits are
distinct from final central integration commits. An optional executable
evidence ledger records preflight, validation, checkpoints, and receipts
without becoming a second source of truth.

## Policy Layer

Policies define how to route, select a provider, delegate, select capability
classes, specify, deliver, verify, record evidence, and recover. They are
deliberately separate from role descriptions so a routing or human-control
change does not silently redefine worker responsibilities.

`execution-routing.md` defines the automatic `ISOLATED` gate and the distinction
between read-only/sequential `SUBAGENTS` and concurrent writable isolated
worktrees. `provider-selection.md` defines demonstrable native capabilities,
optional Herdr benefits and guard, and conservative fallback. The only isolated
v1 strategy is `COMPOSE`; the orchestrator integrates worker transfer artifacts
using the planned `CHERRY_PICK` behavior.

## Execution Topologies

`SOLO` is a complete workflow with one context, not a shortcut around
verification. `SUBAGENTS` uses native workers for independent read-only work or
sequential bounded writable delegation in one checkout. Concurrent writable
workers with separate worktrees are `ISOLATED`, even when a harness provides
the worktrees natively.

`ISOLATED` is used when concurrent writable work requires separate execution
environments. SWE Forge may use native harness worktree agents or Herdr as the
provider. It still produces one integration branch and one final PR.

The automatic isolated gate requires two ready writable tasks, satisfied
dependencies, non-overlapping scopes, explicit shared-artifact ownership,
independent acceptance and validation, a stable foundation, safe runtime
resources, material critical-path benefit, and one accountable orchestrator.
Shared schemas, migrations, unsettled architecture, unsafe resources, root
lockfile conflicts, frequent cross-worker decisions, one ordered reasoning
chain, unverified submodules, or excessive integration overhead require
serialization.

## Isolated Integration Boundary

An isolated ticket uses:

```text
original checkout (untouched)
  -> one run-owned integration worktree
  -> one safe integration/delivery branch
  -> wave 0 shared foundation
  -> wave 1..N local-only worker branches/worktrees
  -> planned central integration order
  -> one final pushed branch and one PR
```

Every worker gets a dedicated worktree, local branch, exact base SHA, bounded
task contract, and no integration-checkout or delivery authority. At most two
concurrent writable workers are used by default. All workers in a wave start
from the same integration `HEAD`; wave barriers wait for every result, verify
Git and validation evidence, integrate in dependency/plan order, and run
wave-level validation before launching the next wave. Completion order never
determines integration order.

The orchestrator applies worker transfer commits without immediately finalizing
the central commit, validates the integrated state, creates the final
repository-appropriate commit, and records the source-to-integration mapping.
It does not blindly merge branches or copy worktrees. A conflict among tasks
classified as independent is a decomposition error to preserve and re-evaluate,
not a silent-resolution opportunity.

## Environment and Shared Artifacts

Worktrees do not isolate ports, databases, Docker projects, temporary paths,
external services, credentials, or Git refs. Isolated plans record setup
commands, explicitly allowlisted ignored files, unique resources, external
effects, and cleanup commands. Setup commands are inspected before execution;
migrations and shared persistent environments need separate authorization.

Root lockfiles, shared type indexes, generated clients, schemas, snapshots,
migration registries, root exports, changelogs, and version files have one
explicit owner. Prefer package-local worker ownership and central integration
ownership for shared generated artifacts.

## Delivery Modes

Delivery is orthogonal to topology and provider:

- `GUIDED` is the default human-control path. For normal work it creates or
  reuses one task branch; for `ISOLATED` it shows a setup checkpoint before
  multiple worker resources and keeps one integration/delivery branch. `go`
  commits the reviewed current central slice; push, PR, and merge remain
  separate actions.
- `PR` is an explicit low-touch path. It creates a transient working spec when
  needed, commits each validated slice or central integration unit separately,
  runs required verification and fresh review, then pushes one delivery branch
  and creates one concise PR. It never merges.

An explicit `isolated` token authorizes bounded local integration and worker
resources and local worker transfer commits, not integration-branch commits,
pushes, PRs, or merges. An explicit `PR` token authorizes validated central
commits, the final push, and one PR. Worker branches never receive delivery
actions.

The canonical delivery policy owns branch/worktree setup, action
authorization, PR history and descriptions, compact receipt placement, central
integration, cleanup, and
the post-merge `git-sync` boundary. Harness commands and prompts are thin
loaders, so pushing cannot accidentally create a PR or syncing cannot assume
that a PR was merged.

## Provider Boundary

Providers are documented under `.swe-forge/providers/`, not under harness
adapters. Herdr is optional and must not be installed automatically. It does
not define SWE Forge behavior or replace the coding harness. Its control
commands require `HERDR_ENV=1`; its lifecycle state is scheduling evidence
only. Structured worker results, Git evidence, validation, and central
integration remain authoritative.

A native harness can satisfy the same provider contract when it can launch at
least two concurrent writable worktree workers from exact bases, keep them out
of the integration checkout, return structured results, expose wait/inspect/
cancel/cleanup, and leave integration with the root orchestrator. If neither
provider can preserve required isolation, route to sequential `SUBAGENTS` or
`SOLO` when safe or return `BLOCKED`.

## Adapter Boundary

Adapters under `.swe-forge/adapters/` expose canonical behavior through current
harness features. The `registry.tsv` file is the installation source of truth:
it maps one harness and scope to an artifact kind, source payload, destination,
and optional global canonical support directory.

The installer consumes the registry generically for preflight, link/copy,
verification, and collision handling. Registry rows are validated as managed
relative paths before any target is written, so a malformed adapter cannot
redirect an installation outside its selected destination. Adding a harness
should normally add a payload folder and registry rows rather than new
installer branches.

Adapter artifacts may be:

- explicit commands, skills, or prompt templates that load the canonical
  workflow
- native role bridges that load one portable role
- shared projections such as the Agent Skill package used by Codex and Cursor
- host capability documentation that does not redefine provider behavior

Permissions, models, and capability mappings remain host-owned. An adapter may
be incomplete without affecting natural-language activation, which keeps the
portable repository usable in a harness with no native command, subagent, or
isolated-worker support. The adapter catalog is source-only; project
installations receive only the selected projection.

## State Flow

```text
ticket and raw invocation
  -> parsed modes/providers and immutable original ticket
  -> acceptance criteria and assumptions
  -> transient working spec when PR mode needs alignment
  -> evidence and architecture
  -> foundation and bounded task graph or guided review slices
  -> topology and provider decision
  -> one normal task branch or one isolated integration branch/worktree
  -> optional isolated worker waves and structured results
  -> central integration, mappings, and wave validation
  -> quality gates
  -> fresh review
  -> repair if needed
  -> authorized commits, one push, and one PR when applicable
  -> verified human merge and explicit post-merge sync
  -> final acceptance report and conservative cleanup
```

The original ticket remains authoritative at every step. A transient working
spec may organize intent, scenarios, assumptions, and validation, but it is
never committed or treated as a second source of truth. Worker summaries,
provider lifecycle state, stale run state, and model confidence cannot override
final diff inspection and integrated verification.

## Extensibility

The repository currently has one general ticket workflow and one conditional
isolated-execution workflow. Add another workflow only when real tickets
demonstrate that a distinct lifecycle and acceptance strategy is worth
maintaining.

Optional specialist skills are a separate extension path for guidance that is
useful on some tickets but too specific for the default context. Keep
third-party skills outside the canonical tree and expose them through thin,
explicitly invoked harness loaders when useful. Do not add an installer registry
entry or permanent workflow phase until representative tickets demonstrate a
repeatable benefit.

Harness compatibility should prefer a shared projection when vendors support
the same standard. Keep vendor-specific files only for native syntax or
behavior that cannot be represented by the shared artifact. `ISOLATED` is
portable as a workflow contract, not a promise that every harness has the
required provider capability.
