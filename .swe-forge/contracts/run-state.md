# Run-State Contract

Run state is a temporary recovery snapshot. It is not a transcript, a task
specification, or a second source of truth. Keep it outside the repository or
under an already ignored `.swe-forge/runs/` path. Never store credentials,
private ticket content, or worker transcripts.

## Schema v2

The only current state identity is:

```yaml
workflow: swe-forge
workflow_version: 1
schema_version: 2
run_id: <unique-run-id>
status: planning | running | blocked | reviewing | repairing | accepted | failed
prior_status: <state before blocked or none>
requested_mode: AUTO | SOLO | SUBAGENTS | ISOLATED
execution_mode: SOLO | SUBAGENTS | ISOLATED
requested_provider: AUTO | NATIVE | HERDR | NONE
execution_provider: NATIVE | HERDR | NONE
provider_reason: <evidence-backed reason; NONE for non-isolated runs>
parallel_strategy: NONE | COMPOSE
integration_strategy: NONE | CHERRY_PICK
requested_delivery: DEFAULT | GUIDED | PR
delivery_mode: GUIDED | PR
reason: <why this is the smallest safe topology>
fallback_used: no | <requested mode/provider -> selected mode/provider and reason>

invocation_checkout:
  path: <absolute checkout from which Forge was invoked>
  branch: <branch or none>
  head_sha: <exact invocation HEAD>
  classification: writable | protected | detached | unclassifiable
  mutation_allowed: true | false
  baseline_ref: <baseline ref or exact SHA>

delivery_checkout:
  path: <absolute sole writable delivery checkout>
  branch: <task or integration/delivery branch>
  kind: task | integration
  base_sha: <ticket base SHA>
  head_sha: <current delivery HEAD>
  checkpoint_sha: <last clean checkpoint SHA>
  status: ready | running | blocked | dirty | complete
  branch_setup: auto-created | reused | user-provided | provided | blocked
  remote_default_evidence: <read-only branch classification evidence>
```

`invocation_checkout` identifies the checkout that started the run. In a
normal run it may be the same path as `delivery_checkout`. In an isolated run
it remains untouched and `delivery_checkout` is the orchestrator-owned
integration worktree. Worker worktrees are recorded only under `workers`; do
not duplicate integration path or branch fields in `delivery` or another
integration object.

`delivery_checkout` is the only checkout that owns final delivery commits. The
`delivery` section below records authorization and action status only. Source
to integration mappings belong to `integration`.

## Routing and provider evidence

Record both hard eligibility and economic preference. An explicit isolated
request may override only the economic judgment; it cannot override a hard
blocker.

```yaml
isolated_eligibility:
  status: eligible | ineligible
  evidence_ref: <routing evidence>
  blockers: []
parallel_value:
  status: beneficial | marginal | unknown
  rationale: <critical-path or context-interference evidence>
  overridden_by_user: true | false

provider_capabilities:
  concurrent_writable_workers:
    status: proven | unavailable | unknown
    evidence_ref: <capability proof>
  dedicated_worktrees:
    status: proven | unavailable | unknown
    evidence_ref: <capability proof>
  exact_base_sha:
    status: proven | unavailable | unknown
    evidence_ref: <capability proof>
  integration_checkout_protection:
    status: proven | unavailable | unknown
    evidence_ref: <capability proof>
  structured_results:
    status: proven | unavailable | unknown
    evidence_ref: <capability proof>
  lifecycle:
    wait:
      status: proven | unavailable | unknown
      evidence_ref: <capability proof>
    inspect:
      status: proven | unavailable | unknown
      evidence_ref: <capability proof>
    cancel:
      status: proven | unavailable | unknown
      evidence_ref: <capability proof>
    cleanup:
      status: proven | unavailable | unknown
      evidence_ref: <capability proof>
  central_integration:
    status: proven | unavailable | unknown
    evidence_ref: <capability proof>
```

`NATIVE` is forbidden while any mandatory capability is `unknown` or
`unavailable`. `execution_mode` other than `ISOLATED` requires provider and
strategies to be `NONE`; isolated v1 requires a selected provider, `COMPOSE`,
and `CHERRY_PICK`.

## Remaining state

The following sections are required when their lifecycle applies:

```yaml
ticket_ref: <immutable raw invocation arguments>
parsed_ticket_ref: <parsed ticket text>
specialist_skills:
  - id: <identifier>
    source: <path or URL>
    status: selected | skipped | unavailable
    reason: <selection evidence or none>
working_spec_ref: <external temporary spec, active context, or none>
acceptance_ref: <acceptance criteria reference>
current_wave: research | foundation | <integer> | integration | review | cleanup

# Authorization and action status only; no duplicate integration identity.
delivery:
  authorization:
    worker_setup: not-authorized | continue | PR
    worker_transfer_commit: not-authorized | continue | PR
    commit: not-authorized | go | PR
    push: not-authorized | PR
    create_pull_request: not-authorized | PR
    publish: not-authorized
    deploy: not-authorized
    merge: not-authorized
  commit: not-authorized | pending | complete | blocked
  push: not-authorized | pending | complete | blocked
  create_pull_request: not-authorized | pending | complete | blocked
  sync: not-authorized | pending | complete | blocked
  pull_request_ref: <URL or none>

integration:
  source_to_integration:
    - task_id: <task>
      source_commit: <full worker transfer SHA>
      integration_commit: <full central SHA>
      integration_order: <planned integer>
  status: ready | running | blocked | complete | dirty
  conflict_ref: <evidence or none>

tasks:
  <task_id>:
    status: pending | ready | running | blocked | done | failed | skipped
    dependencies: []
    allowed_scope: []
    forbidden_scope: []
    shared_artifacts: []
    base_sha: <exact base or none>
    wave: <integer or none>
    integration_order: <planned integer or none>
    validation_ref: <result or evidence reference>

workers:
  <task_id>:
    provider_id: <provider identity>
    path: <absolute worker worktree>
    branch: <ephemeral local-only branch>
    base_sha: <exact worker base>
    head_sha: <worker head>
    source_commits: []
    integrated_commits: []
    status: ready | running | done | blocked | failed | dirty | cleaned
    validation_ref: <machine-valid result bundle>
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

validation_ref: <evidence ledger or none>
receipt_ref: <receipt path or URL, or none>
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
  next_slice: <bounded slice or none>
  requested_action: continue | revise | go | commit | none
cleanup:
  status: pending | complete | incomplete | not-needed
  remaining_resources: []
retries:
  <task_id>: {attempts: 0, ceiling: 1, ceiling_provenance: default}
```

A schema-v1 state containing `version: 1` or the old top-level `checkout`
object must be rejected with an explicit compatibility message. A helper must
never guess a migration. A future migration must be explicit, dependency-free,
and tested before it can normalize state.

## Rules and transitions

- State is updated only from actual Git/provider/evidence facts or an explicit
  orchestrator decision.
- A resumed run inspects real checkout, branch, worktree, provider, and process
  state before trusting this snapshot.
- only a dependency in `done` satisfies a downstream task.
- Completion order never changes planned `integration_order`.
- Worker lifecycle state is scheduling evidence, not task acceptance.
- Every accepted isolated source commit needs one source-to-integration mapping.
- Dirty, conflicting, stale, or ambiguous resources are preserved and reported.
- Cleanup may remove only run-owned clean resources after all accepted commits
  are mapped; force removal, hard reset, and destructive cleanup are refused.
- `planning` may become `running`, `blocked`, or `failed`; `running` may become
  `reviewing`, `blocked`, or `failed`; `reviewing` may become `repairing`,
  `accepted`, `blocked`, or `failed`; `blocked` may resume at its prior state.

The canonical authorization meanings live in
`.swe-forge/policies/delivery.md`; this contract records their state rather
than redefining them.
