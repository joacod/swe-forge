# Architecture

SWE Forge is a portable specification layer above coding harnesses. Its
architecture separates canonical workflow logic from role definitions,
contracts, policies, and integrations. Execution topology and delivery mode are
orthogonal: the former controls coordination, while the latter controls human
checkpoints and authorized repository delivery.

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
        +------------------+------------------+
        |                  |                  |
   role specs          contracts           policies
        |                  |                  |
        +------------------+------------------+
                           |
                    orchestrator
                           |
          +----------------+----------------+
          |                |                |
        SOLO          SUBAGENTS           HERDR
          |                |                |
      one context     native workers    isolated worktrees
                           |
                    verify and review
                           |
                         result
```

## Canonical Layer

`SWE-FORGE.md` owns activation, topology principles, lifecycle, acceptance,
failure boundaries, and final reporting. The ticket procedure is loaded from
`.swe-forge/workflows/ticket.md` after explicit activation.

`AGENTS.md` is intentionally small. It tells compatible agents that Forge
exists and prevents automatic activation. `CLAUDE.md` only imports
`AGENTS.md` for Claude Code compatibility.

## Role Layer

Roles in `.swe-forge/agents/` describe responsibilities, permissions,
constraints, and output expectations in harness-neutral Markdown. They are not
native agent configuration files. A harness adapter may wrap a role with native
frontmatter, but the wrapper must load the canonical role rather than copy it.

The orchestrator is the hub. Workers do not form an unrestricted peer network
or own final acceptance.

## Contract Layer

Contracts make coordination explicit without using agent conversation as shared
state:

- task contracts bound objective, ownership, scope, dependencies, acceptance,
  checkout baseline, validation criticality, recursive delegation, and
  per-action authorization provenance
- worker results expose status, files, tests, evidence, assumptions, risks, and
  follow-ups
- review results expose severity, confidence, location, evidence, and action
- run state records temporary topology and delivery mode, checkout identity,
  task statuses, dependencies, authorization, validation, review, retries,
  checkpoints, and cleanup

Run state is external or ignored by default. It is not application source and
must not contain secrets or full transcripts.

## Policy Layer

Policies define how to route, delegate, select capability classes, specify,
deliver, verify, and recover. They are deliberately separate from role
descriptions so a routing or human-control change does not silently redefine
worker responsibilities.

## Execution Topologies

`SOLO` is a complete workflow with one context, not a shortcut around
verification. `SUBAGENTS` uses native workers when independent work is useful.
`HERDR` is selected only when process, worktree, harness, or context isolation
is the actual requirement.

The invariant for all topologies is that concurrent writing workers never share
one checkout. Herdr workers use separate worktrees and integrate centrally.

## Delivery Modes

Delivery is orthogonal to topology:

- `GUIDED` is the default human-control path. It creates review checkpoints
  between cohesive implementation slices and leaves commit, push, PR, and merge
  actions separate.
- `PR` is an explicit low-touch path. It creates a transient working spec when
  needed, proceeds through required verification and fresh review, and may
  commit, push, and create a PR after the gates. It never merges.

The canonical delivery policy owns action authorization and the post-merge
`git-sync` boundary. Harness commands and prompts are thin loaders, so pushing
cannot accidentally create a PR.

## Adapter Boundary

Adapters under `.swe-forge/adapters/` expose canonical behavior through current
harness features. The `registry.tsv` file is the installation source of truth:
it maps one harness and scope to an artifact kind, source payload, destination,
and optional global canonical support directory.

The installer consumes the registry generically for preflight, link/copy,
verification, and collision handling. Adding a harness should normally add a
payload folder and registry rows rather than new installer branches.

Adapter artifacts may be:

- explicit commands, skills, or prompt templates that load the canonical workflow
- native role bridges that load one portable role
- shared projections such as the Agent Skill package used by Codex and Cursor
- optional runbooks such as Herdr's isolated execution procedure

Permissions, models, and capability mappings remain host-owned. An adapter may
be incomplete without affecting natural-language activation, which keeps the
portable repository usable in a harness with no native command, skill, or
subagent support. The adapter catalog is source-only; project installations
receive only the selected projection.

## State Flow

```text
ticket
  -> acceptance criteria and assumptions
  -> transient working spec when PR mode needs alignment
  -> evidence and architecture
  -> bounded task graph or guided review slices
  -> execution topology and delivery mode
  -> checkpoints (GUIDED) or uninterrupted waves (PR)
  -> structured results
  -> integrated diff
  -> quality gates
  -> fresh review
  -> repair if needed
  -> authorized commit/push/PR actions, if applicable
  -> human merge and explicit post-merge sync
  -> final acceptance report
```

The original ticket remains authoritative at every step. A transient working
spec may organize intent, scenarios, assumptions, and validation, but it is
never committed or treated as a second source of truth. Worker summaries, stale
run state, and model confidence cannot override final diff inspection and
verification evidence.

## Extensibility

The repository currently has one general ticket workflow. Delivery mode is a
policy within that workflow rather than a second lifecycle. Future workflows
should reuse the existing contracts and policies, add only workflow-specific
decisions, and remain explicitly invoked. New roles and adapters require
evidence that the specialization improves outcomes enough to justify its
maintenance cost.

Harness compatibility should prefer a shared projection when vendors support
the same standard. Keep vendor-specific files only for native syntax or
behavior that cannot be represented by the shared artifact.
