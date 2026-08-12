# Task Contract

Use this contract before delegated work begins. A task is a bounded unit of
work, not an invitation to redesign the repository.

## Template

```yaml
task_id: api-validation

objective: >
  Add server-side validation for Foo creation.

reason: >
  Validation is independent from the UI work and can be evaluated separately.

owner_role: implementer
dependencies: []

execution_mode: SUBAGENTS
write_access: read-write
worktree: shared
delivery_mode: GUIDED | PR
working_spec_ref: <external temporary spec, active context, or none>
checkout_baseline:
  path: <absolute checkout path>
  head: <revision>
  branch: <single task branch used for the entire run>
  branch_setup: auto-created | reused | user-provided
  classification: writable
  remote_default_evidence: <reference>
  staged: []
  unstaged: []
  untracked: []

delegation:
  allowed: false

authorization:
  create_branch: {status: not-authorized, provenance: none, scope: none}
  create_worktree: {status: not-authorized, provenance: none, scope: none}
  commit: {status: not-authorized, provenance: none, scope: none}
  push: {status: not-authorized, provenance: none, scope: none}
  create_pull_request: {status: not-authorized, provenance: none, scope: none}
  publish: {status: not-authorized, provenance: none, scope: none}
  merge: {status: not-authorized, provenance: none, scope: none}

allowed_scope:
  - packages/api/src/foo/**
  - packages/api/tests/foo/**

forbidden_scope:
  - packages/web/**
  - unrelated refactors

acceptance:
  - Invalid Foo returns HTTP 400.
  - Existing valid Foo requests remain compatible.

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

```

## Required Fields

- `task_id`: unique stable identifier for the run
- `objective`: one observable unit of work
- `reason`: why this task is separate and useful
- `owner_role`: role responsible for the work
- `dependencies`: task IDs that must finish first
- `allowed_scope`: paths, symbols, or operations the worker may change
- `forbidden_scope`: paths or changes explicitly outside ownership
- `acceptance`: conditions that determine task completion
- `validation`: commands or checks the worker must run
- `risk`: `low`, `medium`, `high`, or `critical`
- `expected_output`: artifacts and evidence the worker must return
- `delegation`: whether child workers are allowed and, if so, their limits

Writable tasks additionally require `execution_mode`, `write_access`,
`worktree`, `delivery_mode`, `checkout_baseline`, and `authorization`.
`working_spec_ref` is required when a transient spec guides the task and is
`none` when it does not.

`execution_mode`, `write_access`, `worktree`, and `checkout_baseline` make
execution constraints explicit. They are required for writable tasks. A task
contract may use `read-only` access for research or review. Use `isolated`
worktrees for concurrent writing tasks.

`authorization` is required for writable tasks and records each delivery or
user-directed setup action independently. `not-authorized` is the default. The
automatic one-branch setup from a clean protected default is recorded in
`checkout_baseline.branch_setup` and does not need a separate user
authorization; it never conveys delivery authority. An action authorized outside
that default must include its own provenance identifying the user instruction
and its own scope. Shared provenance is insufficient when actions were
authorized by different instructions. `go` may authorize the current guided
slice's local commit, while an explicit `PR` delivery token may authorize
per-slice commits, the final push, and pull-request creation after all gates
pass. Neither authorizes `merge`.

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
- a worker must ask for a revised contract before expanding scope
- validation must be realistic for the worker's checkout and environment
- every validation entry states whether it is `required`, `conditional`, or
  `informational` and whether it has local or external side effects
- every `conditional` validation entry states its observable `condition`
- authorization may only transmit an explicit user instruction; a task
  contract cannot create authority itself
- authorization for one action never implies authorization for another action
- `delivery_mode: GUIDED` must stop at declared review checkpoints unless the
  user resumes it; `delivery_mode: PR` may proceed without those checkpoints but
  must retain the working-spec, validation, and review evidence
- workers must not delegate when `delegation.allowed` is false or exceed its
  declared depth, worker, role, or isolation limits
- the orchestrator evaluates the result against this contract before
  integration
