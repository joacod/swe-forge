# Example: Isolated Ticket With Herdr Provider

This example shows when isolated worktrees and independent processes justify
the `ISOLATED` topology. Herdr is the optional execution provider in this
example; it does not define the topology or replace the coding harness.
Replace command names with the installed Herdr binary's current help output.

## Ticket

```text
Add an order-cancellation flow to the storefront.

The API must expose cancellation with authorization and state validation. The
web application must add the customer action, confirmation UI, and refresh
behavior. API and web work can proceed independently after the cancellation
contract is agreed. Both packages have separate development servers.
```

## Discovery and Architecture

Evidence shows:

- `services/orders/` owns order state transitions and authorization.
- `apps/storefront/` owns customer order details and mutation hooks.
- The packages have separate test commands and dev servers.
- The API response contract can be agreed before either implementation begins.

The shared contract is:

- only the order owner or authorized support role may cancel
- only `pending` and `processing` orders can be cancelled
- cancellation returns the existing order resource shape
- repeated cancellation is idempotent
- the UI refreshes the order after success and shows the established error
  presentation for rejected transitions

## Routing and Provider Decision

```text
requested_mode: AUTO
execution_mode: ISOLATED
requested_provider: HERDR
execution_provider: HERDR
provider_reason: Herdr safely provides separate worktree-backed panes and independent development processes that the native harness cannot provide for this run.
parallel_strategy: COMPOSE
integration_strategy: CHERRY_PICK
requested_delivery: DEFAULT
delivery_mode: GUIDED
reason: API and web are independent writable packages with separate worktrees and long-running development servers; one orchestrator owns central integration.
fallback_used: no
```

The automatic isolated gate passes: two writable tasks are ready after the
cancellation contract foundation, their scopes do not overlap, shared contract
ownership is central, acceptance and validation are independent, their servers
can use unique resources, and parallel work reduces the critical path. The
orchestrator remains accountable for integration and final acceptance.

Herdr is optional. It requires `test "${HERDR_ENV:-}" = 1`, is not installed
automatically, and does not define workflow behavior. If the guard or required
provider capabilities are unavailable, the safe fallback is sequential
`SUBAGENTS` or `SOLO`; if required isolation would be lost, return `BLOCKED`.

## Integration Plan

```text
original checkout: untouched
integration worktree: <run-owned absolute path>
integration branch: swe-forge/<run-id>/integration
wave 0: cancellation contract and shared fixtures (orchestrator)
wave 1: cancel-order-api, cancel-order-web (at most two workers)
integration order: cancel-order-api, then cancel-order-web
shared artifacts: cancellation contract and root exports owned centrally
environment resources: unique API/UI ports and temporary test databases
```

The ticket has one integration/delivery branch and one final PR. Worker
branches are local-only, never pushed, and never receive PRs.

## Task Contracts

Each writable task records `task_id`, `objective`, `dependencies`,
`allowed_scope`, `forbidden_scope`, `shared_artifacts`, `acceptance`,
`validation`, `risk`, exact `base_sha`, `wave`, and `integration_order`.

```yaml
task_id: cancel-order-api
objective: Implement the authorized, idempotent cancellation endpoint.
reason: The API work is independently owned in an isolated worktree.
owner_role: implementer
dependencies: [cancellation-foundation]
requested_mode: AUTO
execution_mode: ISOLATED
requested_provider: HERDR
execution_provider: HERDR
provider_reason: Herdr provides the dedicated worker worktree and process lifecycle.
parallel_strategy: COMPOSE
integration_strategy: CHERRY_PICK
write_access: read-write
worktree_role: worker
worktree: dedicated
delivery_mode: GUIDED
working_spec_ref: external temporary working spec
checkout_baseline:
  path: <absolute API worktree path>
  head: <integration base SHA>
  branch: swe-forge/<run-id>/worker/cancel-order-api
  branch_kind: ephemeral_worker
  worktree_kind: worker
  branch_setup: auto-created
  classification: writable
  remote_default_evidence: <reference>
  staged: []
  unstaged: []
  untracked: []
integration:
  branch: swe-forge/<run-id>/integration
  worktree_path: <absolute integration worktree path>
  base_sha: <integration base SHA>
  checkpoint_sha: <foundation SHA>
worker:
  provider_id: <Herdr worker identity>
  branch: swe-forge/<run-id>/worker/cancel-order-api
  worktree_path: <absolute API worktree path>
  base_sha: <foundation SHA>
  source_commits: []
wave: 1
integration_order: 1
shared_artifacts:
  - artifact: cancellation contract
    owner: orchestrator
environment_isolation:
  setup_commands: [<API setup without shared migration>]
  copied_ignored_files: []
  ports: [<unique API port>]
  databases: [<unique API test database>]
  docker_projects: []
  temporary_directories: [<unique API temp path>]
  external_resources: []
  cleanup_commands: [<API cleanup>]
delegation:
  allowed: false
allowed_scope:
  - services/orders/**
forbidden_scope:
  - apps/storefront/**
  - integration worktree
  - pushes, PRs, merges, publication, deployment
acceptance:
  - unauthorized cancellation is rejected
  - invalid state is rejected with the established error shape
  - repeated cancellation is idempotent
testing:
  behavior: Authorized, state-valid, and idempotent cancellation at the API boundary.
  seam: Cancellation API response boundary.
  existing_coverage: <orders API tests or none found>
  approach: acceptance
  development_mode: test-after
  rationale: Cover authorization, invalid state, and repeat behavior through the API.
validation:
  - command: <orders API tests>
    requirement: required
    condition: always
    side_effects: local-only
risk: high
expected_output:
  - bounded implementation and test evidence
  - local transfer commit and structured worker result
authorization:
  create_branch: {status: authorized, provenance: explicit isolated invocation, scope: local worker branch}
  create_worktree: {status: authorized, provenance: explicit isolated invocation, scope: run-owned worker worktree}
  worker_transfer_commit: {status: authorized, provenance: explicit isolated invocation, scope: local transfer artifact}
  commit: {status: not-authorized, provenance: none, scope: integration branch}
  push: {status: not-authorized, provenance: none, scope: none}
  create_pull_request: {status: not-authorized, provenance: none, scope: none}
  publish: {status: not-authorized, provenance: none, scope: none}
  deploy: {status: not-authorized, provenance: none, scope: none}
  merge: {status: not-authorized, provenance: none, scope: none}
```

The web task uses the same provider, foundation base, wave, environment plan,
and local-only delivery permissions, but owns only `apps/storefront/**` and has
`integration_order: 2`.

## Execution and Integration

After the user authorizes the planned guided setup, the orchestrator verifies
`test "${HERDR_ENV:-}" = 1`, creates the integration worktree and two
namespaced worker worktrees, and starts one coding harness agent in each. The
workers receive only their canonical role, bounded task contract, relevant
architecture evidence, and validation commands.

All wave-one workers start from the same foundation `base_sha`. The orchestrator
waits for every worker to settle, verifies branch/worktree identity, exact base,
clean checkout, declared commits, scope, validation, and environment results,
then integrates in the recorded API-then-web order. Completion order never
changes that order. For each unit it applies the worker transfer commit without
immediately finalizing, runs integrated validation, creates the final central
commit, and records the source-to-integration mapping.

A conflict or unexplained dirty state stops the operation safely and preserves
the worker resources. The orchestrator never force-cleans or silently resolves
an independence conflict.

## Review, Cleanup, and Acceptance

A fresh reviewer receives the original ticket, cancellation foundation, task
contracts, worker results, integrated diff, source-to-integration mappings, and
all validation output. It checks authorization, state transitions, idempotency,
UI gating, error handling, concurrency, environment isolation, integration
order, and accidental cross-scope changes.

After final acceptance and one PR creation, only run-owned clean worktrees and
safely deletable integrated worker branches may be removed. User-owned sessions,
branches, and the Herdr server are left untouched. Dirty or unresolved
resources remain and are reported. The integration branch remains for the PR.

The final report records:

```text
requested_mode: AUTO
execution_mode: ISOLATED
requested_provider: HERDR
execution_provider: HERDR
parallel_strategy: COMPOSE
integration_strategy: CHERRY_PICK
requested_delivery: DEFAULT
delivery_mode: GUIDED
result: ACCEPTED | BLOCKED | FAILED
integration_branch: <one branch>
worker_worktrees: api, web
validation: API checks, UI checks, cross-package checks, and review result
fallback_used: no
remaining_risks: <explicitly state any unresolved risk>
```
