# Run-State Contract

Run state is temporary internal recovery state. It is not a transcript, a task
specification, or a second source of truth. Keep it outside the repository or
under an already ignored `.swe-forge/runs/` path. Never store credentials,
private ticket content, or worker transcripts.

Only the current run-state schema is supported. State written by an older or
unknown schema is stale and must not be resumed; start a fresh run instead.
SWE Forge does not automatically migrate obsolete run-state schemas. A schema
change updates all first-party producers, consumers, validation, adapters, and
fixtures together.

## Schema v3

The only current state identity is:

```yaml
workflow: swe-forge
workflow_version: 1
schema_version: 3
run_id: <unique-run-id>
status: planning | running | blocked | reviewing | repairing | accepted | failed
prior_status: <state before blocked or none>
requested_mode: AUTO | SOLO | SUBAGENTS | ISOLATED
requested_provider: AUTO | NATIVE | HERDR | NONE
execution_provider: NATIVE | HERDR | NONE
delegation_backend: NONE | NATIVE | HERDR | OTHER
write_isolation: SHARED | WORKTREE
provider_reason: <evidence-backed reason; explicit non-isolated reason when execution_provider is NONE>
parallel_strategy: NONE | COMPOSE
integration_strategy: NONE | CHERRY_PICK
requested_delivery: DEFAULT | GUIDED | PR
delivery_mode: GUIDED | PR
reason: <why this is the smallest safe topology>
fallback_used: no | <requested/preferred mode/provider -> selected mode/provider and reason>

routing:
  initial: SOLO | SUBAGENTS | ISOLATED
  preferred: SOLO | SUBAGENTS | ISOLATED
  selected: SOLO | SUBAGENTS | ISOLATED
  current: SOLO | SUBAGENTS | ISOLATED
  revisions:
    - from: SOLO | SUBAGENTS | ISOLATED
      to: SOLO | SUBAGENTS | ISOLATED
      reason: <evidence>
      phase: <workflow phase>
      boundary: <safe boundary>
  context_value:
    projected_pressure: low | medium | high | unknown
    context_reducibility: low | medium | high | unknown
    delegatable_context: low | medium | high | unknown
    root_context_requirement: low | medium | high | unknown
    continuity_risk: low | medium | high | unknown
    rationale: <why generated information can or cannot leave the root>
  runtime_profile_ref: <capability profile or none>

discovery_strategy:
  mode: ROOT_ONLY | DELEGATED_RESEARCH
  rationale: <why discovery questions can or cannot leave root context>
  questions:
    - id: <short identifier>
      objective: <bounded read-only question>
      allowed_scope: [<paths or symbols>]
      evidence_budget: <concise result limit>
      acceptance: <what makes the evidence useful>
  batch:
    strategy: FAN_OUT_FAN_IN | ROOT_ONLY | SEQUENTIAL
    max_workers: <existing conservative worker limit>
    fan_in: ONE_BARRIER | NONE
  backend: NONE | NATIVE | HERDR
  write_isolation: SHARED
  final_routing_deferred: true | false

runtime_profile:
  harness: <harness id>
  context_usage: available | estimated | unavailable | unknown
  context_window: reported | configured | unknown
  proactive_compaction: available | unavailable | unknown
  compaction_hooks: available | unavailable | unknown
  state_reinjection: available | unavailable | unknown
  subagents:
    native: available | unavailable | unknown
    external: []
  capability_precedence: observed > adapter_declared > static_default > unknown

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

### Canonical routing ownership

`requested_mode` is the immutable invocation request. The nested `routing`
mapping is the sole owner of live topology facts:

| Field | Meaning and update rule |
| --- | --- |
| `routing.initial` | Initial semantic topology preference computed from the request and discovery; set once when routing starts. |
| `routing.preferred` | Current semantic topology preference after deliberate reassessment; it may differ from the effective topology. |
| `routing.selected` | Initial effective/executable topology after capability fallback; it is not rewritten merely because `current` later changes. |
| `routing.current` | Currently effective/executable topology; update it only when an actual routing change is selected. |

At every current-schema workflow stage, first-party writers emit all four
routing facts. A preferred `SUBAGENTS` topology may therefore legitimately run
with an effective `SOLO` topology after capability fallback. Consumers read the
nested fields directly and reject missing or malformed current routing rather
than inferring it from another representation.

`delivery_mode` owns the active delivery-domain decision.
`continuation.delivery.mode`, when present, is a compact recovery projection of
that decision rather than an independent owner. Current writers derive it from
`delivery_mode`, and validation rejects a contradictory projection. The
projection is retained because it keeps continuation state self-contained after
context compaction; it is not a legacy state alias.

`invocation_checkout` identifies the checkout that started the run. In a
normal run it may be the same path as `delivery_checkout`. In an isolated run
it remains untouched and `delivery_checkout` is the orchestrator-owned
integration worktree. Worker worktrees are recorded only under `workers`; do
not duplicate integration path or branch fields in `delivery` or another
integration object.

`delivery_checkout` is the only checkout that owns final delivery commits. The
`delivery` section below records authorization and action status only. Source
to integration mappings belong to `integration`.

## Required structure and lifecycle

The schema example describes the available state vocabulary; it is not a claim
that every lifecycle field is populated in the first snapshot. A valid
schema-v3 snapshot starts with this stable structural shell:

- **Always-present top-level structure:** `workflow`, `workflow_version`,
  `schema_version`, `run_id`, `status`, `requested_mode`,
  `requested_provider`, `execution_provider`, `delegation_backend`,
  `write_isolation`, `provider_reason`, `parallel_strategy`,
  `integration_strategy`, `requested_delivery`, `delivery_mode`, `reason`,
  `fallback_used`, `routing`, `invocation_checkout`, `delivery_checkout`,
  `isolated_eligibility`, `parallel_value`, `provider_capabilities`,
  `delivery`, `integration`, and `workers`.
- **Always-present nested fields:** the four `routing` facts; all listed fields
  in both checkout structures; `status`, `evidence_ref`, and `blockers` in
  `isolated_eligibility`; `status`, `rationale`, and `overridden_by_user` in
  `parallel_value`; and every capability plus
  `provider_capabilities.lifecycle.{wait,inspect,cancel,cleanup}`.
- **Required containers with initial values:** `delivery`, `integration`, and
  `workers` exist from creation even when action/result, mapping, and worker
  collections are empty. `provider_capabilities` exists even for a
  non-isolated run; its capability and lifecycle evidence may start as
  `unknown` with explicit `not-applicable` references. Initial eligibility and
  parallel-value facts likewise use the contract's explicit initial,
  `unknown`, empty, or false values rather than omission.
- **Lifecycle-populated contents:** task entries, worker entries, integration
  mappings/results, delivery actions/results, context/recovery details, and
  provider lifecycle outcomes are added or filled only when their stage
  applies. Their absence does not permit omitting a required parent container.
- **Truly stage-dependent sections:** `continuation` may be absent from a
  generic schema-v3 state until the first continuation/recovery snapshot is
  written. Other non-shell sections listed under `Remaining state` are also
  workflow records, not additions to the initial structural shell.

Missing a required structure or field is malformed current state. A fact that
is not known yet uses the contract's explicit initial, empty, or `unknown`
representation instead of ambiguous omission.

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
`unavailable`. `routing.current` other than `ISOLATED` requires provider and
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

context:
  status: healthy | near-limit | overflow | compacting | recovered | unknown | blocked
  capability_status: proven | partial | unknown | unavailable
  signal_source: <adapter, host event, telemetry, or none>
  usage_tokens: <number or unknown>
  context_window: <number or unknown>
  last_checkpoint: <external state or evidence reference>
  last_compaction: <event, session entry, timestamp, or none>
  recovery_action: none | checkpoint | compact | wait | blocked

# Conversation summaries are not workflow-control state. This section is the
# small authoritative continuation snapshot consumed after compaction.
continuation:
  workflow_active: true | false
  workflow: ticket | isolated | delivery | other
  phase: planning | discovery | implementation | review | delivery | awaiting_merge | recovery | complete
  step: <number or none>
  awaiting: none | user_merge | user_decision | recovery
  next_action:
    kind: specify | discover | implement | validate | review | verify_and_sync_merge | recover | none
    target: <short target>
    acceptance: [<short checks>]
    expected_context_tokens: <number or unknown>
  safe_boundary: true | false
  updated_at: <UTC timestamp>
  delivery:
    mode: GUIDED | PR
    pr_number: <number or none>
    pr_state: DRAFT | OPEN | MERGED | CLOSED | none
  recovery:
    host_signal: none | near-limit | overflow | compaction
    status: none | pending | recovered | blocked

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
    accepted_result_ref: <accepted structured result/evidence reference or none>
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

A state whose `schema_version` is not `3` must be rejected as stale or
unsupported, including older and future versions. No helper guesses a
migration, normalizes an obsolete snapshot, or rewrites it in place. Start a
fresh run instead. The stable shell above is required for every current-schema
snapshot; lifecycle contents and non-shell sections may be absent until their
stage applies. When `continuation` is present, the validator requires
`workflow_active`, `workflow`, `phase`, `step`, `awaiting`, `safe_boundary`,
`updated_at`, and `continuation.delivery.mode`, with the delivery projection
matching `delivery_mode`. Pi's active-resume path may require that continuation
snapshot before it treats a state as resumable; that stricter runtime boundary
does not change the generic schema-v3 minimum.

## Rules and transitions

- State is updated only from actual Git/provider/evidence facts or an explicit
  orchestrator decision.
- A resumed run inspects real checkout, branch, worktree, provider, and process
  state before trusting this snapshot.
- `continuation` is the authoritative workflow-control snapshot; conversation
  summaries and adapter reminders are recovery aids only.
- Update `continuation.updated_at`, `safe_boundary`, and `next_action` together
  before a planned compaction or topology revision. Do not copy the original
  ticket into the continuation block.
- Context state is updated before a planned compaction and after recovery; the
  snapshot never replaces actual Git or host evidence.
- After compaction or overflow recovery, re-read the working spec and run state,
  inspect the current `HEAD` and diff, and resume only from the recorded next
  action. Do not launch a duplicate Forge retry for a host-managed retry.
- A state consumer must prefer the newest active snapshot that matches the
  checkout and must reject terminal or explicitly inactive state, so stale
  pointers cannot override newer workflow state.
- Only a dependency in `done` with an `accepted_result_ref` satisfying its task
  and result contract can supply a downstream dependency digest. The digest is
  derived transiently for the dependent briefing; it is not stored as a
  persistent task-to-task message.
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
