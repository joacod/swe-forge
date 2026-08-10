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
  - pnpm test foo
  - pnpm typecheck

risk: medium

expected_output:
  - implementation within allowed scope
  - test evidence
  - structured worker result

commit_policy: none
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

`execution_mode`, `write_access`, `worktree`, and `commit_policy` make
execution constraints explicit. A task contract may use `read-only` access for
research or review. Use `isolated` worktrees for concurrent writing tasks.

## Contract Rules

- one task has one accountable owner
- dependencies must be satisfied before execution
- allowed scopes must not overlap dangerously with another writing task
- a worker must ask for a revised contract before expanding scope
- validation must be realistic for the worker's checkout and environment
- commit requirements must be explicit; no task inherits permission to push or
  publish
- the orchestrator evaluates the result against this contract before
  integration
