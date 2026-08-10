# Architecture

SWE Forge is a portable specification layer above coding harnesses. Its
architecture separates canonical workflow logic from role definitions,
contracts, policies, and integrations.

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
failure boundaries, and final reporting. The V1 ticket procedure is loaded from
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
  validation, and commit policy
- worker results expose status, files, tests, evidence, assumptions, risks, and
  follow-ups
- review results expose severity, confidence, location, evidence, and action
- run state records temporary topology, task statuses, dependencies, review,
  and retries

Run state is external or ignored by default. It is not application source and
must not contain secrets or full transcripts.

## Policy Layer

Policies define how to route, delegate, select capability classes, verify, and
recover. They are deliberately separate from role descriptions so a routing
change does not silently redefine worker responsibilities.

## Execution Topologies

`SOLO` is a complete workflow with one context, not a shortcut around
verification. `SUBAGENTS` uses native workers when independent work is useful.
`HERDR` is selected only when process, worktree, harness, or context isolation
is the actual requirement.

The invariant for all topologies is that concurrent writing workers never share
one checkout. Herdr workers use separate worktrees and integrate centrally.

## Adapter Boundary

Adapters under `.swe-forge/adapters/` expose canonical behavior through current
harness features:

- explicit commands or skills load the canonical workflow
- native role bridges load one portable role
- permissions are mapped by adapter and user configuration
- capability classes are mapped to user-selected models
- Herdr runbooks control isolation without becoming the workflow

An adapter may be incomplete without affecting natural-language activation.
This makes the portable repository usable in a harness with no native command,
skill, or subagent support.

## State Flow

```text
ticket
  -> acceptance criteria and assumptions
  -> evidence and architecture
  -> bounded task graph
  -> execution mode and worker waves
  -> structured results
  -> integrated diff
  -> quality gates
  -> fresh review
  -> repair if needed
  -> final acceptance report
```

The original ticket remains authoritative at every step. Worker summaries,
stale run state, and model confidence cannot override final diff inspection and
verification evidence.

## Extensibility

V1 has one general ticket workflow. Future workflows should reuse the existing
contracts and policies, add only workflow-specific decisions, and remain
explicitly invoked. New roles and adapters require evidence that the
specialization improves outcomes enough to justify its maintenance cost.
