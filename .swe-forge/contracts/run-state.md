# Run-State Contract

Run state is temporary internal recovery state, not a transcript, task
specification, or second source of truth. Keep it outside the repository or
under an already ignored `.swe-forge/runs/` path; never store credentials,
private ticket content, or worker transcripts.

Only the current schema is supported. Older, future, or unknown state is stale,
must be rejected, and is never migrated. Producers, readers, validators,
adapters, and fixtures change together when the schema changes.

## Machine surface

Adapters use the dependency-free semantic ports rather than parsing YAML:

```text
swe-forge-state inspect --state FILE|DIRECTORY --checkout PATH
swe-forge-state resolve-active --checkout PATH [--candidate FILE|DIRECTORY ...] [--all]
```

They validate identity, checkout, lifecycle, routing, delivery, continuation,
and active-state ordering. Terminal, stale, obsolete, unsupported, and
wrong-checkout snapshots are not active candidates.

## Schema v4

The current state has this shape:

```yaml
workflow: swe-forge
workflow_version: 1
schema_version: 4
run_id: <unique id>
status: planning | running | blocked | reviewing | repairing | accepted | failed
delivery_mode: GUIDED | PR
reason: <topology decision reason>
fallback_used: no | <preferred -> effective reason>

routing:
  preferred: SOLO | SUBAGENTS
  current: SOLO | SUBAGENTS

delivery_checkout:
  path: <absolute canonical writable delivery checkout>
  branch: <delivery branch>
  base_sha: <ticket base>
  head_sha: <current HEAD>
  status: ready | running | blocked | dirty | complete
  branch_setup: auto-created | reused | user-provided | provided | blocked
  remote_default_evidence: <classification reference>

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

tasks:
  <task_id>:
    status: pending | ready | running | blocked | done | failed | skipped
    dependencies: []
    allowed_scope: []
    forbidden_scope: []
    accepted_result_ref: <reference or none>
    validation_ref: <reference>
```

The initialization helper also creates the `review` record and empty task
container. Unknown facts use explicit `unknown`, `none`, empty, or false
values. Optional state may include:

```yaml
ticket_ref: <immutable raw invocation>
parsed_ticket_ref: <parsed ticket>
specialist_skills: []
working_spec_ref: <temporary spec or none>
acceptance_ref: <reference>
current_phase: discovery | foundation | implementation | review | delivery | cleanup

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

validation_ref: <ledger reference or none>
review:
  status: pending | pass | changes-required | repaired | skipped
  blocked_by: []
  contract_ref: <canonical review contract>
cleanup:
  status: pending | complete | incomplete | not-needed
  remaining_resources: []
retries:
  <task_id>: {attempts: 0, ceiling: 1, ceiling_provenance: default}
```

## Ownership and updates

`routing.preferred` and `routing.current` are the only durable topology
fields; invocation syntax never supplies a topology override. `delivery_mode`
owns delivery and comes from the normalized delivery intent;
`continuation.delivery.mode`, when present, is a derived matching projection.
`delivery_checkout` is the only canonical candidate. For a clean committed
candidate, Git `HEAD` is the canonical identity used by validation, review, and
delivery. A host-private worker path is not state, and no second workspace,
worker branch, or transfer record is added.

The `init` operation constructs the schema from semantic input and actual
checkout facts. Use the purpose-specific helpers—`set-routing`,
`set-continuation`, `set-delivery-checkout`, `set-review`, `set-review-repair`,
and `set-pull-request`—instead of hand-editing containers, timestamps, or
projections. `set-continuation` owns `updated_at` and the matching delivery
projection. A committed candidate's Git `HEAD` is its identity; the
`delivery_checkout.head_sha` field is a recovery projection of that value.

A resumed run first inspects real Git and validation/review evidence. After
a context discontinuity or recovery, re-read the working spec and state,
inspect `HEAD` and the diff, and resume only from the recorded next action.
Conversation summaries and adapter reminders are recovery aids, not authority.

Only a `done` dependency with an accepted result may supply a dependent digest.
Writable delegated results are materialized and validated in the canonical
candidate before sequential acceptance. Dirty, conflicting, stale, or
ambiguous checkout state is preserved and reported; cleanup cannot claim
unproven removal.

Reject any `schema_version` other than `4`, removed fields from obsolete
representations, malformed routing, or a contradictory continuation delivery
projection. Start a fresh run; do not normalize or rewrite stale state.

## Lifecycle

`planning` may become `running`, `blocked`, or `failed`; `running` may become
`reviewing`, `blocked`, or `failed`; `reviewing` may become `repairing`,
`accepted`, `blocked`, or `failed`; a completed repair returns to `running`; and
`blocked` may resume at its prior state. Authorization meanings belong to
`policies/delivery.md`; this contract records resulting action status.
