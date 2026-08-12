# Run-State Contract

Run state is a lightweight snapshot of the active workflow. It supports
recovery and coordination without becoming a second source of truth or a
repository transcript. It is temporary by default and must not contain
credentials, worker transcripts, or ticket-specific committed artifacts.

## Template

```yaml
workflow: swe-forge
version: 1
run_id: <unique-run-id>

status: planning | running | blocked | reviewing | repairing | accepted | failed
prior_status: <state before blocked or none>
requested_mode: AUTO | SOLO | SUBAGENTS | ISOLATED
execution_mode: SOLO | SUBAGENTS | ISOLATED
requested_provider: AUTO | NATIVE | HERDR | NONE
execution_provider: NATIVE | HERDR | NONE
provider_reason: <why the provider satisfies isolated-execution requirements>
parallel_strategy: NONE | COMPOSE
integration_strategy: NONE | CHERRY_PICK
requested_delivery: DEFAULT | GUIDED | PR
delivery_mode: GUIDED | PR
reason: <why this topology and provider were selected>
fallback_used: no | <requested mode/provider -> selected mode/provider and reason>

started_at: <ISO-8601 timestamp>
updated_at: <ISO-8601 timestamp>
current_wave: research | foundation | <integer> | integration | review | cleanup
ticket_ref: <immutable raw ticket or external artifact reference>
working_spec_ref: <external temporary working spec, active context, or none>
acceptance_ref: <acceptance criteria reference>
specialist_skills:
  - id: <identifier>
    source: <user-provided or already-installed path or URL>
    status: selected | skipped | unavailable
    reason: <ticket fit and selection decision>

checkout:
  path: <original or current checkout path>
  head: <revision at baseline>
  branch: <normal task/delivery branch or original branch>
  branch_kind: task_delivery | integration_delivery | ephemeral_worker
  worktree_kind: task | integration | worker
  branch_setup: auto-created | reused | user-provided | blocked
  classification: writable | protected | detached | unclassifiable
  remote_default_evidence: <reference>
  baseline_ref: <working-tree inventory reference>
  staged: []
  unstaged: []
  untracked: []

authorization_ref: <per-action authorization record or none>

tasks:
  <task_id>:
    status: pending | ready | running | blocked | done | failed | skipped
    dependencies: []
    allowed_scope: []
    forbidden_scope: []
    shared_artifacts: []
    base_sha: <exact integration base or none>
    wave: <integer or none>
    integration_order: <planned integer or none>
    validation_ref: <result or evidence reference>

review:
  status: pending | running | pass | changes-required | skipped
  blocked_by: []
  attempts: 0
  retry_ceiling: 2
  ceiling_provenance: default
  contract_ref: <canonical review contract>

checkpoint:
  status: not-applicable | awaiting-user | resumed | complete
  number: 0
  next_slice: <bounded review slice or none>
  requested_action: <continue, revise, go, commit, or none>

# One delivery boundary per ticket. In ISOLATED, worker branches are not
# delivery branches and this is the only branch that may be pushed.
delivery:
  integration_branch: <one integration/delivery branch>
  integration_worktree: <absolute orchestrator worktree path>
  commit: not-authorized | pending | complete | blocked
  commit_history_ref: <per-slice or per-integration-unit records>
  push: not-authorized | pending | complete | blocked
  create_pull_request: not-authorized | pending | complete | blocked
  sync: not-authorized | pending | complete | blocked
  pull_request_ref: <URL or none>

integration:
  path: <absolute integration worktree path>
  branch: <integration/delivery branch>
  base_sha: <ticket base>
  head_sha: <current integration head>
  checkpoint_sha: <last clean checkpoint>
  status: ready | running | blocked | complete | dirty
  source_to_integration:
    - source_commit: <worker transfer commit>
      integration_commit: <final central commit>
      task_id: <task>
      integration_order: <planned order>

workers:
  <task_id>:
    provider_id: <provider worker identity>
    path: <absolute worker worktree path>
    branch: <ephemeral local worker branch>
    branch_kind: ephemeral_worker
    worktree_kind: worker
    base_sha: <exact worker base>
    head_sha: <worker head>
    source_commits: []
    integrated_commits: []
    status: ready | running | done | blocked | failed | dirty | cleaned
    validation_ref: <structured result or evidence>
    cleanup_status: pending | clean | blocked | preserved

environment_resources:
  setup_commands: []
  copied_ignored_files: []
  ports: []
  databases: []
  docker_projects: []
  temporary_directories: []
  external_resources: []
  cleanup:
    status: pending | complete | incomplete
    commands: []

validation_ref: <structured validation evidence or none>
cleanup:
  status: pending | complete | incomplete | not-needed
  remaining_resources: []

retries:
  <task_id>: {attempts: 0, ceiling: 1, ceiling_provenance: default}
```

## Required Isolated State

When `execution_mode: ISOLATED`, the state must preserve
`execution_provider`, `parallel_strategy`, `integration_strategy`, and
`current_wave`, plus the `integration`, `workers`, and `environment_resources`
sections. It must distinguish:

- the integration/delivery branch from every ephemeral worker branch
- the integration worktree from every worker worktree
- worker-local transfer commits from final integration commits
- provider identity and lifecycle state from task acceptance evidence
- wave and task dependencies from completion order
- environment resources from checkout identity
- cleanup status from worker status

`execution_provider` is `NONE` for non-isolated runs. `NATIVE` and `HERDR` are
provider values only; neither is a canonical execution topology. `COMPOSE` is
the only isolated parallel strategy and `CHERRY_PICK` is the only isolated
integration strategy supported by this version.

## Rules

- keep state temporary by default, outside the repository
- use an ignored `.swe-forge/runs/` directory only when local state is needed
- verify a repository-local path is ignored before writing it; do not add ignore
  rules without explicit scope
- update task status only from evidence or an explicit orchestrator decision
- preserve dependency, provider, wave, integration, mapping, resource, and
  retry information during recovery
- treat `retries.<task>.attempts` as the single authoritative attempt counter
- preserve checkout identity, baseline, branch/worktree roles, one-delivery-
  branch strategy, authorization, validation, review attempts, delivery mode,
  checkpoint state, working-spec reference, prior status, retry ceilings and
  provenance, specialist-skill decisions, and cleanup state during recovery
- never store credentials, secrets, full transcripts, or private ticket data
- treat the final repository diff, tests, actual Git/provider/process state, and
  review as authoritative over stale run state
- worker lifecycle state is scheduling evidence, not task-acceptance evidence
- clean external state at completion and record cleanup failures

A resumed isolated orchestrator must inspect actual Git worktree, branch,
checkout, provider, and process state before continuing. Stale run state never
overrides repository evidence. If a worker checkout is dirty or ambiguous,
preserve it and report it rather than force-removing it.

The implementation may use a more specific timestamp or task schema, but it
must preserve the run-state format version, requested and selected execution
and provider values, task status, dependencies, review status, retry
visibility, checkout identity, authorization, validation evidence, checkpoint
state, delivery state, integration mapping, environment resources, and cleanup
status. It must preserve the prior status needed to resume a blocked run and
every task or review retry ceiling, including provenance for an increased
ceiling. It must preserve whether a checkpoint is awaiting user input, whether
`go` authorized a local slice commit, the per-slice commit history reference,
whether each delivery action was authorized, completed, or blocked, and which
one integration/delivery branch the run used.

## Transitions

- `planning` may become `running`, `blocked`, or `failed`
- `running` may become `blocked`, `reviewing`, `failed`, or return to `planning`
  after an explicit topology, provider, or contract revision
- `reviewing` may become `repairing`, `accepted`, `blocked`, or `failed`
- `repairing` may become `reviewing`, `blocked`, or `failed`
- `blocked` may resume at its recorded prior state or become `failed`
- `accepted` and `failed` are terminal
- only a dependency in `done` satisfies a downstream task; `blocked`, `failed`,
  and `skipped` require an explicit contract revision before dependents run
- retries increment attempts without releasing ownership; topology or provider
  changes must cancel or serialize old ownership before replacement tasks become
  ready
- completion order never changes recorded `integration_order`
- cleanup may remove only run-owned clean resources; ambiguous or dirty
  resources remain preserved and reported
