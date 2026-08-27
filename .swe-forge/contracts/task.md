# Task Contract

Create this contract before delegated work. It defines one bounded task; the
root remains responsible for the canonical delivery candidate, integration, and
acceptance. A host may execute the worker privately.

## Template

```yaml
task_id: api-validation
objective: <one observable unit of work>
reason: <why separating it reduces coordination>
owner_role: implementer
dependencies: []
write_access: read-only | read-write
working_spec_ref: <temporary spec, active context, or none>

worker_mode:
  role: delegated_worker | root_orchestrator
  depth: <integer from root>
  root_task_id: <root task or none>
  max_descendant_workers: 0
  recursive_delegation: false

repository_instructions: [<relevant paths>]
allowed_reads: [<paths or symbols>]
architecture_decisions: [<task-relevant decisions>]

checkout_baseline: # required for writable work
  path: <absolute canonical delivery checkout>
  head: <revision>
  branch: <delivery branch>
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

allowed_scope: [<paths, symbols, or operations>]
forbidden_scope: [<paths, symbols, or operations>]
acceptance: [<checkable task conditions>]

testing:
  behavior: <observable behavior, or none>
  seam: <public seam, or none>
  existing_coverage: <coverage, or none found>
  approach: regression | acceptance | characterization | existing-sufficient | manual | not-applicable
  rationale: <smallest useful evidence>

validation:
  - command: <check>
    requirement: required | conditional | informational
    condition: <when it applies>
    side_effects: local-only | external-read | external-write | destructive
risk: low | medium | high | critical
expected_output: [<implementation/evidence/result fields>]
```

## Required semantics

The root selects the objective, owner, dependencies, repository context, scope,
acceptance, testing decision, validation, risk, and expected output. Writable
tasks additionally need `write_access`, `checkout_baseline`, and
`authorization`; `working_spec_ref` is a temporary reference or `none`.
`delegation.allowed` is false by default. If enabled, define descendant limits
and roles. Authorization for one action never implies another.

The task contract does not own live topology, delivery mode, or run state. The
root copies current routing facts and accepted dependency data into the
canonical worker brief at launch. Do not copy full state or transcripts into a
task.

## Rules

- one task has one accountable owner and non-overlapping writable scope;
- dependencies are satisfied before execution;
- workers discover through allowed reads and request a contract revision before
  expanding scope;
- writable results are materialized and validated in the canonical delivery
  candidate before sequential acceptance;
- validation entries state requirement and side effects;
- workers do not push, create PRs, merge, publish, deploy, reroute, or recurse
  unless explicitly authorized and bounded; and
- the orchestrator validates the returned result against this contract.

Immediately before launch, create and validate one canonical JSON worker brief
with `../tools/swe-forge-worker-brief validate --brief FILE`. The brief and
`contracts/result.md` or `contracts/review.md` are the worker's bounded context.
The complete task, run state, transcript, exploration, and unrelated delivery
metadata remain root-owned.
