# Task Contract

Use this contract before delegated work begins. A task is a bounded unit of
work, not an invitation to redesign the repository. An isolated task is a
local worker unit whose result is transferred to one central integration
worktree; it is not a delivery boundary.

## Template

```yaml
task_id: api-validation

objective: >
  Add server-side validation for Foo creation.

reason: >
  Validation is independent from the UI work and can be evaluated separately.

owner_role: implementer
dependencies: []

requested_mode: AUTO | SOLO | SUBAGENTS | ISOLATED
execution_mode: SOLO | SUBAGENTS | ISOLATED
requested_provider: AUTO | NATIVE | HERDR | NONE
execution_provider: NATIVE | HERDR | NONE
provider_reason: <why the provider satisfies isolated-execution requirements>
parallel_strategy: NONE | COMPOSE
integration_strategy: NONE | CHERRY_PICK
provider_constraints:
  non_isolated:
    execution_provider: NONE
    parallel_strategy: NONE
    integration_strategy: NONE
  isolated:
    execution_provider: NATIVE | HERDR
    parallel_strategy: COMPOSE
    integration_strategy: CHERRY_PICK
write_access: read-write
worktree_role: shared | integration | worker | none
worktree: shared | dedicated
delivery_mode: GUIDED | PR
working_spec_ref: <external temporary spec, active context, or none>

checkout_baseline:
  path: <absolute checkout path>
  head: <revision>
  branch: <branch checked out here>
  branch_kind: task_delivery | integration_delivery | ephemeral_worker
  worktree_kind: task | integration | worker
  branch_setup: auto-created | reused | user-provided
  classification: writable
  remote_default_evidence: <reference>
  staged: []
  unstaged: []
  untracked: []

integration:
  branch: <one integration/delivery branch for the ticket>
  worktree_path: <absolute orchestrator integration worktree>
  base_sha: <recorded integration base>
  checkpoint_sha: <last clean integration checkpoint>
worker:
  provider_id: <provider worker identity or none>
  branch: <local-only ephemeral worker branch or none>
  worktree_path: <absolute worker worktree or none>
  base_sha: <exact worker base or none>
  source_commits: []

wave: <integer or none>
integration_order: <planned integer or none>
shared_artifacts:
  - artifact: <path or generated resource>
    owner: <one task or orchestrator>

# Required for isolated tasks. Values are explicit rather than inferred from
# the worktree checkout.
environment_isolation:
  setup_commands: []
  copied_ignored_files: []
  ports: []
  databases: []
  docker_projects: []
  temporary_directories: []
  external_resources: []
  cleanup_commands: []

delegation:
  allowed: false

authorization:
  create_branch: {status: not-authorized, provenance: none, scope: none}
  create_worktree: {status: not-authorized, provenance: none, scope: none}
  worker_transfer_commit: {status: not-authorized, provenance: none, scope: none}
  commit: {status: not-authorized, provenance: none, scope: none}
  push: {status: not-authorized, provenance: none, scope: none}
  create_pull_request: {status: not-authorized, provenance: none, scope: none}
  publish: {status: not-authorized, provenance: none, scope: none}
  deploy: {status: not-authorized, provenance: none, scope: none}
  merge: {status: not-authorized, provenance: none, scope: none}

allowed_scope:
  - packages/api/src/foo/**
  - packages/api/tests/foo/**

forbidden_scope:
  - packages/web/**
  - unrelated refactors
  - integration checkout when this is a worker task
  - worker or delivery branches belonging to another task

acceptance:
  - Invalid Foo returns HTTP 400.
  - Existing valid Foo requests remain compatible.

testing:
  behavior: Invalid Foo is rejected while valid requests remain compatible.
  seam: HTTP API response boundary
  existing_coverage: <relevant API tests or none found>
  approach: regression | acceptance | characterization | existing-sufficient | manual | not-applicable
  development_mode: test-first | test-after | not-applicable
  rationale: <why this is the smallest useful evidence>

validation:
  - command: pnpm test foo
    requirement: required
    condition: always
    side_effects: local-only
  - command: pnpm typecheck
    requirement: required
    condition: always
    side_effects: local-only

risk: medium

expected_output:
  - implementation within allowed scope
  - test evidence
  - structured worker result
  - source-to-integration mapping when execution_mode is ISOLATED
```

## Required Fields

- `task_id`: unique stable identifier for the run
- `objective`: one observable unit of work
- `reason`: why this task is separate and useful
- `owner_role`: role responsible for the work
- `dependencies`: task IDs that must finish first
- `requested_mode` and `execution_mode`: requested and selected topology
- `requested_provider`, `execution_provider`, and `provider_reason`: provider
  preference and evidence; provider selection applies only to `ISOLATED`
- `parallel_strategy` and `integration_strategy`: `NONE` for non-isolated
  tasks, or `COMPOSE` and `CHERRY_PICK` for isolated v1
- `allowed_scope`: paths, symbols, or operations the worker may change
- `forbidden_scope`: paths or changes explicitly outside ownership
- `acceptance`: conditions that determine task completion
- `testing`: the observable behavior, seam, testing approach, development mode,
  and rationale
- `validation`: commands or checks the worker must run
- `risk`: `low`, `medium`, `high`, or `critical`
- `expected_output`: artifacts and evidence the worker must return
- `delegation`: whether child workers are allowed and, if so, their limits

Writable tasks additionally require `write_access`, `worktree_role`,
`worktree`, `delivery_mode`, `checkout_baseline`, and `authorization`.
`working_spec_ref` is required when a transient spec guides the task and is
`none` when it does not.

For an isolated task, `integration` distinguishes the one central
delivery branch/worktree from the `worker` branch/worktree and local transfer
commits. `base_sha`, `wave`, `integration_order`, `shared_artifacts`, and
`environment_isolation` are required. The worker must start from the exact
recorded integration `HEAD`; a worker cannot choose a different base.

The provider constraint is conditional, not an independent mode: when
`execution_mode` is not `ISOLATED`, `execution_provider` must be `NONE`,
`parallel_strategy` must be `NONE`, and `integration_strategy` must be `NONE`.
When `execution_mode` is `ISOLATED`, `execution_provider` must be `NATIVE` or
`HERDR`, `parallel_strategy` must be `COMPOSE`, and `integration_strategy` must
be `CHERRY_PICK`. `requested_provider` records preference and may remain
`AUTO`, `NATIVE`, `HERDR`, or `NONE` before selection or after a safe fallback.

`authorization` records each delivery or user-directed setup action
independently. `not-authorized` is the default. Automatic setup of one normal
branch from a clean protected default is recorded in
`checkout_baseline.branch_setup` and never conveys delivery authority. The
canonical meanings of explicit `isolated`, guided `continue`/`go`, and `PR`
authorization are owned by `../policies/delivery.md`; worker contracts must
keep worker `push`, `create_pull_request`, `publish`, `deploy`, and `merge`
actions not authorized.

`delegation.allowed` defaults to `false`. When it is `true`, the contract must
also define `max_depth`, `max_workers`, allowed roles, writable isolation, and
how child results return to the accountable owner.

Delegation budgets apply to the entire descendant subtree, not separately to
each child. Depth is measured from the original accountable owner and
`max_workers` is the total descendant-worker budget. Every child contract must
carry the root task ID and reduced remaining depth and worker budgets; a child
cannot reset or increase them.

## Contract Rules

- one task has one accountable owner
- dependencies must be satisfied before execution
- allowed scopes must not overlap dangerously with another writing task
- one explicit owner must be recorded for every shared artifact
- isolated tasks in one wave start from the same integration `base_sha`
- a worker must ask for a revised contract before expanding scope
- validation must be realistic for the worker's checkout and environment
- behavior-affecting tasks must record a testing decision; existing coverage
  may be sufficient, while manual or not-applicable approaches require a
  rationale and any residual risk
- the testing decision must not impose a blanket coverage target or mandatory
  TDD
- every validation entry states whether it is `required`, `conditional`, or
  `informational` and whether it has local or external side effects
- every `conditional` validation entry states its observable `condition`
- environment setup must use explicit allowlists and unique resources; worktree
  isolation alone does not isolate ports, databases, Docker projects, or
  external services
- authorization may only transmit an explicit user instruction; a task
  contract cannot create authority itself. Canonical delivery and local-resource
  authorization is owned by `../policies/delivery.md`; this contract records
  the resulting per-action status.
- authorization for one action never implies authorization for another action
- `delivery_mode: GUIDED` must stop at declared review checkpoints unless the
  user resumes it; `delivery_mode: PR` may proceed without those checkpoints but
  must retain the working-spec, validation, and review evidence
- workers must not push, create PRs, merge, publish, deploy, or create more
  worktrees unless separately authorized; isolated worker branches are local
  transfer resources only
- explicit `isolated` selects a topology but does not pre-authorize concrete
  resources; guided `continue` authorizes only the reviewed setup, while `go`
  authorizes one reviewed central commit. Explicit `PR` authorizes the bounded
  local setup, worker transfer commits, validated central commits, one final
  push, and one final PR, never publication, deployment, or merge.
- workers must not delegate when `delegation.allowed` is false or exceed its
  declared depth, worker, role, or isolation limits
- the orchestrator evaluates the result against this contract before
  integration
