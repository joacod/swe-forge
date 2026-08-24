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

# Run-level request, live topology, provider selection, integration strategy,
# and delivery mode are owned by the active run state. They are intentionally
# absent from the task contract; the launch-time worker briefing derives only
# the bounded current execution facts a worker needs.
write_access: read-write
worktree_role: shared | integration | worker | none
worktree: shared | dedicated
working_spec_ref: <external temporary spec, active context, or none>

# Bounded workers receive a generated projection rather than the complete task
# or run state. They cannot recursively run the root workflow unless the
# contract explicitly authorizes it. The renderer derives mode, permissions,
# result profile, contract reference, and conditional execution fields.
worker_mode:
  role: delegated_worker | root_orchestrator
  depth: <integer from root owner>
  root_task_id: <root task id or none>
  max_descendant_workers: 0
  recursive_delegation: false

# These are semantic task inputs. The root selects them; the launch-time
# worker-brief-input/v1 records copy them into the canonical renderer input.
repository_instructions: [<relevant instruction paths>]
allowed_reads: [<paths or symbols>]
architecture_decisions: [<task-relevant decisions or none>]

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
  max_depth: 0
  max_workers: 0
  allowed_roles: []
  child_result_contract: ../contracts/result.md

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
  - source-to-integration mapping for an isolated writable task
```

## Required Fields

- `task_id`: unique stable identifier for the run
- `objective`: one observable unit of work
- `reason`: why this task is separate and useful
- `owner_role`: role responsible for the work
- `dependencies`: task IDs that must finish first
- `write_access`, `worktree_role`, and `worktree`: task-local permissions and
  checkout requirements; they do not select the run topology
- `worker_mode`: bounded worker mode, depth, root task, and zero descendant
  workers by default; delegated workers default to depth 1
- `repository_instructions`, `allowed_reads`, and `architecture_decisions`:
  semantic context selected by the root for this task
- `allowed_scope`: paths, symbols, or operations the worker may change
- `forbidden_scope`: paths or changes explicitly outside ownership
- `acceptance`: conditions that determine task completion
- `testing`: the observable behavior, seam, testing approach, development mode,
  and rationale
- `validation`: commands or checks the worker must run
- `risk`: `low`, `medium`, `high`, or `critical`
- `expected_output`: artifacts and evidence the worker must return
- `delegation`: whether child workers are allowed and, if so, their limits

The task contract deliberately omits run-level request, live topology, provider
selection, integration strategy, and delivery mode. The active run state is
authoritative; the orchestrator renders the current bounded execution facts
into the worker briefing immediately before launch. A concrete task-specific
execution constraint remains task-scoped rather than copying selected run
state.

Writable tasks additionally require `write_access`, `worktree_role`,
`worktree`, `checkout_baseline`, and `authorization`. `working_spec_ref` is
required when a transient spec guides the task and is `none` when it does not.

For an isolated task, `integration` distinguishes the one central
delivery branch/worktree from the `worker` branch/worktree and local transfer
commits. `base_sha`, `wave`, `integration_order`, `shared_artifacts`, and
`environment_isolation` are required. The worker must start from the exact
recorded integration `HEAD`; a worker cannot choose a different base.

Run-level provider and strategy invariants are owned by the run-state and
routing policies, not repeated in a task contract. Isolated task contracts
still record their task-local checkout, ownership, environment, authorization,
and integration evidence requirements; the current provider and topology are
derived into the worker briefing when the task is launched.

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
how child results return to the accountable owner. `worker_mode.role:
delegated_worker` is a bounded internal mode, not a second root workflow.
Immediately before launch, the orchestrator writes transient
`worker-brief-input/v1` records and invokes `../tools/swe-forge-worker-brief`.
The tool derives the projection from this task, current run-state facts,
current execution facts, and any root-selected dependency digest. The complete
task, result, transcript, exploration history, full logs/diffs, and unrelated
delivery metadata remain root-owned. The renderer rejects scope, permission,
topology, profile, dependency-evidence, and conditional-safety inconsistencies;
it does not judge objective quality, acceptance sufficiency, or dependency
relevance.

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
- every launch invokes the canonical worker-brief renderer from the task and
  current execution facts; the briefing is a projection, not a competing task
  contract
- the renderer owns the inclusion matrix: read-only and non-isolated workers
  omit unusable provider/worktree state, while isolated writers receive the
  complete conditional safety section from `worker-brief.md`
- workers discover repository details through their allowed reads rather than
  receiving a pasted exploration transcript or large file contents
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
- guided delivery must stop at declared review checkpoints unless the user
  resumes it; pull-request delivery may proceed without those checkpoints but
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
