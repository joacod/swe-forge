# Run-State Contract

Run state is temporary internal recovery state. It is not a transcript, a task
specification, or a second source of truth. Keep it outside the repository or
under an already ignored `.swe-forge/runs/` path. Never store credentials,
private ticket content, or worker transcripts.

Only the current run-state schema is supported. State written by an older or
unknown schema is stale and must not be resumed; start a fresh run instead.
SWE Forge does not automatically migrate obsolete run-state schemas. A schema
change updates all first-party producers, readers, validation, adapters, and
fixtures together.

## Executable semantic inspection

Adapters do not parse this YAML representation. The canonical
`.swe-forge/tools/swe-forge-state` tool exposes the bounded machine port:

```text
swe-forge-state inspect --state FILE|DIRECTORY --checkout PATH
swe-forge-state resolve-active --checkout PATH \
  [--candidate FILE|DIRECTORY ...] [--all]
```

`inspect` structurally validates one snapshot and reports its stable run
identity, checkout match, lifecycle eligibility, routing, delivery, and compact
continuation facts as deterministic JSON. `resolve-active` applies the same
validation and eligibility rules to caller-supplied candidates and owns newest
`updated_at`, mtime fallback, and deterministic path tie-breaking order.
Terminal, inactive, stale, obsolete, unsupported, and wrong-checkout snapshots
are never returned as active candidates.

## Schema v4

The only current state identity is:

```yaml
workflow: swe-forge
workflow_version: 1
schema_version: 4
run_id: <unique-run-id>
status: planning | running | blocked | reviewing | repairing | accepted | failed
requested_mode: AUTO | SOLO | SUBAGENTS
requested_delivery: DEFAULT | GUIDED | PR
delivery_mode: GUIDED | PR
reason: <why this is the smallest safe topology>
fallback_used: no | <preferred -> effective selection and reason>

routing:
  preferred: SOLO | SUBAGENTS
  current: SOLO | SUBAGENTS

receipt_ref: <receipt path or none>

delivery_checkout:
  path: <absolute canonical writable delivery checkout>
  branch: <delivery branch>
  base_sha: <ticket base SHA>
  head_sha: <current delivery HEAD>
  checkpoint_sha: <last clean checkpoint SHA>
  status: ready | running | blocked | dirty | complete
  branch_setup: auto-created | reused | user-provided | provided | blocked
  remote_default_evidence: <read-only branch classification evidence>

delivery:
  authorization:
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

commit_plan:
  status: not-applicable | unregistered | pending | complete
  steps:
    - id: <ordered working-spec step identity>
      status: pending | complete
      checkpoint: none | <checkpoint ID>
      commit: none | <full commit SHA>


tasks:
  <task_id>:
    status: pending | ready | running | blocked | done | failed | skipped
    dependencies: []
    allowed_scope: []
    forbidden_scope: []
    accepted_result_ref: <accepted structured result/evidence reference or none>
    validation_ref: <result or evidence reference>
```

### Canonical routing ownership

`requested_mode` is the immutable invocation request. The shared invocation
parser/bootstrap supplies `requested_mode`, `requested_delivery`, and
`delivery_mode` to `swe-forge-state init`; an `input_status` other than
`COMPLETE` must not initialize a ticket run. The nested `routing` mapping is
the sole owner of live topology facts:

| Field | Meaning and update rule |
| --- | --- |
| `routing.preferred` | Current semantic topology preference after the latest meaningful assessment. |
| `routing.current` | Currently effective topology authorized to run; update it only at a safe boundary when the effective decision changes. |

A preferred `SUBAGENTS` topology may run with effective `SOLO` after native
capability fallback. The preference remains visible with its reason; it is not
reported as successful delegation. Initial preference, initial effective
selection, and routing history are not durable state.

`delivery_mode` owns the active delivery decision.
`continuation.delivery.mode`, when present, is a compact recovery projection of
that decision rather than an independent owner. `swe-forge-state` derives it
from `delivery_mode` during initialization or continuation update, and
validation rejects a contradictory projection.

`delivery_checkout` is the sole canonical candidate that owns final delivery
commits and branch state. All accepted delegated writes are materialized and
validated there sequentially. A worker's physical execution path—whether the
delivery checkout, a private worktree, sandbox, overlay, container, or another
host mechanism—is not represented in run state. No second workspace, worker
branch, or central transfer record is part of the run state.

## Required structure and lifecycle

The canonical `swe-forge-state init` operation writes the shell from semantic
routing and actual checkout facts; callers do not manually serialize it. A
fresh schema-v4 snapshot initialized by the helper always contains:
- `workflow`, `workflow_version`, `schema_version`, `run_id`, `status`,
  `requested_mode`, `requested_delivery`, `delivery_mode`, `reason`, and
  `fallback_used`;
- the `routing` mapping with `preferred` and `current`;
- `receipt_ref`;
- the complete `delivery_checkout` mapping;
- the complete `delivery` authorization and action mapping;
- the `commit_plan` projection, marked `not-applicable` in `GUIDED` and
  `unregistered` until the ready PR working spec registers its ordered steps;
- the `review` budget, initialized with `attempts: 0`, `retry_ceiling: 2`,
  `ceiling_provenance: default`, and the canonical review contract reference;
  and
- the `tasks` container, even when no delegated task exists.

A fact that is not known yet uses the explicit `unknown`, `none`, empty, or
false representation instead of ambiguous omission. `continuation` is
stage-dependent and may be absent from the initial shell.

## Routing and capability evidence

Automatic routing uses task coupling, independent evaluability, expected
coordination relief, continuity risk, and the root-owned acceptance boundary.
Prompt length alone never selects delegation. The working spec or concise
`reason` records the evidence without serializing a routing score or dimension
matrix.


A native capability is available only when the active adapter has freshly
demonstrated its task/subagent surface, bounded roles, structured results, and
safe fallback. An unknown or unavailable capability keeps the effective
topology `SOLO` or sequential root execution. Capability presence never
selects a topology by itself, and a cached capability fact never authorizes a
worker launch.

## Remaining state

The following sections may be recorded when their lifecycle applies:

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
current_phase: discovery | foundation | implementation | review | delivery | cleanup
```



continuation:
  workflow_active: true | false
  workflow: ticket | delivery | other
  phase: planning | discovery | implementation | review | delivery | awaiting_merge | recovery | complete
  step: <number or none>
  awaiting: none | user_merge | user_decision | recovery
  next_action:
    kind: specify | discover | implement | validate | review | verify_and_sync_merge | recover | none
    target: <short target>
    acceptance: [<short checks>]

  safe_boundary: true | false
  updated_at: <UTC timestamp>
  delivery:
    mode: GUIDED | PR
    pr_number: <number or none>
    pr_state: DRAFT | OPEN | MERGED | CLOSED | none


validation_ref: <evidence ledger or none>
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

`review.attempts` is incremented by the canonical review gate for every
reviewer-like execution, regardless of its source label. The default ceiling is
two; a `CHANGES_REQUIRED` result at the ceiling leaves the run blocked and
preserves the latest evidence. Ordinary unrelated debugging is not a review
execution.

In `PR`, `commit_plan` is a minimal projection of the transient working spec,
not a second semantic plan. The state helper records only ordered step
identity, status, checkpoint, and commit evidence. A complete projection is
required before `deliver-pr`; review-repair evidence is recorded separately in
the private ledger and does not complete a planned step.

A state whose `schema_version` is not `4` must be rejected as stale or
unsupported, including older and future versions. No helper guesses a
migration, normalizes an obsolete snapshot, or rewrites it in place. The
validator also rejects the removed routing fields from earlier schema-v4
representations; callers must start a fresh run rather than migrate them.
When `continuation` is present, the validator requires its workflow-control
fields and a delivery projection matching `delivery_mode`.

## Rules and transitions

- State is updated only from actual Git/evidence facts or an explicit
  orchestrator decision.
- Use `swe-forge-state set-routing` for deliberate preferred/effective
  topology changes and their concise reason/fallback evidence; it validates
  and atomically replaces only those fields.
- Use `swe-forge-state set-continuation` for bounded continuation updates; it
  owns the update timestamp and derived delivery projection.
- Use `swe-forge-state set-delivery-checkout` and `set-receipt-ref` for their
  purpose-specific mutations; callers do not structurally edit the YAML.
- Use `set-commit-plan` and `record-commit-step` for the minimal PR plan
  projection, `set-review` for canonical review attempts, and
  `set-pull-request` after local PR evidence and URL recording.
- A resumed run inspects the real checkout and Git state before trusting this
  snapshot.
- `continuation` is the authoritative workflow-control snapshot; conversation
  summaries and adapter reminders are recovery aids only.
- After a host context discontinuity or recovery event, re-read the working spec
  and run state, inspect `HEAD` and the diff, and resume only from the recorded
  next action.
- `safe_boundary` marks a workflow checkpoint with no in-flight Forge semantic
  mutation; it does not direct host context preservation or compaction.
- Only a dependency in `done` with an `accepted_result_ref` satisfying its task
  and result contract can supply a downstream dependency digest.
- Writable delegated results are materialized into and validated against the
  canonical delivery candidate before sequential acceptance; concurrent
  mutation of that candidate is forbidden.
- Dirty, conflicting, stale, or ambiguous checkout state is preserved and
  reported.
- Cleanup never claims removal of resources that were not proven run-owned.
- `planning` may become `running`, `blocked`, or `failed`; `running` may become
  `reviewing`, `blocked`, or `failed`; `reviewing` may become `repairing`,
  `accepted`, `blocked`, or `failed`; and `blocked` may resume at its prior
  state.

Authorization meanings live in `../policies/delivery.md`; this contract records
the resulting action status rather than redefining those meanings.
