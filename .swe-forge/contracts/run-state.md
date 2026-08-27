# Run-State Contract

Run state is temporary recovery state, not a transcript, task spec, or second
source of truth. Keep it outside the repository or under ignored
`.swe-forge/runs/`. Never store credentials, private ticket content, or worker
transcripts.

Only schema v5 is supported. Reject older, future, malformed, or unknown state;
never migrate or normalize it. Change producers, readers, validators, adapters,
and fixtures together.

## Machine surface

Adapters use the canonical semantic ports, not YAML parsing:

```text
swe-forge-state inspect --state FILE|DIRECTORY --checkout PATH
swe-forge-state resolve-active --checkout PATH \
  [--candidate FILE|DIRECTORY ...] [--all]
```

They validate identity, checkout ownership, lifecycle, routing, continuation,
validation, review, delivery, and active-state ordering. Terminal, inactive,
stale, obsolete, unsupported, and wrong-checkout snapshots are not active.

## Schema v5

The snapshot contains only facts needed to resume or protect the candidate:

```yaml
workflow: swe-forge
workflow_version: 1
schema_version: 5
run_id: <unique run identity>
status: planning | running | blocked | reviewing | repairing | accepted | failed
delivery_mode: GUIDED | PR

routing:
  preferred: SOLO | SUBAGENTS
  current: SOLO | SUBAGENTS
  reason: <concise routing decision reason>
  fallback: no | <concise fallback fact>

checkout:
  path: <absolute canonical writable delivery checkout>
  branch: <delivery branch>
  base_sha: <ticket base SHA>
  head_sha: <current or final Git HEAD>

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

validation:
  head_sha: <validated candidate SHA or none>
  status: pending | passed | failed
  reference: <validation ledger or concise result reference>

review:
  status: pending | pass | changes-required | repaired | skipped
  reviewed_head: <reviewed candidate SHA or none>
  repair_used: true | false
  blocked_by: [] | [<finding IDs>]

delivery:
  status: not-applicable | pending | complete | blocked
  pull_request_ref: <URL or none>
  pr_number: <number or none>
  pr_state: DRAFT | OPEN | MERGED | CLOSED | none

tasks:                         # only when delegated recovery needs it
  <task_id>:
    status: pending | ready | running | blocked | done | failed | skipped
    dependencies: []
    accepted_result_ref: <reference or none>
```

`tasks` is optional: omit it for `SOLO`; retain only recovery facts for
`SUBAGENTS`. Task contracts, briefs, results, and transcripts remain separate
root-owned artifacts.

## Ownership and updates

`run_id` is the run fence and durable ticket/run identity. Raw ticket content is
host-owned, not copied into state. `delivery_mode` is normalized intent.
Routing contains only `preferred`, `current`, `reason`, and `fallback`; syntax
never supplies a topology override. A preferred `SUBAGENTS` choice may fall
back to effective `SOLO`.

`checkout` is the sole canonical candidate. Initialization records path, branch,
base, and actual starting `HEAD`; later commands may advance only `head_sha`
after observing a real candidate. A host-private path is not state. No second
workspace, worker branch, or transfer record exists.

`continuation` is the compact recovery authority. Its timestamp orders active
state and it contains no delivery-mode copy or other workflow projection. On
resume, inspect actual Git and validation/review evidence, then use only its
`next_action`. Conversation summaries and adapter reminders are non-authority.

The validation ledger is detailed authority; the small `validation` block binds
its aggregate result to a candidate. Review records the exact reviewed candidate
and the one-repair status. Delivery stores only PR facts needed to preserve the
boundary. A repaired candidate is not independently re-reviewed.

Use `set-routing`, `set-continuation`, `set-delivery-checkout`, `set-validation`,
`set-review`, `set-review-repair`, and `set-pull-request`, not hand edits. Each
mutation serializes per state, validates a temporary result, and atomically
replaces the snapshot.
Checkout path, branch, and base are initialization facts, not later
authorization inputs.

Only a `done` dependency with an accepted result supplies a dependent digest.
Materialize and validate writable results in the canonical candidate before
sequential acceptance. Preserve dirty, conflicting, stale, or ambiguous state;
cleanup cannot claim unproven removal.

## Active-state protection

A state is active only when:

- it validates as schema v5 with no unknown or removed fields;
- `continuation.workflow_active` is `true`;
- `checkout.path` matches the requested checkout and, for a Git checkout, its
  branch and `HEAD` match while its base remains an ancestor;
- continuation timestamp and file mtime are usable; and
- lifecycle status is non-terminal.

`resolve-active` orders eligible candidates by continuation timestamp, file mtime,
then canonical state path. Candidates sharing a `run_id` are ambiguous and
omitted. Adapters still apply a fresh invocation fence before adoption. Stale,
terminal, wrong-checkout, and obsolete state cannot authorize continuation or
delegation.

## Lifecycle

`planning` may become `running`, `blocked`, or `failed`; `running` may become
`reviewing`, `blocked`, or `failed`; `reviewing` may become `repairing`,
`accepted`, `blocked`, or `failed`; a completed repair returns to `running`; and
`blocked` may resume at its prior state. Delivery completion makes continuation
inactive after recording the PR URL.

Authorization meanings belong to `policies/delivery.md`; this contract records
only resulting delivery status. Host scheduling, context preservation,
compaction, retries, and restoration remain host responsibilities.
