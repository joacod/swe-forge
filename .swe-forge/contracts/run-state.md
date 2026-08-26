# Run-State Contract

Run state is temporary recovery state, not a transcript, task specification, or
second source of truth. Keep it outside the repository or under an already
ignored `.swe-forge/runs/` path. Never store credentials, private ticket
content, or worker transcripts.

Only the current schema is supported. Older, future, malformed, or unknown
state is stale and must be rejected; it is never migrated or normalized. State
producers, readers, validators, adapters, and fixtures change together with
the schema.

## Machine surface

Adapters use the dependency-free semantic ports rather than parsing YAML:

```text
swe-forge-state inspect --state FILE|DIRECTORY --checkout PATH
swe-forge-state resolve-active --checkout PATH \
  [--candidate FILE|DIRECTORY ...] [--all]
```

They validate identity, checkout ownership, lifecycle, routing, continuation,
validation, review, delivery, and active-state ordering. Terminal, inactive,
stale, obsolete, unsupported, and wrong-checkout snapshots are not active
candidates.

## Schema v5

The durable snapshot contains only facts needed to resume or protect the
candidate:

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

tasks:                         # present only when delegated task recovery needs it
  <task_id>:
    status: pending | ready | running | blocked | done | failed | skipped
    dependencies: []
    accepted_result_ref: <reference or none>
```

`tasks` is optional. SOLO runs omit it; a SUBAGENTS run may retain only the
small task facts needed to recover delegated work. Task contracts, worker
briefs, results, and transcripts remain separate root-owned artifacts.

## Ownership and updates

`run_id` is both the run fence and the durable ticket/run identity; raw ticket
content remains host-owned and is not copied into recovery state.
`delivery_mode` is the normalized delivery intent.
`routing.preferred`, `routing.current`, `routing.reason`, and
`routing.fallback` are the only durable routing facts; invocation syntax never
supplies a topology override. A preferred `SUBAGENTS` choice may therefore
fall back to effective `SOLO` without changing the recorded preference.

`checkout` is the sole canonical candidate. Initialization records the
canonical path, branch, base, and actual starting `HEAD`. The checkout identity
is not changed by a later mutation command; only its recorded `head_sha` may
advance from an actual candidate observation. A host-private worker path is not
state, and no second workspace, worker branch, or transfer record is added.

`continuation` is the authoritative compact recovery block. Its timestamp is
used for active-state ordering. It contains no copy of delivery mode or other
workflow projections. A resumed run first inspects actual Git and the
validation/review evidence, then resumes only from the recorded next action.
Conversation summaries and adapter reminders are recovery aids, not authority.

The validation ledger remains the detailed evidence record. The small
`validation` record identifies its relevant candidate and current aggregate
result; it does not replace the ledger. Review records the exact candidate that
was reviewed and whether the one permitted focused repair was used. A repaired
candidate is not independently re-reviewed. Delivery records only the compact
PR completion facts needed to avoid losing the delivery boundary.

Use the purpose-specific helpers—`set-routing`, `set-continuation`,
`set-delivery-checkout`, `set-validation`, `set-review`,
`set-review-repair`, and `set-pull-request`—instead of hand-editing state.
Every mutation is serialized per state, validates a temporary result, and
atomically replaces the snapshot. The checkout path, branch, and base are
initialization facts, not mutable authorization supplied by a later command.

Only a `done` dependency with an accepted result may supply a dependent digest.
Writable delegated results are materialized and validated in the canonical
candidate before sequential acceptance. Dirty, conflicting, stale, or
ambiguous checkout state is preserved and reported; cleanup cannot claim
unproven removal.

## Active-state protection

A state is an active candidate only when all of the following hold:

- it validates as schema v5 and contains no unknown or removed fields;
- `continuation.workflow_active` is `true`;
- its canonical `checkout.path` matches the requested checkout and, when the
  checkout is a Git repository, its recorded branch and `HEAD` still match and
  its base remains an ancestor;
- its continuation timestamp and file modification time are usable; and
- its lifecycle status is non-terminal.

`resolve-active` orders eligible candidates by continuation timestamp, then
file mtime, then canonical state path; candidates sharing a `run_id` are
ambiguous and are omitted. Adapters still apply their fresh invocation fence
before adopting a discovered run. A stale, terminal, wrong-checkout, or
obsolete run cannot authorize delegation or continuation.

## Lifecycle

`planning` may become `running`, `blocked`, or `failed`; `running` may become
`reviewing`, `blocked`, or `failed`; `reviewing` may become `repairing`,
`accepted`, `blocked`, or `failed`; a completed repair returns to `running`; and
`blocked` may resume at its prior state. Delivery completion makes continuation
inactive after the PR URL is recorded.

Authorization meanings belong to `policies/delivery.md`; this contract records
only the resulting delivery status. Host scheduling, context preservation,
compaction, retries, and restoration remain host/runtime responsibilities.
