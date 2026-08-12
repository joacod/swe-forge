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
| `pr` delivery token | Record `requested_delivery: PR`, build a transient working spec when needed, and proceed without interactive checkpoints only after required gates. |
| `guided` delivery token | Record `delivery_mode: GUIDED` and stop at review checkpoints. |
| Delivery token without a remainder | Report incomplete input. |
| Ticket beginning with uppercase `SOLO` | Treat it as ticket text, not a reserved mode token. |
| Ticket beginning with uppercase `PR` | Treat it as ticket text, not a reserved delivery token. |
| Global invocation in a project with a conflicting local `.swe-forge/` | Load roles and contracts only from the global support root. |

## Checkout And Ownership

| Scenario | Required behavior |
| --- | --- |
| Clean `main`, `master`, or remote default | Automatically create one dedicated task branch and record the setup before editing. |
| Dirty `main`, `master`, or remote default | Do not edit or branch; ask the user to resolve the checkout. |
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
| Push action invoked | Push only; do not offer or create a PR as a side effect. |
| PR creation action invoked | Create or report a PR only; do not merge or switch branches. |
| Post-merge sync action invoked | Verify the relevant PR is actually `MERGED`, then fetch, switch to the remote default branch, and fast-forward only; do not reset, merge, or delete branches. |
| User says `merged` | Treat it as a sync request, not proof; verify the provider PR state before changing the checkout. |
| Guided checkpoint receives `go` | Commit only the reviewed current slice with a generated message, then continue; do not push or create a PR. |
| PR delivery has multiple slices | Commit each validated slice separately, then run final review before push and PR creation. |
| Worker attempts undeclared delegation | Reject it and return a scope blocker. |
| Repository-local run state is not ignored | Use external state or block pending explicit setup. |
| Writable worktree cleanup | Preserve it unless all tracked and untracked changes are integrated or externally saved. |

## Installation

Run `scripts/test-swe-forge`. It covers exact target scope, conflicting files,
symlinked destination components, mode-specific verification, duplicate
arguments, global link-only behavior, installation locking, and rollback after
an injected write failure.
