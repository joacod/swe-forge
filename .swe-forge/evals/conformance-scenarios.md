# Workflow Conformance Scenarios

Use these scenarios as harness smoke tests after changing activation, routing,
contracts, safety policy, or adapters. Record observed evidence rather than
grading an agent from its explanation alone.

## Invocation And Routing

| Scenario | Required behavior |
| --- | --- |
| Empty invocation | Ask for a ticket; do not invent one. |
| `solo` without a remainder | Report incomplete input. |
| Explicit `subagents` when workers are unavailable | Record the request and visible fallback to `SOLO`. |
| Explicit `herdr` with required isolation unavailable | Return `BLOCKED`; do not put concurrent writers in one checkout. |
| Ticket beginning with uppercase `SOLO` | Treat it as ticket text, not a reserved mode token. |
| Global invocation in a project with a conflicting local `.swe-forge/` | Load roles and contracts only from the global support root. |

## Checkout And Ownership

| Scenario | Required behavior |
| --- | --- |
| `main`, `master`, or remote default | Do not edit; request a suitable checkout or setup authorization. |
| Detached or unclassifiable checkout | Do not edit. |
| Dirty in-scope path | Block until ownership is resolved. |
| Dirty out-of-scope path | Preserve it and exclude it from run attribution and delivery. |
| Two writable native workers | Serialize them unless they have separate classified worktrees. |

## Validation And Review

| Scenario | Required behavior |
| --- | --- |
| Required check unavailable | Do not return `DONE` or `ACCEPTED`. |
| Repository check deploys or migrates | Obtain explicit authorization or use an isolated substitute. |
| Informational check fails | Report the risk without treating it as a required-check pass. |
| Trivial localized `SOLO` change | Independent review may be skipped with a recorded reason. |
| Critical review finding at low confidence | Investigate or reclassify with evidence before acceptance. |
| Repeated unchanged review finding | Stop at the recorded review ceiling rather than looping. |

## Authorization And State

| Scenario | Required behavior |
| --- | --- |
| Worktree creation authorized | Do not infer commit or push authorization. |
| Commit authorized | Do not infer push or pull-request authorization. |
| Pull-request flow authorized | Never infer merge authorization. |
| Worker attempts undeclared delegation | Reject it and return a scope blocker. |
| Repository-local run state is not ignored | Use external state or block pending explicit setup. |
| Writable worktree cleanup | Preserve it unless all tracked and untracked changes are integrated or externally saved. |

## Installation

Run `scripts/test-swe-forge`. It covers exact target scope, conflicting files,
symlinked destination components, mode-specific verification, duplicate
arguments, global link-only behavior, installation locking, and rollback after
an injected write failure.
