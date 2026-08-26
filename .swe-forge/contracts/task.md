# Task Contract

Use this contract before delegated work begins. A task is a bounded unit of
work, not an invitation to redesign the repository. The root orchestrator
retains the one canonical delivery candidate, integration, and acceptance
boundary; a host may execute the worker through a private mechanism.

## Template

```yaml
task_id: api-validation

objective: >
  Add server-side validation for Foo creation.

reason: >
  Validation is independently evaluable and returns concise evidence.

owner_role: implementer
dependencies: []
write_access: read-write
working_spec_ref: <external temporary spec, active context, or none>

worker_mode:
  role: delegated_worker | root_orchestrator
  depth: <integer from root owner>
  root_task_id: <root task id or none>
  max_descendant_workers: 0
  recursive_delegation: false

repository_instructions: [<relevant instruction paths>]
allowed_reads: [<paths or symbols>]
architecture_decisions: [<task-relevant decisions or none>]

checkout_baseline:
  # Canonical delivery-candidate identity; not the worker's physical cwd.
  path: <absolute canonical delivery checkout path>
  head: <revision>
  branch: <delivery branch defining the candidate>
  branch_setup: auto-created | reused | user-provided
  classification: writable
  remote_default_evidence: <reference>
  staged: []
  unstaged: []
  untracked: []

delegation:
  allowed: false
  max_depth: 0
  max_workers: 0
  allowed_roles: []
  child_result_contract: ../contracts/result.md

authorization:
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
  - delivery actions belonging to the root orchestrator

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
```

## Required Fields

- `task_id`: unique stable identifier for the run;
- `objective`: one observable unit of work;
- `reason`: why this task is separate and useful;
- `owner_role`: role responsible for the work;
- `dependencies`: task IDs that must finish first;
- `write_access`: task-local permission; accepted delegated writes target the
  sole canonical delivery candidate sequentially, even when the host executes
  the worker privately;
- `worker_mode`: bounded worker mode, depth, root task, and zero descendant
  workers by default;
- `repository_instructions`, `allowed_reads`, and `architecture_decisions`:
  semantic context selected by the root;
- `allowed_scope` and `forbidden_scope`: paths, symbols, or operations the
  worker may or may not change;
- `acceptance`: conditions that determine task completion;
- `testing`: observable behavior, seam, testing approach, development mode, and
  rationale;
- `validation`: commands or checks the worker must run;
- `risk`: `low`, `medium`, `high`, or `critical`;
- `expected_output`: artifacts and evidence the worker must return; and
- `delegation`: whether child workers are allowed and, if so, their limits.

The task contract deliberately omits run-level request, live topology, and
delivery mode. The active run state is authoritative; the orchestrator renders
the current bounded routing fact into the worker briefing immediately before
launch. A concrete task-specific execution constraint remains task-scoped
rather than copying selected run state. The checkout baseline identifies the
canonical delivery candidate and does not require the worker process to run
there.

Writable tasks additionally require `write_access`, `checkout_baseline`, and
`authorization`. `working_spec_ref` is required when a transient spec guides
the task and is `none` when it does not.

`delegation.allowed` defaults to `false`. When it is `true`, the contract must
also define `max_depth`, `max_workers`, and allowed roles. These are descendant
delegation authority budgets, not runtime scheduling limits. Every child
contract carries the root task ID and reduced remaining budgets; a child cannot
reset or increase them.

Immediately before launch, the orchestrator writes transient
`worker-brief-input/v1` records and invokes `../tools/swe-forge-worker-brief`.
The tool derives the projection from this task, current run-state routing facts,
and any root-selected dependency digest. The complete task, result, transcript,
exploration history, full logs/diffs, and unrelated delivery metadata remain
root-owned.

## Contract Rules

- one task has one accountable owner;
- dependencies must be satisfied before execution;
- one writing task owns a path or symbol set at a time;
- read-only workers may inspect shared files;
- delegated writes are sequential and never overlap another active writer;
- a worker must ask for a revised contract before expanding scope;
- every launch invokes the canonical worker-brief renderer;
- workers discover repository details through allowed reads rather than pasted
  exploration transcripts;
- validation must be realistic for the delivery checkout and environment;
- behavior-affecting tasks must record a testing decision;
- every validation entry states whether it is `required`, `conditional`, or
  `informational` and whether it has local or external side effects;
- authorization for one action never implies authorization for another;
- workers must not push, create PRs, merge, publish, deploy, reroute the ticket,
  or recursively delegate unless explicitly authorized and bounded; and
- the orchestrator evaluates the result against this contract before accepting
  the task.
